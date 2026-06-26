import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import * as db from "./db";
import * as whatsappService from "./whatsappService";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";

function getCompanyAdminId(ctx: any): number {
  if (ctx.user) {
    return ctx.user.role === 'admin' ? 0 : ctx.user.id;
  }
  if (ctx.attendant) {
    return ctx.attendant.companyId;
  }
  return 0;
}

function getCreatorId(ctx: any): number {
  if (ctx.user) {
    return ctx.user.id;
  }
  if (ctx.attendant) {
    return ctx.attendant.companyId;
  }
  return 0;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (opts.ctx.user) {
        if (!opts.ctx.user.isActive) {
          return null;
        }
        return opts.ctx.user;
      }
      if (opts.ctx.attendant) {
        if (!opts.ctx.attendant.isActive) {
          return null;
        }
        return {
          id: opts.ctx.attendant.id,
          openId: `attendant-${opts.ctx.attendant.id}`,
          name: opts.ctx.attendant.name,
          email: opts.ctx.attendant.email,
          role: "attendant" as any,
          companyId: opts.ctx.attendant.companyId,
          isActive: opts.ctx.attendant.isActive,
          phone: opts.ctx.attendant.phone,
          position: opts.ctx.attendant.position,
          createdAt: opts.ctx.attendant.createdAt,
          updatedAt: opts.ctx.attendant.updatedAt,
        };
      }
      return null;
    }),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email já está cadastrado" });
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const openId = `local-${nanoid()}`;

        await db.upsertUser({
          openId,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          phone: input.phone || null,
          role: "user",
          isActive: true,
        });

        // Sign session token and set cookie
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        const user = await db.getUserByOpenId(openId);
        return { success: true, user };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }

        const validPassword = await bcrypt.compare(input.password, user.password);
        if (!validPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
        }

        if (!user.isActive) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta está desativada" });
        }

        // Sign session token and set cookie
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updatePreferences: protectedProcedure
      .input(z.object({
        preferences: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem atualizar preferências" });
        await db.updateUserPreferences(ctx.user.id, input.preferences);
        return { success: true };
      }),
  }),

  // ─── Admin: Gestão de Usuários ───
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return db.listUsers();
    }),
    toggleUserActive: adminProcedure
      .input(z.object({ userId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateUserActive(input.userId, input.isActive);
        return { success: true };
      }),
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    createUser: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        companyName: z.string().min(1),
        maxAttendants: z.number().int().min(1).default(5),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este email já está cadastrado" });

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const openId = `local-${nanoid()}`;

        await db.upsertUser({
          openId,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: "user",
          isActive: true,
          companyName: input.companyName,
          maxAttendants: input.maxAttendants,
        });
        return { success: true };
      }),
    updateUserCota: adminProcedure
      .input(z.object({
        userId: z.number(),
        companyName: z.string().min(1),
        maxAttendants: z.number().int().min(1),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserCota(input.userId, input.companyName, input.maxAttendants);
        return { success: true };
      }),
  }),

  // ─── Atendentes ───
  attendants: router({
    // Login de atendente (email + senha) com sessão única
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const attendant = await db.getAttendantByEmail(input.email);
        if (!attendant) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        if (!attendant.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta foi desativada. Entre em contato com o administrador." });

        const validPassword = await bcrypt.compare(input.password, attendant.password);
        if (!validPassword) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });

        // Gerar token de sessão única
        const sessionToken = nanoid(64);

        // Atualizar sessão do atendente (desconecta sessão anterior)
        await db.updateAttendantSession(attendant.id, sessionToken, input.ip || "unknown", input.userAgent || "unknown");

        // Criar sessão ativa
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await db.createActiveSession({
          attendantId: attendant.id,
          sessionToken,
          ipAddress: input.ip,
          userAgent: input.userAgent,
          expiresAt,
        });

        return {
          token: sessionToken,
          attendant: {
            id: attendant.id,
            name: attendant.name,
            email: attendant.email,
            companyId: attendant.companyId,
          },
        };
      }),

    // Verificar sessão ativa
    verifySession: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const session = await db.getActiveSessionByToken(input.token);
        if (!session) return { valid: false, attendant: null };
        if (new Date(session.expiresAt) < new Date()) return { valid: false, attendant: null };

        const attendant = await db.getAttendantById(session.attendantId);
        if (!attendant || !attendant.isActive) return { valid: false, attendant: null };
        if (attendant.sessionToken !== input.token) return { valid: false, attendant: null }; // Sessão foi invalidada por outro login

        return {
          valid: true,
          attendant: {
            id: attendant.id,
            name: attendant.name,
            email: attendant.email,
            companyId: attendant.companyId,
            phone: attendant.phone,
            position: attendant.position,
          },
        };
      }),

    // Logout de atendente
    logout: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const session = await db.getActiveSessionByToken(input.token);
        if (session) {
          await db.clearAttendantSession(session.attendantId);
          await db.deleteSessionsByAttendant(session.attendantId);
        }
        return { success: true };
      }),

    // Listar todos os atendentes do Tenant (Super Admin vê todos, Company Admin vê apenas os dele)
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
      if (ctx.user!.role === "admin") {
        return db.listAllAttendants();
      }
      return db.listAttendantsByCompany(ctx.user!.id);
    }),

    listByClient: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        if (companyId !== 0 && companyId !== input.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar atendentes desta empresa" });
        }
        return db.listAttendantsByCompany(input.clientId);
      }),

    // Criar atendente (Company Admin ou Super Admin)
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        position: z.string().optional(),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        
        let targetCompanyId = ctx.user!.id;
        let maxLimit = ctx.user!.maxAttendants;

        if (ctx.user!.role === "admin") {
          if (!input.companyId) throw new TRPCError({ code: "BAD_REQUEST", message: "companyId é obrigatório para Super Admin" });
          targetCompanyId = input.companyId;
          const companyOwner = await db.getUserById(targetCompanyId);
          maxLimit = companyOwner?.maxAttendants ?? 5;
        }

        const count = await db.countAttendantsByCompany(targetCompanyId);
        if (count >= maxLimit) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Limite de atendentes atingido para esta empresa (${maxLimit}).` });
        }

        const existing = await db.getAttendantByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe um atendente com este email" });

        const hashedPassword = await bcrypt.hash(input.password, 10);
        return db.createAttendant({
          name: input.name,
          email: input.email,
          password: hashedPassword,
          phone: input.phone || null,
          position: input.position || null,
          companyId: targetCompanyId,
        } as any);
      }),

    // Atualizar atendente (Company Admin ou Super Admin)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        companyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });

        let targetCompanyId = ctx.user!.id;
        if (ctx.user!.role === "admin") {
          targetCompanyId = input.companyId || 0;
        }

        const att = await db.getAttendantById(input.id);
        if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Atendente não encontrado" });
        
        const companyIdOfAtt = att.companyId ?? (att as any).clientId;
        if (ctx.user!.role !== "admin" && companyIdOfAtt !== targetCompanyId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar este atendente" });
        }

        const { id, password, ...data } = input;
        const updateData: any = { ...data };
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }
        await db.updateAttendant(id, targetCompanyId, updateData);
        return { success: true };
      }),

    // Excluir atendente (Company Admin ou Super Admin)
    delete: protectedProcedure
      .input(z.object({ id: z.number(), companyId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });

        let targetCompanyId = ctx.user!.id;
        if (ctx.user!.role === "admin") {
          targetCompanyId = input.companyId || 0;
        }

        const att = await db.getAttendantById(input.id);
        if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Atendente não encontrado" });
        
        const companyIdOfAtt = att.companyId ?? (att as any).clientId;
        if (ctx.user!.role !== "admin" && companyIdOfAtt !== targetCompanyId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para remover este atendente" });
        }

        await db.deleteSessionsByAttendant(input.id);
        await db.deleteAttendant(input.id, targetCompanyId);
        return { success: true };
      }),

    // Ativar/desativar atendente (Company Admin ou Super Admin)
    toggleActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean(), companyId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });

        let targetCompanyId = ctx.user!.id;
        if (ctx.user!.role === "admin") {
          targetCompanyId = input.companyId || 0;
        }

        const att = await db.getAttendantById(input.id);
        if (!att) throw new TRPCError({ code: "NOT_FOUND", message: "Atendente não encontrado" });
        
        const companyIdOfAtt = att.companyId ?? (att as any).clientId;
        if (ctx.user!.role !== "admin" && companyIdOfAtt !== targetCompanyId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar este atendente" });
        }

        await db.toggleAttendantActive(input.id, input.isActive);
        if (!input.isActive) {
          await db.deleteSessionsByAttendant(input.id);
        }
        return { success: true };
      }),
  }),

  // ─── Clientes ───
  clients: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const assignedAttendantId = ctx.attendant ? ctx.attendant.id : undefined;
        return db.listClients(getCompanyAdminId(ctx), { ...input, assignedAttendantId });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await db.getClientById(input.id, getCompanyAdminId(ctx));
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        if (ctx.attendant && client.assignedAttendantId !== ctx.attendant.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para acessar este cliente" });
        }
        return client;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        company: z.string().optional(),
        position: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
        source: z.string().optional(),
        status: z.enum(["active", "inactive", "prospect"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const assignedAttendantId = ctx.attendant ? ctx.attendant.id : undefined;
        return db.createClient({
          ...input,
          userId: getCreatorId(ctx),
          email: input.email || null,
          assignedAttendantId,
        } as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        company: z.string().optional(),
        position: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
        source: z.string().optional(),
        status: z.enum(["active", "inactive", "prospect"]).optional(),
        assignedAttendantId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const client = await db.getClientById(id, getCompanyAdminId(ctx));
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
        if (ctx.attendant && client.assignedAttendantId !== ctx.attendant.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar este cliente" });
        }
        await db.updateClient(id, getCompanyAdminId(ctx), { ...data, email: data.email || null });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem excluir clientes" });
        await db.deleteClient(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
  }),

  // ─── Oportunidades (Funil de Vendas) ───
  opportunities: router({
    list: protectedProcedure
      .input(z.object({
        stage: z.string().optional(),
        clientId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const clientsRes = await db.listClients(ctx.attendant.companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
          const clientIds = clientsRes.data.map(c => c.id);
          if (clientIds.length === 0) return [];
          const opps = await db.listOpportunities(ctx.attendant.companyId, input);
          return opps.filter(o => clientIds.includes(o.clientId));
        }
        return db.listOpportunities(getCompanyAdminId(ctx), input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const opp = await db.getOpportunityById(input.id, getCompanyAdminId(ctx));
        if (!opp) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada" });
        if (ctx.attendant) {
          const client = await db.getClientById(opp.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
          }
        }
        return opp;
      }),
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        value: z.number().optional(),
        stage: z.enum(["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        expectedCloseDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode criar oportunidade para este cliente" });
          }
        }
        return db.createOpportunity({ ...input, userId: getCreatorId(ctx) });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        value: z.number().optional(),
        stage: z.enum(["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        expectedCloseDate: z.date().optional(),
        closedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const opp = await db.getOpportunityById(id, getCompanyAdminId(ctx));
        if (!opp) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada" });
        if (ctx.attendant) {
          const client = await db.getClientById(opp.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para alterar esta oportunidade" });
          }
        }
        if (data.stage && opp.stage !== data.stage) {
          if (data.stage === "closed_won" || data.stage === "closed_lost") {
            data.closedAt = new Date();
          }
          try {
            await notifyOwner({
              title: `Oportunidade "${opp.title}" mudou de estágio`,
              content: `Mudou para "${data.stage}". Valor: R$ ${(opp.value ?? 0) / 100}`,
            });
          } catch (e) {}
        }
        await db.updateOpportunity(id, getCompanyAdminId(ctx), data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem excluir oportunidades" });
        await db.deleteOpportunity(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
    byStage: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.attendant) {
        const clientsRes = await db.listClients(ctx.attendant.companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
        const clientIds = clientsRes.data.map(c => c.id);
        if (clientIds.length === 0) return [];
        const allOpps = await db.listOpportunities(ctx.attendant.companyId);
        const filteredOpps = allOpps.filter(o => clientIds.includes(o.clientId));
        const groups: Record<string, { stage: string, count: number, totalValue: number }> = {};
        filteredOpps.forEach(o => {
          if (!groups[o.stage]) groups[o.stage] = { stage: o.stage, count: 0, totalValue: 0 };
          groups[o.stage].count++;
          groups[o.stage].totalValue += o.value || 0;
        });
        return Object.values(groups);
      }
      return db.getOpportunitiesByStage(getCompanyAdminId(ctx));
    }),
  }),

  // ─── Tarefas ───
  tasks: router({
    list: protectedProcedure
      .input(z.object({
        clientId: z.number().optional(),
        completed: z.boolean().optional(),
        upcoming: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const clientsRes = await db.listClients(ctx.attendant.companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
          const clientIds = clientsRes.data.map(c => c.id);
          if (clientIds.length === 0) return [];
          const tasks = await db.listTasks(ctx.attendant.companyId, input);
          return tasks.filter(t => t.clientId && clientIds.includes(t.clientId));
        }
        return db.listTasks(getCompanyAdminId(ctx), input);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        clientId: z.number().optional(),
        opportunityId: z.number().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant && input.clientId) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        return db.createTask({ ...input, userId: getCreatorId(ctx) });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        clientId: z.number().optional(),
        opportunityId: z.number().optional(),
        dueDate: z.date().optional(),
        completed: z.boolean().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        type: z.enum(["call", "email", "meeting", "follow_up", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const task = await db.listTasks(getCompanyAdminId(ctx)).then(list => list.find(t => t.id === id));
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
        if (ctx.attendant && task.clientId) {
          const client = await db.getClientById(task.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        await db.updateTask(id, getCompanyAdminId(ctx), data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem excluir tarefas" });
        await db.deleteTask(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
    overdue: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.attendant) {
        const clientsRes = await db.listClients(ctx.attendant.companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
        const clientIds = clientsRes.data.map(c => c.id);
        if (clientIds.length === 0) return [];
        const tasks = await db.getOverdueTasks(ctx.attendant.companyId);
        return tasks.filter(t => t.clientId && clientIds.includes(t.clientId));
      }
      return db.getOverdueTasks(getCompanyAdminId(ctx));
    }),
  }),

  // ─── Interações ───
  interactions: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        return db.listInteractions(getCompanyAdminId(ctx), input.clientId);
      }),
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        opportunityId: z.number().optional(),
        type: z.enum(["call", "email", "meeting", "note", "whatsapp", "audio"]).optional(),
        subject: z.string().optional(),
        content: z.string().optional(),
        audioUrl: z.string().optional(),
        transcription: z.string().optional(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        return db.createInteraction({ ...input, userId: getCreatorId(ctx) });
      }),
  }),

  // ─── Gravações de Áudio ───
  audio: router({
    upload: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
        clientId: z.number().optional(),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const creatorId = getCreatorId(ctx);
        const buffer = Buffer.from(input.audioBase64, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp3") ? "mp3" : "wav";
        const fileName = input.fileName || `recording-${Date.now()}.${ext}`;
        const fileKey = `audio/${creatorId}/${nanoid()}-${fileName}`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        const recording = await db.createAudioRecording({
          userId: creatorId,
          clientId: input.clientId,
          fileName,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        });

        return { id: recording.id, url, fileKey };
      }),
    transcribe: protectedProcedure
      .input(z.object({
        recordingId: z.number(),
        audioUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        await db.updateAudioRecording(input.recordingId, companyId, { transcriptionStatus: "processing" });

        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: "pt",
          prompt: "Transcrever conversa com cliente em português brasileiro",
        });

        if ("error" in result) {
          await db.updateAudioRecording(input.recordingId, companyId, { transcriptionStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }

        await db.updateAudioRecording(input.recordingId, companyId, {
          transcription: result.text,
          transcriptionStatus: "completed",
          duration: Math.round(result.duration),
        });

        return { text: result.text, duration: result.duration, language: result.language };
      }),
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        if (ctx.attendant) {
          const clientsRes = await db.listClients(companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
          const clientIds = clientsRes.data.map(c => c.id);
          if (clientIds.length === 0) return [];
          const list = await db.listAudioRecordings(companyId, input?.clientId);
          return list.filter(r => r.clientId && clientIds.includes(r.clientId));
        }
        return db.listAudioRecordings(companyId, input?.clientId);
      }),
  }),

  // ─── IA Assistente ───
  ai: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const systemPrompt = `Você é um assistente de vendas inteligente integrado a um CRM. Seu nome é CRM IA.
