import express from 'express';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { initTRPC, TRPCError } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOKIE_NAME = 'app_session_id';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_mude_isso';

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
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}
async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// ─── tRPC setup ──────────────────────────────────────────────────────────────
const t = initTRPC.context().create();
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar logado.' });
  return next({ ctx });
});

// ─── Context ─────────────────────────────────────────────────────────────────
async function createContext({ req, res }) {
  let user = null;
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.id) user = await getUserById(payload.id);
    }
  } catch { user = null; }
  return { req, res, user };
}

// ─── Routers ─────────────────────────────────────────────────────────────────
const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    if (!ctx.user.isActive) return null;
    return ctx.user;
  }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.password) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha incorretos' });
      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha incorretos' });
      if (!user.isActive) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sua conta está desativada' });

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
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Este email já está cadastrado' });

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
});

const clientsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.user.role === 'admin' ? null : ctx.user.id;
      const [rows] = userId
        ? await pool.query('SELECT * FROM clients WHERE userId = ? ORDER BY id DESC LIMIT 100', [userId])
        : await pool.query('SELECT * FROM clients ORDER BY id DESC LIMIT 100');
      return rows;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await pool.query(
        'INSERT INTO clients (userId, name, email, phone, company, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,NOW(),NOW())',
        [ctx.user.id, input.name, input.email || null, input.phone || null, input.company || null, input.status || 'lead']
      );
      const [rows] = await pool.query('SELECT * FROM clients WHERE id = ? LIMIT 1', [result.insertId]);
      return rows[0];
    }),
});

const appRouter = router({ auth: authRouter, clients: clientsRouter });

// ─── Express App ─────────────────────────────────────────────────────────────
export function createApiServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'no-cache');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // tRPC
  app.use('/api/trpc', createExpressMiddleware({ router: appRouter, createContext }));

  // Health check
  app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Global error handler → always JSON
  app.use((err, req, res, _next) => {
    console.error('[API] Erro:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// ─── Start Server ─────────────────────────────────────────────────────────────
export function startApiServer() {
  const app = createApiServer();
  const PORT = parseInt(process.env.PORT || '26653');

  // HTTPS se houver certificados
  const certPath = path.join(__dirname, 'certs', 'cert.pem');
  const keyPath = path.join(__dirname, 'certs', 'key.pem');
  const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

  const server = useHttps
    ? createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
    : createHttpServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    const proto = useHttps ? 'https' : 'http';
    console.log(`[API Server] 🚀 ${proto.toUpperCase()} ouvindo na porta ${PORT}`);
    if (!useHttps) console.log('[API Server] ⚠️  HTTP mode — para HTTPS gere certs/ com openssl ou via cog ssl_setup');
  });

  server.on('error', (err) => console.error('[API Server] ❌ Erro:', err.message));
}
