import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    isActive: true,
    phone: null,
    avatarUrl: null,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  listUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Admin", email: "admin@test.com", role: "admin", isActive: true, openId: "admin-1", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 2, name: "User", email: "user@test.com", role: "user", isActive: true, openId: "user-2", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  ]),
  updateUserActive: vi.fn().mockResolvedValue(undefined),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  listClients: vi.fn().mockResolvedValue({ data: [
    { id: 1, userId: 1, name: "Cliente Teste", email: "cliente@test.com", phone: "11999999999", company: "Empresa X", status: "active", createdAt: new Date(), updatedAt: new Date() },
  ], total: 1 }),
  getClientById: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "Cliente Teste", email: "cliente@test.com", status: "active" }),
  createClient: vi.fn().mockResolvedValue({ id: 2 }),
  updateClient: vi.fn().mockResolvedValue(undefined),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  listOpportunities: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, clientId: 1, title: "Oportunidade 1", stage: "lead", value: 10000, priority: "medium", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getOpportunityById: vi.fn().mockResolvedValue({ id: 1, userId: 1, clientId: 1, title: "Oportunidade 1", stage: "lead", value: 10000 }),
  createOpportunity: vi.fn().mockResolvedValue({ id: 2 }),
  updateOpportunity: vi.fn().mockResolvedValue(undefined),
  deleteOpportunity: vi.fn().mockResolvedValue(undefined),
  getOpportunitiesByStage: vi.fn().mockResolvedValue([
    { stage: "lead", count: 3, totalValue: 30000 },
    { stage: "proposal", count: 2, totalValue: 50000 },
  ]),
  listTasks: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, title: "Tarefa 1", completed: false, priority: "medium", type: "call", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createTask: vi.fn().mockResolvedValue({ id: 2 }),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getOverdueTasks: vi.fn().mockResolvedValue([]),
  listInteractions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, clientId: 1, type: "note", subject: "Reunião", content: "Discussão sobre proposta", createdAt: new Date() },
  ]),
  createInteraction: vi.fn().mockResolvedValue({ id: 2 }),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalClients: 10,
    activeClients: 7,
    totalOpportunities: 5,
    totalValue: 100000,
    pendingTasks: 3,
    overdueTasks: 1,
    wonDeals: 2,
    wonValue: 50000,
  }),
  getRecentActivities: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, clientId: 1, type: "note", subject: "Follow-up", content: "Ligação realizada", createdAt: new Date() },
  ]),
  listAudioRecordings: vi.fn().mockResolvedValue([]),
  createAudioRecording: vi.fn().mockResolvedValue({ id: 1 }),
  updateAudioRecording: vi.fn().mockResolvedValue(undefined),
  // Attendants
  getAttendantByEmail: vi.fn().mockResolvedValue(null),
  getAttendantById: vi.fn().mockResolvedValue({ id: 1, clientId: 1, name: "Atendente 1", email: "att@empresa.com", isActive: true, sessionToken: "token-123", phone: "11999999999", position: "Vendedor" }),
  listAttendantsByClient: vi.fn().mockResolvedValue([
    { id: 1, clientId: 1, name: "Atendente 1", email: "att@empresa.com", isActive: true, phone: "11999999999", position: "Vendedor", lastLoginAt: new Date(), lastIp: "127.0.0.1" },
  ]),
  listAllAttendants: vi.fn().mockResolvedValue([
    { id: 1, clientId: 1, name: "Atendente 1", email: "att@empresa.com", isActive: true, phone: "11999999999", position: "Vendedor", lastLoginAt: new Date(), lastIp: "127.0.0.1" },
    { id: 2, clientId: 1, name: "Atendente 2", email: "att2@empresa.com", isActive: false, phone: null, position: null, lastLoginAt: null, lastIp: null },
  ]),
  countAttendantsByClient: vi.fn().mockResolvedValue(1),
  createAttendant: vi.fn().mockResolvedValue({ id: 3 }),
  updateAttendant: vi.fn().mockResolvedValue(undefined),
  deleteAttendant: vi.fn().mockResolvedValue(undefined),
  toggleAttendantActive: vi.fn().mockResolvedValue(undefined),
  updateAttendantSession: vi.fn().mockResolvedValue(undefined),
  clearAttendantSession: vi.fn().mockResolvedValue(undefined),
  createActiveSession: vi.fn().mockResolvedValue(undefined),
  getActiveSessionByToken: vi.fn().mockResolvedValue({ id: 1, attendantId: 1, sessionToken: "token-123", expiresAt: new Date(Date.now() + 86400000) }),
  deleteSessionsByAttendant: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Sugestão de vendas: Faça follow-up com o cliente." } }],
  }),
}));

// Mock voice transcription
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    text: "Transcrição do áudio de teste",
    duration: 30,
    language: "pt",
  }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "audio/1/test.webm", url: "https://cdn.example.com/test.webm" }),
}));

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns null when user is inactive", async () => {
    const ctx = createAuthContext({ isActive: false });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("admin", () => {
  it("lists users for admin", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.listUsers();
    expect(result).toHaveLength(2);
  });

  it("toggles user active status", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.toggleUserActive({ userId: 2, isActive: false });
    expect(result).toEqual({ success: true });
  });

  it("updates user role", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.updateUserRole({ userId: 2, role: "admin" });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin users", async () => {
    const ctx = createAuthContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });
});

describe("clients", () => {
  it("lists clients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.list();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("gets client by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.getById({ id: 1 });
    expect(result.name).toBe("Cliente Teste");
  });

  it("creates a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.create({ name: "Novo Cliente", email: "novo@test.com" });
    expect(result.id).toBe(2);
  });

  it("updates a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.update({ id: 1, name: "Cliente Atualizado" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("lists clients with search filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.list({ search: "Teste" });
    expect(result.data).toBeDefined();
  });
});