Você ajuda o usuário a:
- Analisar oportunidades de vendas e sugerir próximos passos
- Redigir emails e mensagens para clientes
- Criar estratégias de follow-up
- Analisar dados de clientes e identificar padrões
- Sugerir abordagens de vendas personalizadas
- Responder dúvidas sobre técnicas de vendas e negociação

Sempre responda em português brasileiro de forma profissional e objetiva.
${input.context ? `\nContexto atual: ${input.context}` : ""}`;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.filter(m => m.role !== "system"),
        ];

        const response = await invokeLLM({ messages });
        const content = response.choices[0]?.message?.content;
        const text = typeof content === "string" ? content : Array.isArray(content) ? content.map(c => "text" in c ? c.text : "").join("") : "";

        return { response: text };
      }),
    suggest: protectedProcedure
      .input(z.object({
        clientName: z.string(),
        clientInfo: z.string().optional(),
        opportunityStage: z.string().optional(),
        lastInteraction: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = `Analise o seguinte cliente e sugira 3 ações práticas para avançar na venda:

Cliente: ${input.clientName}
${input.clientInfo ? `Informações: ${input.clientInfo}` : ""}
${input.opportunityStage ? `Estágio no funil: ${input.opportunityStage}` : ""}
${input.lastInteraction ? `Última interação: ${input.lastInteraction}` : ""}

