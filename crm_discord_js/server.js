import express from 'express';
import { createServer as createHttpsServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { initTRPC, TRPCError } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendPasswordResetEmail } from './emailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Garante que a tabela passwordResets exista
async function ensureDbTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`passwordResets\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(320) NOT NULL,
        \`code\` VARCHAR(6) NOT NULL,
        \`expiresAt\` DATETIME NOT NULL,
        \`used\` TINYINT(1) DEFAULT 0 NOT NULL,
        \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX \`idx_passwordResets_email_code\` (\`email\`, \`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[DB] ✅ Tabela passwordResets verificada/criada com sucesso.');
  } catch (err) {
    console.warn('[DB] ⚠️ Erro ao verificar tabela passwordResets:', err.message);
  }
}
ensureDbTables();

const COOKIE_NAME = 'app_session_id';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mude_isso_no_env';

// ─── JWT helpers ─────────────────────────────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function getTokenFromRequest(req) {
  const cookieHeader = req.headers['cookie'] || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
function getCookieOptions(req) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return { httpOnly: true, path: '/', sameSite: isHttps ? 'none' : 'lax', secure: isHttps };
}

// ─── DB helpers ──────────────────────────────────────────────────────────────
async function getUserByEmail(email) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  } catch (e) {
    console.error('[DB] getUserByEmail error:', e.message);
    return null;
  }
}
async function getUserById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  } catch (e) {
    console.error('[DB] getUserById error:', e.message);
    return null;
  }
}

// ─── tRPC setup with superjson transformer ────────────────────────────────────
const t = initTRPC.context().create({
  transformer: superjson,
});
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user && !ctx.attendant) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar logado.' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, attendant: ctx.attendant } });
});
const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito para administradores.' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ─── Context ─────────────────────────────────────────────────────────────────
async function createContext({ req, res }) {
  let user = null;
  let attendant = null;

  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.id) {
        user = await getUserById(payload.id);
      }
    }
  } catch {
    user = null;
  }

  // Attendant authorization header fallback
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-attendant-token'];
    if (authHeader && typeof authHeader === 'string') {
      const attToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (attToken) {
        const [rows] = await pool.query('SELECT * FROM attendants WHERE sessionToken = ? AND isActive = 1 LIMIT 1', [attToken]);
        if (rows[0]) attendant = rows[0];
      }
    }
  } catch {
    attendant = null;
  }

  return { req, res, user, attendant };
}

// ─── Routers ─────────────────────────────────────────────────────────────────
const systemRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
  notifyOwner: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    if (ctx.user) {
      if (!ctx.user.isActive) return null;
      return ctx.user;
    }
    if (ctx.attendant) {
      if (!ctx.attendant.isActive) return null;
      return {
        id: ctx.attendant.id,
        openId: `attendant-${ctx.attendant.id}`,
        name: ctx.attendant.name,
        email: ctx.attendant.email,
        role: 'attendant',
        companyId: ctx.attendant.companyId,
        isActive: ctx.attendant.isActive,
        phone: ctx.attendant.phone,
        position: ctx.attendant.position,
        createdAt: ctx.attendant.createdAt,
        updatedAt: ctx.attendant.updatedAt,
      };
    }
    return null;
  }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
      twoFactorCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.password) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha incorretos' });
      }
      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha incorretos' });
      }
      if (!user.isActive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sua conta está desativada' });
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });
      const opts = getCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
      return { success: true, user };
    }),

  register: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Este email já está cadastrado' });
      }

      const hashed = await bcrypt.hash(input.password, 10);
      const openId = `local-${Date.now()}`;
      await pool.query(
        'INSERT INTO users (openId, name, email, password, phone, role, isActive, companyName, maxAttendants, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())',
        [openId, input.name, input.email, hashed, input.phone || null, 'user', 1, input.name, 5]
      );
      const user = await getUserByEmail(input.email);
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      const opts = getCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...opts, maxAge: ONE_YEAR_MS });
      return { success: true, user };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const opts = getCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, opts);
    return { success: true };
  }),

  updatePreferences: protectedProcedure
    .input(z.object({ preferences: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user) {
        await pool.query('UPDATE users SET preferences = ? WHERE id = ?', [input.preferences, ctx.user.id]);
      }
      return { success: true };
    }),

  setup2FA: protectedProcedure.mutation(() => ({ secret: 'SAMPLE2FA', qrCode: '' })),
  enable2FA: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  disable2FA: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),

  // ── Esqueci a Senha ──
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        // Por segurança, retorna success mesmo que o e-mail não exista para não expor usuários
        return { success: true };
      }

      // Gera código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        // Invalida códigos anteriores não utilizados
        await pool.query(
          'UPDATE passwordResets SET used = 1 WHERE email = ? AND used = 0',
          [user.email]
        );

        // Insere novo código válido por 15 minutos
        await pool.query(
          'INSERT INTO passwordResets (email, code, expiresAt, used, createdAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, NOW())',
          [user.email, code]
        );
      } catch (dbErr) {
        console.error('[Auth] Erro ao salvar código no banco:', dbErr.message);
      }

      // Envia o e-mail
      const res = await sendPasswordResetEmail(user.email, code);
      return { success: true, simulated: res.simulated, message: res.message };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      code: z.string().length(6),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      // Busca código válido e não expirado
      const [rows] = await pool.query(
        'SELECT * FROM passwordResets WHERE email = ? AND code = ? AND used = 0 AND expiresAt >= NOW() ORDER BY id DESC LIMIT 1',
        [input.email, input.code]
      );

      const resetRecord = rows[0];
      if (!resetRecord) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Código inválido ou expirado (expira em 15 minutos). Solicite um novo código.',
        });
      }

      // Atualiza senha com hash
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await pool.query(
        'UPDATE users SET password = ?, updatedAt = NOW() WHERE email = ?',
        [hashedPassword, input.email]
      );

      // Marca código como utilizado
      await pool.query('UPDATE passwordResets SET used = 1 WHERE id = ?', [resetRecord.id]);

      return { success: true };
    }),
});

const clientsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = (ctx.user && ctx.user.role === 'admin') ? null : (ctx.user?.id || ctx.attendant?.companyId || 1);
      const [rows] = userId
        ? await pool.query('SELECT * FROM clients WHERE userId = ? ORDER BY id DESC LIMIT 200', [userId])
        : await pool.query('SELECT * FROM clients ORDER BY id DESC LIMIT 200');
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [input.id]);
      return rows[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id || ctx.attendant?.companyId || 1;
      const [result] = await pool.query(
        'INSERT INTO clients (userId, name, email, phone, company, status, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,NOW(),NOW())',
        [userId, input.name, input.email || null, input.phone || null, input.company || null, input.status || 'lead', input.notes || null]
      );
      const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [result.insertId]);
      return rows[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const keys = Object.keys(fields).filter(k => fields[k] !== undefined);
      if (keys.length > 0) {
        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const values = keys.map(k => fields[k]);
        await pool.query(`UPDATE clients SET ${setClause}, updatedAt = NOW() WHERE id = ?`, [...values, id]);
      }
      const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [id]);
      return rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await pool.query('DELETE FROM clients WHERE id = ?', [input.id]);
      return { success: true };
    }),
});

const opportunitiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx.user && ctx.user.role === 'admin') ? null : (ctx.user?.id || ctx.attendant?.companyId || 1);
    const [rows] = userId
      ? await pool.query('SELECT * FROM opportunities WHERE userId = ? ORDER BY id DESC LIMIT 200', [userId])
      : await pool.query('SELECT * FROM opportunities ORDER BY id DESC LIMIT 200');
    return rows;
  }),
  create: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  update: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  delete: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ completed: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user && ctx.user.role === 'admin') ? null : (ctx.user?.id || ctx.attendant?.companyId || 1);
      let query = 'SELECT * FROM tasks';
      const params = [];
      const conditions = [];
      if (userId) { conditions.push('userId = ?'); params.push(userId); }
      if (input?.completed !== undefined) { conditions.push('completed = ?'); params.push(input.completed ? 1 : 0); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY id DESC LIMIT 200';
      const [rows] = await pool.query(query, params);
      return rows;
    }),
  create: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  update: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  delete: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const interactionsRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user && ctx.user.role === 'admin') ? null : (ctx.user?.id || ctx.attendant?.companyId || 1);
      let query = 'SELECT * FROM interactions';
      const params = [];
      const conditions = [];
      if (userId) { conditions.push('userId = ?'); params.push(userId); }
      if (input?.clientId) { conditions.push('clientId = ?'); params.push(input.clientId); }
      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY id DESC LIMIT 200';
      const [rows] = await pool.query(query, params);
      return rows;
    }),
  create: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const whatsappRouter = router({
  listChats: protectedProcedure.query(async () => []),
  listMessages: protectedProcedure.input(z.any()).query(async () => []),
  listQuickReplies: protectedProcedure.query(async () => []),
  listTemplates: protectedProcedure.query(async () => []),
  saveQuickReplies: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  saveTemplates: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  sendMessage: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  generateAIDraft: protectedProcedure.input(z.any()).mutation(() => ({ text: '' })),
  transferChat: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  simulateIncoming: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  updateStatus: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
  sendTemplate: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const attendantsRouter = router({
  listAll: protectedProcedure.query(async () => []),
  list: protectedProcedure.query(async () => []),
});

const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    try {
      const [[{ total: clients }]] = await pool.query('SELECT COUNT(*) AS total FROM clients');
      const [[{ total: opportunities }]] = await pool.query('SELECT COUNT(*) AS total FROM opportunities');
      const [[{ total: interactions }]] = await pool.query('SELECT COUNT(*) AS total FROM interactions');
      return { clients, opportunities, interactions, totalRevenue: 0 };
    } catch {
      return { clients: 0, opportunities: 0, interactions: 0, totalRevenue: 0 };
    }
  }),
  opportunitiesByStage: protectedProcedure.query(async () => []),
});

const reportsRouter = router({
  flowExecutionStats: protectedProcedure.input(z.any()).query(async () => []),
  flowResponseCount: protectedProcedure.input(z.any()).query(async () => 0),
  averageResponseTime: protectedProcedure.input(z.any()).query(async () => 0),
  topFlows: protectedProcedure.input(z.any()).query(async () => []),
  teamRanking: protectedProcedure.query(async () => []),
});

const flowsRouter = router({
  list: protectedProcedure.query(async () => []),
});

const labelsRouter = router({
  list: protectedProcedure.query(async () => []),
});

const mediaFilesRouter = router({
  list: protectedProcedure.query(async () => []),
  create: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const mediaDocumentsRouter = router({
  list: protectedProcedure.query(async () => []),
  create: protectedProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const mediaAudiosRouter = router({
  list: protectedProcedure.query(async () => []),
});

const mediaTextsRouter = router({
  list: protectedProcedure.query(async () => []),
});

const countersRouter = router({
  get: protectedProcedure.query(async () => ({})),
});

const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    const [rows] = await pool.query('SELECT id, name, email, role, isActive, companyName, createdAt FROM users');
    return rows;
  }),
  toggleUserActive: adminProcedure.input(z.any()).mutation(() => ({ success: true })),
  updateUserRole: adminProcedure.input(z.any()).mutation(() => ({ success: true })),
  createUser: adminProcedure.input(z.any()).mutation(() => ({ success: true })),
});

const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  admin: adminRouter,
  attendants: attendantsRouter,
  clients: clientsRouter,
  opportunities: opportunitiesRouter,
  tasks: tasksRouter,
  interactions: interactionsRouter,
  whatsapp: whatsappRouter,
  dashboard: dashboardRouter,
  reports: reportsRouter,
  flows: flowsRouter,
  labels: labelsRouter,
  mediaFiles: mediaFilesRouter,
  mediaDocuments: mediaDocumentsRouter,
  mediaAudios: mediaAudiosRouter,
  mediaTexts: mediaTextsRouter,
  counters: countersRouter,
});

// ─── Express App ─────────────────────────────────────────────────────────────
export function createApiServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS & Security Headers
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // tRPC Express Middleware
  app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));

  // Health check
  app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Fallback error handler -> always return JSON
  app.use((err, req, res, _next) => {
    console.error('[API Error]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// ─── Start Server ─────────────────────────────────────────────────────────────
export function startApiServer() {
  const app = createApiServer();
  const PORT = parseInt(process.env.PORT || '26653');

  const certPath = path.join(__dirname, 'certs', 'cert.pem');
  const keyPath = path.join(__dirname, 'certs', 'key.pem');
  const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

  const server = useHttps
    ? createHttpsServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
    : createHttpServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    const proto = useHttps ? 'HTTPS' : 'HTTP';
    console.log(`[API Server] 🚀 ${proto} ouvindo na porta ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[API Server] ❌ Erro ao iniciar servidor:', err.message);
  });
}