describe("opportunities", () => {
  it("lists opportunities", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opportunities.list();
    expect(result).toHaveLength(1);
  });

  it("creates an opportunity", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opportunities.create({
      clientId: 1,
      title: "Nova Oportunidade",
      value: 50000,
      stage: "lead",
    });
    expect(result.id).toBe(2);
  });

  it("updates opportunity stage", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opportunities.update({ id: 1, stage: "proposal" });
    expect(result).toEqual({ success: true });
  });

  it("gets opportunities by stage", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opportunities.byStage();
    expect(result).toHaveLength(2);
    expect(result[0].stage).toBe("lead");
  });
});

describe("tasks", () => {
  it("lists tasks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.list();
    expect(result).toHaveLength(1);
  });

  it("creates a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.create({
      title: "Nova Tarefa",
      priority: "high",
      type: "call",
    });
    expect(result.id).toBe(2);
  });

  it("updates a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.update({ id: 1, completed: true });
    expect(result).toEqual({ success: true });
  });

  it("gets overdue tasks", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.overdue();
    expect(result).toHaveLength(0);
  });
});

describe("interactions", () => {
  it("lists interactions for a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.interactions.list({ clientId: 1 });
    expect(result).toHaveLength(1);
  });

  it("creates an interaction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.interactions.create({
      clientId: 1,
      type: "note",
      subject: "Follow-up",
      content: "Ligação realizada com sucesso",
    });
    expect(result.id).toBe(2);
  });
});

describe("dashboard", () => {
  it("returns dashboard stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();
    expect(result.totalClients).toBe(10);
    expect(result.activeClients).toBe(7);
    expect(result.totalOpportunities).toBe(5);
    expect(result.wonDeals).toBe(2);
  });

  it("returns recent activities", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.recentActivities();
    expect(result).toHaveLength(1);
  });

  it("returns opportunities by stage", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.opportunitiesByStage();
    expect(result).toHaveLength(2);
  });
});

describe("ai", () => {
  it("responds to chat messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.chat({
      messages: [{ role: "user", content: "Como abordar um novo cliente?" }],
    });
    expect(result.response).toBeTruthy();
    expect(typeof result.response).toBe("string");
  });

  it("provides sales suggestions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.suggest({
      clientName: "João Silva",
      opportunityStage: "proposal",
    });
    expect(result.suggestions).toBeTruthy();
  });
});

describe("audio", () => {
  it("uploads audio recording", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audio.upload({
      audioBase64: Buffer.from("fake-audio-data").toString("base64"),
      mimeType: "audio/webm",
    });
    expect(result.id).toBe(1);
    expect(result.url).toBeTruthy();
  });

  it("transcribes audio", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audio.transcribe({
      recordingId: 1,
      audioUrl: "https://cdn.example.com/test.webm",
    });
    expect(result.text).toBe("Transcrição do áudio de teste");
    expect(result.duration).toBe(30);
  });

  it("lists audio recordings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audio.list({});
    expect(result).toHaveLength(0);
  });
});

describe("attendants", () => {
  it("lists all attendants for admin", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.listAll();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Atendente 1");
    expect(result[1].isActive).toBe(false);
  });

  it("lists attendants by client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.listByClient({ clientId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("att@empresa.com");
  });

  it("creates an attendant as admin", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.create({
      clientId: 1,
      name: "Novo Atendente",
      email: "novo@empresa.com",
      password: "senha123",
      phone: "11988888888",
      position: "Suporte",
    });
    expect(result.id).toBe(3);
  });

  it("rejects creating attendant with duplicate email", async () => {
    const { getAttendantByEmail } = await import("./db");
    (getAttendantByEmail as any).mockResolvedValueOnce({ id: 1, email: "att@empresa.com" });
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.attendants.create({
        clientId: 1,
        name: "Duplicado",
        email: "att@empresa.com",
        password: "senha123",
      })
    ).rejects.toThrow("J\u00e1 existe um atendente com este email");
  });

  it("updates an attendant as admin", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.update({
      id: 1,
      clientId: 1,
      name: "Atendente Atualizado",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes an attendant as admin", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.delete({ id: 1, clientId: 1 });
    expect(result).toEqual({ success: true });
  });

  it("toggles attendant active status", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.toggleActive({ id: 1, isActive: false });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin from listing all attendants", async () => {
    const ctx = createAuthContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.attendants.listAll()).rejects.toThrow();
  });

  it("rejects non-admin from creating attendants", async () => {
    const ctx = createAuthContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.attendants.create({
        clientId: 1,
        name: "Teste",
        email: "test@test.com",
        password: "senha123",
      })
    ).rejects.toThrow();
  });

  it("verifies a valid session", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.verifySession({ token: "token-123" });
    expect(result.valid).toBe(true);
    expect(result.attendant).toBeTruthy();
    expect(result.attendant?.name).toBe("Atendente 1");
  });

  it("rejects expired session", async () => {
    const { getActiveSessionByToken } = await import("./db");
    (getActiveSessionByToken as any).mockResolvedValueOnce({ id: 1, attendantId: 1, sessionToken: "expired-token", expiresAt: new Date(Date.now() - 1000) });
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.verifySession({ token: "expired-token" });
    expect(result.valid).toBe(false);
    expect(result.attendant).toBeNull();
  });

  it("logs out an attendant", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendants.logout({ token: "token-123" });
    expect(result).toEqual({ success: true });
  });
});
