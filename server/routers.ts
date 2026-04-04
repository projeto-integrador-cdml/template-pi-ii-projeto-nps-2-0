import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => {
      if (opts.ctx.user && !opts.ctx.user.isActive) {
        return null;
      }
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

        // Verificar se a empresa está ativa
        const client = await db.getClientById(attendant.clientId, 0); // userId 0 = bypass for lookup
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
            clientId: attendant.clientId,
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
            clientId: attendant.clientId,
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

    // Listar atendentes de uma empresa (admin ou empresa)
    listByClient: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return db.listAttendantsByClient(input.clientId);
      }),

    // Criar atendente (admin)
    create: adminProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        position: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar se a empresa existe
        const client = await db.getClientById(input.clientId, 0);
        // Verificar limite de atendentes
        const count = await db.countAttendantsByClient(input.clientId);
        // Buscar o cliente diretamente para pegar maxAttendants
        const clientData = await db.listClients(0, { limit: 1 });
        // Verificar se email já existe
        const existing = await db.getAttendantByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe um atendente com este email" });

        const hashedPassword = await bcrypt.hash(input.password, 10);
        return db.createAttendant({
          ...input,
          password: hashedPassword,
        });
      }),

    // Atualizar atendente (admin)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, clientId, password, ...data } = input;
        const updateData: any = { ...data };
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }
        await db.updateAttendant(id, clientId, updateData);
        return { success: true };
      }),

    // Excluir atendente (admin)
    delete: adminProcedure
      .input(z.object({ id: z.number(), clientId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSessionsByAttendant(input.id);
        await db.deleteAttendant(input.id, input.clientId);
        return { success: true };
      }),

    // Ativar/desativar atendente (admin)
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleAttendantActive(input.id, input.isActive);
        if (!input.isActive) {
          await db.deleteSessionsByAttendant(input.id);
        }
        return { success: true };
      }),

    // Listar todos os atendentes (admin)
    listAll: adminProcedure.query(async () => {
      return db.listAllAttendants();
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
        return db.listClients(ctx.user.id, input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await db.getClientById(input.id, ctx.user.id);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });
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
        maxAttendants: z.number().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createClient({ ...input, userId: ctx.user.id, email: input.email || null });
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
        maxAttendants: z.number().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateClient(id, ctx.user.id, { ...data, email: data.email || null });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteClient(input.id, ctx.user.id);
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
        return db.listOpportunities(ctx.user.id, input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const opp = await db.getOpportunityById(input.id, ctx.user.id);
        if (!opp) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada" });
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
        return db.createOpportunity({ ...input, userId: ctx.user.id });
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
        // Check if stage changed for notification
        if (data.stage) {
          const existing = await db.getOpportunityById(id, ctx.user.id);
          if (existing && existing.stage !== data.stage) {
            if (data.stage === "closed_won" || data.stage === "closed_lost") {
              data.closedAt = new Date();
            }
            // Send notification about stage change
            try {
              await notifyOwner({
                title: `Oportunidade "${existing.title}" mudou de estágio`,
                content: `A oportunidade mudou de "${existing.stage}" para "${data.stage}". Valor: R$ ${(existing.value ?? 0) / 100}`,
              });
            } catch (e) { /* notification is best-effort */ }
          }
        }
        await db.updateOpportunity(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteOpportunity(input.id, ctx.user.id);
        return { success: true };
      }),
    byStage: protectedProcedure.query(async ({ ctx }) => {
      return db.getOpportunitiesByStage(ctx.user.id);
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
        return db.listTasks(ctx.user.id, input);
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
        return db.createTask({ ...input, userId: ctx.user.id });
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
        await db.updateTask(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTask(input.id, ctx.user.id);
        return { success: true };
      }),
    overdue: protectedProcedure.query(async ({ ctx }) => {
      return db.getOverdueTasks(ctx.user.id);
    }),
  }),

  // ─── Interações ───
  interactions: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.listInteractions(ctx.user.id, input.clientId);
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
        return db.createInteraction({ ...input, userId: ctx.user.id });
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
        const buffer = Buffer.from(input.audioBase64, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp3") ? "mp3" : "wav";
        const fileName = input.fileName || `recording-${Date.now()}.${ext}`;
        const fileKey = `audio/${ctx.user.id}/${nanoid()}-${fileName}`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        const recording = await db.createAudioRecording({
          userId: ctx.user.id,
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
        await db.updateAudioRecording(input.recordingId, ctx.user.id, { transcriptionStatus: "processing" });

        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: "pt",
          prompt: "Transcrever conversa com cliente em português brasileiro",
        });

        if ("error" in result) {
          await db.updateAudioRecording(input.recordingId, ctx.user.id, { transcriptionStatus: "failed" });
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }

        await db.updateAudioRecording(input.recordingId, ctx.user.id, {
          transcription: result.text,
          transcriptionStatus: "completed",
          duration: Math.round(result.duration),
        });

        return { text: result.text, duration: result.duration, language: result.language };
      }),
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.listAudioRecordings(ctx.user.id, input?.clientId);
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

  // ─── Dashboard ───
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
    recentActivities: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getRecentActivities(ctx.user.id, input?.limit);
      }),
    opportunitiesByStage: protectedProcedure.query(async ({ ctx }) => {
      return db.getOpportunitiesByStage(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