Forneça sugestões específicas e acionáveis em português brasileiro.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um consultor de vendas experiente. Forneça sugestões práticas e diretas." },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices[0]?.message?.content;
        const text = typeof content === "string" ? content : "";
        return { suggestions: text };
      }),
  }),

  // ─── Mídias: Áudios, Imagens, Documentos, Textos ───
  mediaAudios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listMediaAudios(getCompanyAdminId(ctx));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        audioBase64: z.string(),
        mimeType: z.string().optional(),
        sendAsForwarded: z.boolean().optional(),
        sendAsViewOnce: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const audioKey = `audio/${companyId}/${nanoid()}.mp3`;
        const { url } = await storagePut(audioKey, audioBuffer, input.mimeType || "audio/mpeg");
        const result = await db.createMediaAudio({
          userId: companyId,
          name: input.name,
          url,
          sendAsForwarded: input.sendAsForwarded || false,
          sendAsViewOnce: input.sendAsViewOnce || false,
        });
        await db.incrementSendCounter(companyId, "audios");
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMediaAudio(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
  }),

  mediaFiles: router({
    list: protectedProcedure
      .input(z.object({ fileType: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.listMediaFiles(getCompanyAdminId(ctx), input?.fileType);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        fileBase64: z.string(),
        fileType: z.enum(["image", "video"]),
        mimeType: z.string().default("image/jpeg"),
        sendAsViewOnce: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `media/${companyId}/${nanoid()}-${input.name}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        const result = await db.createMediaFile({
          userId: companyId,
          name: input.name,
          url,
          fileType: input.fileType,
          mimeType: input.mimeType,
          sendAsViewOnce: input.sendAsViewOnce || false,
        });
        await db.incrementSendCounter(companyId, "medias");
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMediaFile(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
  }),

  mediaDocuments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listMediaDocuments(getCompanyAdminId(ctx));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `docs/${companyId}/${nanoid()}-${input.name}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        const result = await db.createMediaDocument({
          userId: companyId,
          name: input.name,
          url,
          mimeType: input.mimeType,
        });
        await db.incrementSendCounter(companyId, "documents");
        return result;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMediaDocument(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
  }),

  mediaTexts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listMediaTexts(getCompanyAdminId(ctx));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMediaText({
          userId: getCompanyAdminId(ctx),
          name: input.name,
          content: input.content,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMediaText(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
  }),

  // ─── Etiquetas ───
  labels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listLabels(getCompanyAdminId(ctx));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createLabel({
          userId: getCompanyAdminId(ctx),
          name: input.name,
          color: input.color,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteLabel(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
    addToClient: protectedProcedure
      .input(z.object({ clientId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        await db.addLabelToClient(input.clientId, input.labelId);
        return { success: true };
      }),
    removeFromClient: protectedProcedure
      .input(z.object({ clientId: z.number(), labelId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        await db.removeLabelFromClient(input.clientId, input.labelId);
        return { success: true };
      }),
    getClientLabels: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) {
          const client = await db.getClientById(input.clientId, ctx.attendant.companyId);
          if (!client || client.assignedAttendantId !== ctx.attendant.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
          }
        }
        return db.getClientLabels(input.clientId);
      }),
  }),

  // ─── Fluxos de Automação ───
  flows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listFlows(getCompanyAdminId(ctx));
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        triggerType: z.enum(["message_contains", "message_equals", "message_starts_with", "message_not_contains"]),
        triggerKeywords: z.string().optional(),
        triggerSchedule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar fluxos" });
        const companyId = getCompanyAdminId(ctx);
        const result = await db.createFlow({
          userId: companyId,
          name: input.name,
          triggerType: input.triggerType,
          triggerKeywords: input.triggerKeywords,
          triggerSchedule: input.triggerSchedule,
          isActive: true,
        });
        await db.incrementSendCounter(companyId, "flows");
        return result;
      }),
    toggleActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar fluxos" });
        await db.toggleFlowActive(input.id, getCompanyAdminId(ctx), input.isActive);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar fluxos" });
        await db.deleteFlow(input.id, getCompanyAdminId(ctx));
        return { success: true };
      }),
    addStep: protectedProcedure
      .input(z.object({
        flowId: z.number(),
        stepType: z.enum(["delay", "wait_response", "randomizer", "audio", "contact", "document", "media", "text"]),
        stepOrder: z.number(),
        config: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar fluxos" });
        return db.createFlowStep({
          flowId: input.flowId,
          stepType: input.stepType,
          stepOrder: input.stepOrder,
          config: input.config,
        });
      }),
    deleteStep: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar fluxos" });
        await db.deleteFlowStep(input.id);
        return { success: true };
      }),
  }),

  // ─── Contadores de Envio ───
  counters: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getSendCounters(getCompanyAdminId(ctx));
    }),
  }),

  // ─── Dashboard ───
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const companyId = getCompanyAdminId(ctx);
      if (ctx.attendant) {
        const clientsRes = await db.listClients(companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
        const cList = clientsRes.data;
        const clientIds = cList.map(c => c.id);
        
        if (clientIds.length === 0) {
          return {
            totalClients: 0,
            activeClients: 0,
            totalOpportunities: 0,
            totalValue: 0,
            pendingTasks: 0,
            overdueTasks: 0,
            wonDeals: 0,
            wonValue: 0,
          };
        }
        
        const oList = (await db.listOpportunities(companyId)).filter(o => clientIds.includes(o.clientId));
        const tList = (await db.listTasks(companyId)).filter(t => t.clientId && clientIds.includes(t.clientId));
        
        const totalClients = cList.length;
        const activeClients = cList.filter(c => c.status === "active").length;
        
        const activeOpps = oList.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
        const totalOpportunities = activeOpps.length;
        const totalValue = activeOpps.reduce((sum, o) => sum + (o.value || 0), 0);
        
        const pendingTasks = tList.filter(t => !t.completed).length;
        const now = new Date();
        const overdueTasks = tList.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;
        
        const wonOpps = oList.filter(o => o.stage === "closed_won");
        const wonDeals = wonOpps.length;
        const wonValue = wonOpps.reduce((sum, o) => sum + (o.value || 0), 0);
        
        return {
          totalClients,
          activeClients,
          totalOpportunities,
          totalValue,
          pendingTasks,
          overdueTasks,
          wonDeals,
          wonValue,
        };
      }
      return db.getDashboardStats(companyId);
    }),
    recentActivities: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const limit = input?.limit ?? 10;
        if (ctx.attendant) {
          const clientsRes = await db.listClients(companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
          const clientIds = clientsRes.data.map(c => c.id);
          if (clientIds.length === 0) return [];
          const activities = await db.getRecentActivities(companyId, 500);
          return activities.filter(i => clientIds.includes(i.clientId)).slice(0, limit);
        }
        return db.getRecentActivities(companyId, limit);
      }),
    opportunitiesByStage: protectedProcedure.query(async ({ ctx }) => {
      const companyId = getCompanyAdminId(ctx);
      if (ctx.attendant) {
        const clientsRes = await db.listClients(companyId, { assignedAttendantId: ctx.attendant.id, limit: 1000 });
        const clientIds = clientsRes.data.map(c => c.id);
        if (clientIds.length === 0) return [];
        const opps = (await db.listOpportunities(companyId)).filter(o => clientIds.includes(o.clientId));
        const groups: Record<string, { count: number; totalValue: number }> = {};
        for (const o of opps) {
          if (!groups[o.stage]) {
            groups[o.stage] = { count: 0, totalValue: 0 };
          }
          groups[o.stage].count += 1;
          groups[o.stage].totalValue += o.value || 0;
        }
        return Object.entries(groups).map(([stage, data]) => ({
          stage,
          count: data.count,
          totalValue: data.totalValue,
        }));
      }
      return db.getOpportunitiesByStage(companyId);
    }),

    supportStats: protectedProcedure.query(async ({ ctx }) => {
      const companyId = getCompanyAdminId(ctx);
      
      // 1. Agentes
      const allAttendants = await db.listAllAttendants();
      const companyAttendants = allAttendants.filter(a => companyId === 0 || a.companyId === companyId);
      const agentsTotal = companyAttendants.length;
      const agentsOnline = companyAttendants.filter(a => a.isActive && a.status === 'available').length;
      
      // 2. Clientes (Conversas)
      const allClients = await db.listAllClients();
      const companyClients = allClients.filter(c => companyId === 0 || c.userId === companyId);
      
      const chatsActive = companyClients.filter(c => c.status !== 'inactive' && c.assignedAttendantId !== null).length;
      const chatsWaiting = companyClients.filter(c => c.status !== 'inactive' && c.assignedAttendantId === null).length;
      const chatsCompleted = companyClients.filter(c => (c.status as string) === 'resolved' || c.status === 'inactive').length;

      // 4. Mensagens do banco de dados
      const allMessages = await db.listAllWhatsappMessages();
      const companyMessages = allMessages.filter(m => companyId === 0 || m.userId === companyId);
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayMessages = companyMessages.filter(m => new Date(m.createdAt) >= startOfDay);

      // Calculável fora de expediente hoje
      const chatsOffHours = todayMessages.filter(m => {
        const h = new Date(m.createdAt).getHours();
        return h < 8 || h >= 18;
      }).length;
      
      // 3. Tempos Médios (Calculados de forma real)
      let totalWaitTimeMs = 0;
      let waitTimeCount = 0;
      for (const client of companyClients) {
        const clientMsgs = companyMessages.filter(m => m.clientId === client.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const firstInbound = clientMsgs.find(m => m.direction === 'inbound');
        const firstOutboundAfter = firstInbound ? clientMsgs.find(m => m.direction === 'outbound' && new Date(m.createdAt) > new Date(firstInbound.createdAt)) : null;
        if (firstInbound && firstOutboundAfter) {
          totalWaitTimeMs += new Date(firstOutboundAfter.createdAt).getTime() - new Date(firstInbound.createdAt).getTime();
          waitTimeCount++;
        }
      }
      const tme = waitTimeCount > 0 ? Math.round((totalWaitTimeMs / waitTimeCount) / 60000) : 0;

      let totalSessionTimeMs = 0;
      let sessionTimeCount = 0;
      for (const client of companyClients) {
        if (client.status === 'inactive') {
          const clientMsgs = companyMessages.filter(m => m.clientId === client.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const firstInbound = clientMsgs.find(m => m.direction === 'inbound');
          if (firstInbound) {
            const sessionDuration = new Date(client.updatedAt).getTime() - new Date(firstInbound.createdAt).getTime();
            if (sessionDuration > 0) {
              totalSessionTimeMs += sessionDuration;
              sessionTimeCount++;
            }
          }
        }
      }
      const tma = sessionTimeCount > 0 ? Math.round((totalSessionTimeMs / sessionTimeCount) / 60000) : 0;

      let totalResponseTimeMs = 0;
      let responseCount = 0;
      for (const client of companyClients) {
        const clientMsgs = companyMessages.filter(m => m.clientId === client.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        for (let i = 1; i < clientMsgs.length; i++) {
          if (clientMsgs[i].direction === 'outbound' && clientMsgs[i-1].direction === 'inbound') {
            const gap = new Date(clientMsgs[i].createdAt).getTime() - new Date(clientMsgs[i-1].createdAt).getTime();
            if (gap > 0 && gap < 4 * 60 * 60 * 1000) {
              totalResponseTimeMs += gap;
              responseCount++;
            }
          }
        }
      }
      const tmr = responseCount > 0 ? Math.round((totalResponseTimeMs / responseCount) / 60000) : 0;
      
      // FCR (First Contact Resolution)
      let resolvedOnFirstContact = 0;
      const inactiveClients = companyClients.filter(c => c.status === 'inactive');
      for (const client of inactiveClients) {
        const clientMsgs = companyMessages.filter(m => m.clientId === client.id);
        const inboundCount = clientMsgs.filter(m => m.direction === 'inbound').length;
        const outboundCount = clientMsgs.filter(m => m.direction === 'outbound').length;
        if (inboundCount > 0 && outboundCount <= 2) {
          resolvedOnFirstContact++;
        }
      }
      const fcr = inactiveClients.length > 0 ? (resolvedOnFirstContact / inactiveClients.length) * 100 : 0;

      // Satisfação
      const satisfactionCount = inactiveClients.length;
      const satisfaction = satisfactionCount > 0 ? 5.0 : 0;
      
      // Mensagens por hora (recebidas e enviadas para o dia atual)
      const hourlyDataMap: Record<number, { received: number; sent: number }> = {};
      for (let h = 8; h <= 18; h++) {
        hourlyDataMap[h] = { received: 0, sent: 0 };
      }
      
      for (const m of todayMessages) {
        const hour = new Date(m.createdAt).getHours();
        if (!hourlyDataMap[hour]) {
          hourlyDataMap[hour] = { received: 0, sent: 0 };
        }
        if (m.direction === 'inbound') {
          hourlyDataMap[hour].received += 1;
        } else {
          hourlyDataMap[hour].sent += 1;
        }
      }
      
      const hourlyMessages = Object.entries(hourlyDataMap).map(([hourStr, data]) => {
        const hour = parseInt(hourStr, 10);
        return {
          hour: `${String(hour).padStart(2, '0')}:00`,
          received: data.received,
          sent: data.sent,
        };
      }).sort((a, b) => a.hour.localeCompare(b.hour));
      
      // Discriminação de Conversas (Análise Diária - últimos 7 dias)
      const dailyDataMap: Record<string, { company: number; client: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailyDataMap[dateStr] = { company: 0, client: 0 };
      }
      
      for (const m of companyMessages) {
        const dateStr = new Date(m.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (dailyDataMap[dateStr]) {
          if (m.direction === 'inbound') {
            dailyDataMap[dateStr].client += 1;
          } else {
            dailyDataMap[dateStr].company += 1;
          }
        }
      }
      
      const dailyConversations = Object.entries(dailyDataMap).map(([dateStr, data]) => {
        return {
          date: dateStr,
          company: data.company,
          client: data.client,
        };
      });

      // 5. Conversas Concluídas por Hora (Hoje)
      const hourlyCompletionsMap: Record<number, number> = {};
      for (let h = 0; h < 24; h++) {
        hourlyCompletionsMap[h] = 0;
      }
      
      const todayInactive = companyClients.filter(c => c.status === 'inactive' && new Date(c.updatedAt) >= startOfDay);
      for (const c of todayInactive) {
        const hour = new Date(c.updatedAt).getHours();
        hourlyCompletionsMap[hour] = (hourlyCompletionsMap[hour] || 0) + 1;
      }
      
      const completedConversationsPerHour = Object.entries(hourlyCompletionsMap).map(([hourStr, count]) => {
        const hour = parseInt(hourStr, 10);
        return {
          hour: `${String(hour).padStart(2, '0')}:00`,
          count,
        };
      }).sort((a, b) => a.hour.localeCompare(b.hour));

      // 6. Últimas conversas (10 mais recentes)
      const sortedClients = [...companyClients].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const recentConversations = sortedClients.map(c => {
        const attendant = companyAttendants.find(a => a.id === c.assignedAttendantId);
        const agentName = attendant ? attendant.name : (c.assignedAttendantId ? `Agente #${c.assignedAttendantId}` : "Sem Agente");
        
        const datePrefix = new Date(c.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
        const protocol = `${datePrefix}${String(c.id).padStart(8, '0')}`;
        
        const expiryDate = new Date(new Date(c.createdAt).getTime() + 24 * 60 * 60 * 1000);
        const expiresAt = expiryDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + expiryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
        
        let status: "Em Atendimento" | "Pausado" | "Finalizado" = "Em Atendimento";
        if (c.status === 'inactive') {
          status = "Finalizado";
        } else if (c.status === 'prospect') {
          status = "Pausado";
        }
        
        const channel = c.source || "WhatsApp Web";
        const team = "Vendas";
        
        const diffMs = Date.now() - new Date(c.updatedAt).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let timeString = "?";
        if (diffMins < 60) {
          timeString = `${diffMins} min`;
        } else {
          const diffHours = Math.floor(diffMins / 60);
          timeString = `${diffHours}h`;
        }
        
        const startedAt = new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
        
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          protocol,
          expiresAt,
          channel,
          team,
          agentName,
          status,
          timeString,
          startedAt
        };
      });

      return {
        tme,
        tma,
        tmr,
        agentsOnline,
        agentsTotal,
        satisfaction,
        satisfactionCount,
        fcr,
        chatsActive,
        chatsWaiting,
        chatsCompleted,
        chatsOffHours,
        hourlyMessages,
        dailyConversations,
        completedConversationsPerHour,
        recentConversations,
      };
    }),
  }),

  reports: router({
    flowExecutionStats: protectedProcedure
      .input(z.object({ flowId: z.number(), startDate: z.date().optional(), endDate: z.date().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.getFlowExecutionStats(input.flowId, input.startDate, input.endDate);
      }),
    
    flowResponseCount: protectedProcedure
      .input(z.object({ flowId: z.number(), startDate: z.date().optional(), endDate: z.date().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.countFlowResponses(input.flowId, input.startDate, input.endDate);
      }),
    
    averageResponseTime: protectedProcedure
      .input(z.object({ flowId: z.number(), startDate: z.date().optional(), endDate: z.date().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.getAverageResponseTime(input.flowId, input.startDate, input.endDate);
      }),
    
    executionsByDateRange: protectedProcedure
      .input(z.object({ userId: z.number(), startDate: z.date(), endDate: z.date() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.getFlowExecutionsByDateRange(input.userId, input.startDate, input.endDate);
      }),
    
    topFlows: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().min(1).max(20).optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.getTopFlowsByExecutions(input.userId, input.limit);
      }),
    
    flowAnalytics: protectedProcedure
      .input(z.object({ flowId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        return db.getFlowAnalytics(input.flowId, getCompanyAdminId(ctx));
      }),
    
    updateFlowAnalytics: protectedProcedure
      .input(z.object({ flowId: z.number(), data: z.any() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não autorizado" });
        await db.createOrUpdateFlowAnalytics(input.flowId, getCompanyAdminId(ctx), input.data);
        return { success: true };
      }),
  }),

  // ─── WhatsApp e Multiatendimento ───
  whatsapp: router({
    listChats: protectedProcedure.query(async ({ ctx }) => {
      const companyId = getCompanyAdminId(ctx);
      const allClients = await db.listAllClients();
      let companyClients = allClients.filter(c => companyId === 0 || c.userId === companyId);
      
      // Se for atendente, filtra para apenas os atribuídos a ele
      if (ctx.attendant) {
        const attendantId = ctx.attendant.id;
        companyClients = companyClients.filter(c => c.assignedAttendantId === attendantId);
      }
      
      const allMessages = await db.listAllWhatsappMessages();
      
      const chats = [];
      for (const client of companyClients) {
        const clientMessages = allMessages.filter(m => m.clientId === client.id);
        if (clientMessages.length === 0) continue;
        
        clientMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastMessage = clientMessages[0];
        
        let attendantName = null;
        if (client.assignedAttendantId) {
          const att = await db.getAttendantById(client.assignedAttendantId);
          attendantName = att ? att.name : null;
        }
        
        chats.push({
          client: {
            id: client.id,
            name: client.name,
            phone: client.phone,
            assignedAttendantId: client.assignedAttendantId,
            attendantName,
          },
          lastMessage: {
            message: lastMessage.message,
            direction: lastMessage.direction,
            createdAt: lastMessage.createdAt,
          },
        });
      }
      
      chats.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
      return chats;
    }),

    listMessages: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const client = await db.getClientById(input.clientId, companyId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
        
        if (ctx.attendant && client.assignedAttendantId !== ctx.attendant.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para este contato" });
        }
        
        return db.listWhatsappMessages(client.userId, client.id);
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const client = await db.getClientById(input.clientId, companyId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
        
        if (ctx.attendant && client.assignedAttendantId !== ctx.attendant.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para este contato" });
        }
        
        const attendantId = ctx.attendant ? ctx.attendant.id : null;
        
        const msg = await db.createWhatsappMessage({
          userId: client.userId,
          clientId: client.id,
          attendantId,
          direction: "outbound",
          message: input.message,
          status: "sent",
        });
        
        await db.createInteraction({
          userId: client.userId,
          clientId: client.id,
          type: "whatsapp",
          subject: "Mensagem de WhatsApp enviada",
          content: input.message,
        });

        // Envia pelo WhatsApp Web se houver número cadastrado
        if (client.phone) {
          whatsappService.sendMessage(client.userId, client.phone, input.message).catch(err => {
            console.error("[WhatsApp Web] Erro ao enviar mensagem de saída:", err);
          });
        }
        
        return msg;
      }),

    transferChat: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        targetAttendantId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        const client = await db.getClientById(input.clientId, companyId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Contato não encontrado" });
        
        if (ctx.attendant && client.assignedAttendantId !== ctx.attendant.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode transferir contatos atribuídos a você" });
        }
        
        if (input.targetAttendantId !== null) {
          const targetAtt = await db.getAttendantById(input.targetAttendantId);
          if (!targetAtt || targetAtt.companyId !== companyId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Atendente de destino inválido" });
          }
        }
        
        await db.updateClientAttendant(client.id, input.targetAttendantId);
        
        let detail = "Contato enviado para a fila de espera (Aguardando Atribuição)";
        if (input.targetAttendantId !== null) {
          const targetAtt = await db.getAttendantById(input.targetAttendantId);
          detail = `Contato transferido para o atendente: ${targetAtt?.name}`;
        }
        
        await db.createInteraction({
          userId: client.userId,
          clientId: client.id,
          type: "note",
          subject: "Transferência de Atendimento",
          content: detail,
        });
        
        return { success: true };
      }),

    simulateIncoming: protectedProcedure
      .input(z.object({
        phone: z.string().min(1),
        name: z.string().min(1),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = getCompanyAdminId(ctx);
        try {
          return await db.routeIncomingWhatsappMessage(companyId, input.phone, input.name, input.message);
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message || "Erro ao simular mensagem de entrada" });
        }
      }),

    getConnectionConfig: protectedProcedure.query(async ({ ctx }) => {
      const companyId = getCreatorId(ctx);
      const user = await db.getUserById(companyId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      return {
        whatsappStatus: user.whatsappStatus,
        whatsappNumber: user.whatsappNumber,
        whatsappApiUrl: user.whatsappApiUrl,
        whatsappApiKey: user.whatsappApiKey,
        whatsappQrCode: user.whatsappQrCode,
      };
    }),

    generateQrCode: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerar QR Code" });
        const companyId = getCreatorId(ctx);
        
        // Inicia a conexão real em background.
        // O serviço vai atualizar o banco com o QR code real e mudar o status para connected quando pronto!
        whatsappService.startConnection(companyId).catch(err => {
          console.error(`[WhatsApp Web] Erro ao iniciar conexão real para empresa ID ${companyId}:`, err);
        });

        return { success: true };
      }),

    disconnect: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem desconectar o WhatsApp" });
        const companyId = getCreatorId(ctx);
        
        await whatsappService.disconnectSession(companyId);
        return { success: true };
      }),

    updateConnectionConfig: protectedProcedure
      .input(z.object({
        whatsappNumber: z.string().nullable().optional(),
        whatsappApiUrl: z.string().nullable().optional(),
        whatsappApiKey: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerenciar configurações de WhatsApp" });
        const companyId = getCreatorId(ctx);

        const hasCredentials = !!(input.whatsappNumber && input.whatsappApiUrl && input.whatsappApiKey);
        const whatsappStatus = hasCredentials ? "connected" : "disconnected";

        await db.updateUserWhatsappConfig(companyId, {
          whatsappNumber: input.whatsappNumber || null,
          whatsappApiUrl: input.whatsappApiUrl || null,
          whatsappApiKey: input.whatsappApiKey || null,
          whatsappStatus,
          whatsappQrCode: null,
        });
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({ status: z.enum(["available", "busy", "offline"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.attendant) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas atendentes podem alterar seu próprio status" });
        await db.updateAttendantStatus(ctx.attendant.id, input.status);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
