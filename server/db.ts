import { and, desc, eq, like, or, sql, asc, gte, lte, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertClient, clients, Client,
  InsertOpportunity, opportunities,
  InsertTask, tasks,
  InsertInteraction, interactions,
  InsertAudioRecording, audioRecordings,
  InsertWhatsappMessage, whatsappMessages,
  InsertSetting, settings,
  InsertAttendant, attendants,
  InsertActiveSession, activeSessions,
  mediaAudios,
  mediaFiles,
  mediaDocuments,
  mediaTexts,
  labels,
  contactLabels,
  flows,
  flowSteps,
  sendCounters,
  flowExecutions,
  flowResponses,
  flowAnalytics,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as jsonDb from "./dbJson";

let _db: ReturnType<typeof drizzle> | null = null;
export let useJsonDb = false;
let connectionPromise: Promise<ReturnType<typeof drizzle> | null> | null = null;

export async function getDb() {
  if (useJsonDb) return null;
  if (_db) return _db;
  
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = (async () => {
    if (process.env.DATABASE_URL) {
      try {
        const tempDb = drizzle(process.env.DATABASE_URL);
        // Test connection with SELECT 1
        await tempDb.execute(sql`SELECT 1`);
        console.log("[Database] Connected successfully to MySQL!");
        _db = tempDb;
        return _db;
      } catch (error) {
        console.warn("[Database] Failed to connect to MySQL, falling back to JSON database.");
        useJsonDb = true;
        return null;
      }
    } else {
      console.warn("[Database] DATABASE_URL not set, falling back to JSON database.");
      useJsonDb = true;
      return null;
    }
  })();
  
  return connectionPromise;
}


// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.upsertUser(user);
  if (!db) return;

  if (!user.openId) throw new Error("User openId is required for upsert");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.password !== undefined) { values.password = user.password; updateSet.password = user.password; }
  if (user.phone !== undefined) { values.phone = user.phone; updateSet.phone = user.phone; }
  if (user.isActive !== undefined) { values.isActive = user.isActive; updateSet.isActive = user.isActive; }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (user.companyName !== undefined) { values.companyName = user.companyName; updateSet.companyName = user.companyName; }
  if (user.maxAttendants !== undefined) { values.maxAttendants = user.maxAttendants; updateSet.maxAttendants = user.maxAttendants; }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getUserByOpenId(openId);
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getUserById(id);
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getUserByEmail(email);
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listUsers();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateUserActive(id, isActive);
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateUserRole(id, role);
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateUserCota(id: number, companyName: string, maxAttendants: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateUserCota(id, companyName, maxAttendants);
  if (!db) return;
  await db.update(users).set({ companyName, maxAttendants, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function updateUserPreferences(id: number, preferences: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateUserPreferences(id, preferences);
  if (!db) return;
  await db.update(users).set({ preferences } as any).where(eq(users.id, id));
}


// ─── Clients ───
export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createClient(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data);
  return { id: result[0].insertId };
}

export async function updateClient(id: number, userId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateClient(id, userId, data);
  if (!db) return;
  const conditions = [eq(clients.id, id)];
  if (userId !== 0) conditions.push(eq(clients.userId, userId));
  await db.update(clients).set(data).where(and(...conditions));
}

export async function deleteClient(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteClient(id, userId);
  if (!db) return;
  const conditions = [eq(clients.id, id)];
  if (userId !== 0) conditions.push(eq(clients.userId, userId));
  await db.delete(clients).where(and(...conditions));
}

export async function getClientById(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getClientById(id, userId);
  if (!db) return undefined;
  const conditions = [eq(clients.id, id)];
  if (userId !== 0) conditions.push(eq(clients.userId, userId));
  const result = await db.select().from(clients).where(and(...conditions)).limit(1);
  return result[0];
}

export async function listClients(userId: number, opts?: { search?: string; status?: string; limit?: number; offset?: number; assignedAttendantId?: number }) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listClients(userId, opts);
  if (!db) return { data: [], total: 0 };

  const conditions = [];
  if (userId !== 0) conditions.push(eq(clients.userId, userId));
  if (opts?.status) conditions.push(eq(clients.status, opts.status as any));
  if (opts?.assignedAttendantId !== undefined) {
    conditions.push(eq(clients.assignedAttendantId, opts.assignedAttendantId));
  }
  if (opts?.search) {
    conditions.push(
      or(
        like(clients.name, `%${opts.search}%`),
        like(clients.email, `%${opts.search}%`),
        like(clients.phone, `%${opts.search}%`),
        like(clients.company, `%${opts.search}%`)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(clients).where(where).orderBy(desc(clients.updatedAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(where),
  ]);

  return { data, total: countResult[0]?.count ?? 0 };
}

// ─── Opportunities ───
export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createOpportunity(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(opportunities).values(data);
  return { id: result[0].insertId };
}

export async function updateOpportunity(id: number, userId: number, data: Partial<InsertOpportunity>) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateOpportunity(id, userId, data);
  if (!db) return;
  const conditions = [eq(opportunities.id, id)];
  if (userId !== 0) conditions.push(eq(opportunities.userId, userId));
  await db.update(opportunities).set(data).where(and(...conditions));
}

export async function deleteOpportunity(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteOpportunity(id, userId);
  if (!db) return;
  const conditions = [eq(opportunities.id, id)];
  if (userId !== 0) conditions.push(eq(opportunities.userId, userId));
  await db.delete(opportunities).where(and(...conditions));
}

export async function getOpportunityById(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getOpportunityById(id, userId);
  if (!db) return undefined;
  const conditions = [eq(opportunities.id, id)];
  if (userId !== 0) conditions.push(eq(opportunities.userId, userId));
  const result = await db.select().from(opportunities).where(and(...conditions)).limit(1);
  return result[0];
}

export async function listOpportunities(userId: number, opts?: { stage?: string; clientId?: number }) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listOpportunities(userId, opts);
  if (!db) return [];
  const conditions = [];
  if (userId !== 0) conditions.push(eq(opportunities.userId, userId));
  if (opts?.stage) conditions.push(eq(opportunities.stage, opts.stage as any));
  if (opts?.clientId) conditions.push(eq(opportunities.clientId, opts.clientId));
  return db.select().from(opportunities).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(opportunities.updatedAt));
}

// ─── Tasks ───
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createTask(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tasks).values(data);
  return { id: result[0].insertId };
}

export async function updateTask(id: number, userId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateTask(id, userId, data);
  if (!db) return;
  const conditions = [eq(tasks.id, id)];
  if (userId !== 0) conditions.push(eq(tasks.userId, userId));
  await db.update(tasks).set(data).where(and(...conditions));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteTask(id, userId);
  if (!db) return;
  const conditions = [eq(tasks.id, id)];
  if (userId !== 0) conditions.push(eq(tasks.userId, userId));
  await db.delete(tasks).where(and(...conditions));
}

export async function listTasks(userId: number, opts?: { clientId?: number; completed?: boolean; upcoming?: boolean }) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listTasks(userId, opts);
  if (!db) return [];
  const conditions = [];
  if (userId !== 0) conditions.push(eq(tasks.userId, userId));
  if (opts?.clientId) conditions.push(eq(tasks.clientId, opts.clientId));
  if (opts?.completed !== undefined) conditions.push(eq(tasks.completed, opts.completed));
  if (opts?.upcoming) conditions.push(gte(tasks.dueDate, new Date()));
  return db.select().from(tasks).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(asc(tasks.dueDate));
}

export async function getOverdueTasks(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getOverdueTasks(userId);
  if (!db) return [];
  const conditions = [eq(tasks.completed, false), lte(tasks.dueDate, new Date())];
  if (userId !== 0) conditions.push(eq(tasks.userId, userId));
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate));
}

// ─── Interactions ───
export async function createInteraction(data: InsertInteraction) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createInteraction(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(interactions).values(data);
  return { id: result[0].insertId };
}

export async function listInteractions(userId: number, clientId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listInteractions(userId, clientId);
  if (!db) return [];
  const conditions = [eq(interactions.clientId, clientId)];
  if (userId !== 0) conditions.push(eq(interactions.userId, userId));
  return db.select().from(interactions).where(and(...conditions)).orderBy(desc(interactions.createdAt));
}

// ─── Audio Recordings ───
export async function createAudioRecording(data: InsertAudioRecording) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createAudioRecording(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(audioRecordings).values(data);
  return { id: result[0].insertId };
}

export async function updateAudioRecording(id: number, userId: number, data: Partial<InsertAudioRecording>) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateAudioRecording(id, userId, data);
  if (!db) return;
  const conditions = [eq(audioRecordings.id, id)];
  if (userId !== 0) conditions.push(eq(audioRecordings.userId, userId));
  await db.update(audioRecordings).set(data).where(and(...conditions));
}

export async function listAudioRecordings(userId: number, clientId?: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listAudioRecordings(userId, clientId);
  if (!db) return [];
  const conditions = [];
  if (userId !== 0) conditions.push(eq(audioRecordings.userId, userId));
  if (clientId) conditions.push(eq(audioRecordings.clientId, clientId));
  return db.select().from(audioRecordings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(audioRecordings.createdAt));
}

// ─── Dashboard Stats ───
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getDashboardStats(userId);
  if (!db) return { totalClients: 0, activeClients: 0, totalOpportunities: 0, totalValue: 0, pendingTasks: 0, overdueTasks: 0, wonDeals: 0, wonValue: 0 };

  const clientConditions = [];
  if (userId !== 0) clientConditions.push(eq(clients.userId, userId));
  
  const oppConditions = [sql`stage NOT IN ('closed_won', 'closed_lost')`];
  if (userId !== 0) oppConditions.push(eq(opportunities.userId, userId));
  
  const taskConditions = [];
  if (userId !== 0) taskConditions.push(eq(tasks.userId, userId));
  
  const wonConditions = [eq(opportunities.stage, "closed_won")];
  if (userId !== 0) wonConditions.push(eq(opportunities.userId, userId));

  const [clientStats, oppStats, taskStats, wonStats] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when clientStatus = 'active' then 1 else 0 end)`,
    }).from(clients).where(clientConditions.length > 0 ? and(...clientConditions) : undefined),
    db.select({
      total: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(value), 0)`,
    }).from(opportunities).where(and(...oppConditions)),
    db.select({
      pending: sql<number>`sum(case when completed = false then 1 else 0 end)`,
      overdue: sql<number>`sum(case when completed = false and dueDate < now() then 1 else 0 end)`,
    }).from(tasks).where(taskConditions.length > 0 ? and(...taskConditions) : undefined),
    db.select({
      count: sql<number>`count(*)`,
      value: sql<number>`coalesce(sum(value), 0)`,
    }).from(opportunities).where(and(...wonConditions)),
  ]);

  return {
    totalClients: clientStats[0]?.total ?? 0,
    activeClients: clientStats[0]?.active ?? 0,
    totalOpportunities: oppStats[0]?.total ?? 0,
    totalValue: oppStats[0]?.totalValue ?? 0,
    pendingTasks: taskStats[0]?.pending ?? 0,
    overdueTasks: taskStats[0]?.overdue ?? 0,
    wonDeals: wonStats[0]?.count ?? 0,
    wonValue: wonStats[0]?.value ?? 0,
  };
}

export async function getRecentActivities(userId: number, limit = 10) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getRecentActivities(userId, limit);
  if (!db) return [];
  const conditions = [];
  if (userId !== 0) conditions.push(eq(interactions.userId, userId));
  return db.select().from(interactions).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(interactions.createdAt)).limit(limit);
}

export async function getOpportunitiesByStage(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getOpportunitiesByStage(userId);
  if (!db) return [];
  const conditions = [];
  if (userId !== 0) conditions.push(eq(opportunities.userId, userId));
  return db.select({
    stage: opportunities.stage,
    count: sql<number>`count(*)`,
    totalValue: sql<number>`coalesce(sum(value), 0)`,
  }).from(opportunities).where(conditions.length > 0 ? and(...conditions) : undefined).groupBy(opportunities.stage);
}

// ─── Attendants (Atendentes) ───
export async function createAttendant(data: InsertAttendant) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createAttendant(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(attendants).values(data);
  return { id: result[0].insertId };
}

export async function updateAttendant(id: number, companyId: number, data: Partial<InsertAttendant>) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateAttendant(id, companyId, data);
  if (!db) return;
  await db.update(attendants).set(data).where(and(eq(attendants.id, id), or(eq(attendants.companyId, companyId), eq((attendants as any).clientId, companyId))));
}

export async function deleteAttendant(id: number, companyId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteAttendant(id, companyId);
  if (!db) return;
  await db.delete(attendants).where(and(eq(attendants.id, id), or(eq(attendants.companyId, companyId), eq((attendants as any).clientId, companyId))));
}

export async function getAttendantById(id: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getAttendantById(id);
  if (!db) return undefined;
  const result = await db.select().from(attendants).where(eq(attendants.id, id)).limit(1);
  return result[0];
}

export async function getAttendantByEmail(email: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getAttendantByEmail(email);
  if (!db) return undefined;
  const result = await db.select().from(attendants).where(eq(attendants.email, email)).limit(1);
  return result[0];
}

export async function listAttendantsByCompany(companyId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listAttendantsByCompany(companyId);
  if (!db) return [];
  return db.select().from(attendants).where(or(eq(attendants.companyId, companyId), eq((attendants as any).clientId, companyId))).orderBy(desc(attendants.createdAt));
}

export async function countAttendantsByCompany(companyId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.countAttendantsByCompany(companyId);
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(attendants).where(or(eq(attendants.companyId, companyId), eq((attendants as any).clientId, companyId)));
  return result[0]?.count ?? 0;
}

// Retrocompatibilidade
export async function listAttendantsByClient(clientId: number) {
  return listAttendantsByCompany(clientId);
}

export async function countAttendantsByClient(clientId: number) {
  return countAttendantsByCompany(clientId);
}

export async function updateAttendantSession(id: number, sessionToken: string, ip: string, device: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateAttendantSession(id, sessionToken, ip, device);
  if (!db) return;
  await db.update(attendants).set({
    sessionToken,
    lastIp: ip,
    lastDevice: device,
    lastLoginAt: new Date(),
  }).where(eq(attendants.id, id));
}

export async function clearAttendantSession(id: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.clearAttendantSession(id);
  if (!db) return;
  await db.update(attendants).set({ sessionToken: null }).where(eq(attendants.id, id));
}

export async function listAllAttendants() {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listAllAttendants();
  if (!db) return [];
  return db.select({
    id: attendants.id,
    companyId: attendants.companyId,
    status: attendants.status,
    name: attendants.name,
    email: attendants.email,
    phone: attendants.phone,
    position: attendants.position,
    isActive: attendants.isActive,
    lastIp: attendants.lastIp,
    lastDevice: attendants.lastDevice,
    lastLoginAt: attendants.lastLoginAt,
    createdAt: attendants.createdAt,
    updatedAt: attendants.updatedAt,
  }).from(attendants).orderBy(desc(attendants.createdAt));
}

export async function toggleAttendantActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.toggleAttendantActive(id, isActive);
  if (!db) return;
  await db.update(attendants).set({ isActive, sessionToken: isActive ? undefined : null }).where(eq(attendants.id, id));
}

// ─── Active Sessions ───
export async function createActiveSession(data: InsertActiveSession) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createActiveSession(data);
  if (!db) throw new Error("DB not available");
  // Remove old sessions for this attendant
  await db.delete(activeSessions).where(eq(activeSessions.attendantId, data.attendantId));
  const result = await db.insert(activeSessions).values(data);
  return { id: result[0].insertId };
}

export async function getActiveSessionByToken(token: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getActiveSessionByToken(token);
  if (!db) return undefined;
  const result = await db.select().from(activeSessions).where(eq(activeSessions.sessionToken, token)).limit(1);
  return result[0];
}

export async function deleteSessionsByAttendant(attendantId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteSessionsByAttendant(attendantId);
  if (!db) return;
  await db.delete(activeSessions).where(eq(activeSessions.attendantId, attendantId));
}

// ─── Media Audios ───
export async function listMediaAudios(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listMediaAudios(userId);
  if (!db) return [];
  return db.select().from(mediaAudios).where(eq(mediaAudios.userId, userId));
}

export async function createMediaAudio(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createMediaAudio(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaAudios).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaAudio(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteMediaAudio(id, userId);
  if (!db) return;
  await db.delete(mediaAudios).where(and(eq(mediaAudios.id, id), eq(mediaAudios.userId, userId)));
}

// ─── Media Files ───
export async function listMediaFiles(userId: number, fileType?: string) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listMediaFiles(userId, fileType);
  if (!db) return [];
  if (fileType) {
    return db.select().from(mediaFiles).where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.fileType, fileType as any)));
  }
  return db.select().from(mediaFiles).where(eq(mediaFiles.userId, userId));
}

export async function createMediaFile(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createMediaFile(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaFiles).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaFile(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteMediaFile(id, userId);
  if (!db) return;
  await db.delete(mediaFiles).where(and(eq(mediaFiles.id, id), eq(mediaFiles.userId, userId)));
}

// ─── Media Documents ───
export async function listMediaDocuments(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listMediaDocuments(userId);
  if (!db) return [];
  return db.select().from(mediaDocuments).where(eq(mediaDocuments.userId, userId));
}

export async function createMediaDocument(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createMediaDocument(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaDocuments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaDocument(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteMediaDocument(id, userId);
  if (!db) return;
  await db.delete(mediaDocuments).where(and(eq(mediaDocuments.id, id), eq(mediaDocuments.userId, userId)));
}

// ─── Media Texts ───
export async function listMediaTexts(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listMediaTexts(userId);
  if (!db) return [];
  return db.select().from(mediaTexts).where(eq(mediaTexts.userId, userId));
}

export async function createMediaText(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createMediaText(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaTexts).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaText(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteMediaText(id, userId);
  if (!db) return;
  await db.delete(mediaTexts).where(and(eq(mediaTexts.id, id), eq(mediaTexts.userId, userId)));
}

// ─── Labels ───
export async function listLabels(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listLabels(userId);
  if (!db) return [];
  return db.select().from(labels).where(eq(labels.userId, userId));
}

export async function createLabel(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createLabel(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(labels).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateLabel(id: number, userId: number, data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateLabel(id, userId, data);
  if (!db) return;
  await db.update(labels).set(data).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

export async function deleteLabel(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteLabel(id, userId);
  if (!db) return;
  await db.delete(labels).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

export async function addLabelToClient(clientId: number, labelId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.addLabelToClient(clientId, labelId);
  if (!db) return;
  await db.insert(contactLabels).values({ clientId, labelId });
}

export async function removeLabelFromClient(clientId: number, labelId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.removeLabelFromClient(clientId, labelId);
  if (!db) return;
  await db.delete(contactLabels).where(and(eq(contactLabels.clientId, clientId), eq(contactLabels.labelId, labelId)));
}

export async function getClientLabels(clientId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getClientLabels(clientId);
  if (!db) return [];
  return db.select().from(contactLabels).where(eq(contactLabels.clientId, clientId));
}

// ─── Flows ───
export async function listFlows(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listFlows(userId);
  if (!db) return [];
  return db.select().from(flows).where(eq(flows.userId, userId));
}

export async function createFlow(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createFlow(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flows).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlow(id: number, userId: number, data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateFlow(id, userId, data);
  if (!db) return;
  await db.update(flows).set(data).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

export async function deleteFlow(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteFlow(id, userId);
  if (!db) return;
  await db.delete(flows).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

export async function getFlowById(id: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowById(id, userId);
  if (!db) return undefined;
  const result = await db.select().from(flows).where(and(eq(flows.id, id), eq(flows.userId, userId))).limit(1);
  return result[0];
}

export async function toggleFlowActive(id: number, userId: number, isActive: boolean) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.toggleFlowActive(id, userId, isActive);
  if (!db) return;
  await db.update(flows).set({ isActive }).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

// ─── Flow Steps ───
export async function createFlowStep(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createFlowStep(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flowSteps).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlowStep(id: number, data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateFlowStep(id, data);
  if (!db) return;
  await db.update(flowSteps).set(data).where(eq(flowSteps.id, id));
}

export async function deleteFlowStep(id: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.deleteFlowStep(id);
  if (!db) return;
  await db.delete(flowSteps).where(eq(flowSteps.id, id));
}

export async function listFlowSteps(flowId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listFlowSteps(flowId);
  if (!db) return [];
  return db.select().from(flowSteps).where(eq(flowSteps.flowId, flowId));
}

export async function reorderFlowSteps(flowId: number, stepIds: number[]) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.reorderFlowSteps(flowId, stepIds);
  if (!db) return;
  for (let i = 0; i < stepIds.length; i++) {
    await db.update(flowSteps).set({ stepOrder: i + 1 }).where(eq(flowSteps.id, stepIds[i]));
  }
}

// ─── Send Counters ───
export async function getSendCounters(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getSendCounters(userId);
  if (!db) return [];
  return db.select().from(sendCounters).where(eq(sendCounters.userId, userId));
}

export async function upsertSendCounter(userId: number, counterType: "audios" | "medias" | "documents" | "messages" | "funnis" | "flows", count: number, maxLimit: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.upsertSendCounter(userId, counterType, count, maxLimit);
  if (!db) return;
  const existing = await db.select().from(sendCounters).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType))).limit(1);
  if (existing.length > 0) {
    await db.update(sendCounters).set({ count, maxLimit }).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType)));
  } else {
    await db.insert(sendCounters).values({ userId, counterType, count, maxLimit });
  }
}

export async function incrementSendCounter(userId: number, counterType: "audios" | "medias" | "documents" | "messages" | "funnis" | "flows") {
  const db = await getDb();
  if (useJsonDb) return jsonDb.incrementSendCounter(userId, counterType);
  if (!db) return;
  const existing = await db.select().from(sendCounters).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType))).limit(1);
  if (existing.length > 0) {
    await db.update(sendCounters).set({ count: existing[0].count + 1 }).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType)));
  } else {
    await db.insert(sendCounters).values({ userId, counterType, count: 1, maxLimit: 20 });
  }
}

// ─── Flow Executions ───
export async function createFlowExecution(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createFlowExecution(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flowExecutions).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlowExecution(id: number, data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateFlowExecution(id, data);
  if (!db) return;
  await db.update(flowExecutions).set(data).where(eq(flowExecutions.id, id));
}

export async function getFlowExecution(id: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowExecution(id);
  if (!db) return undefined;
  const result = await db.select().from(flowExecutions).where(eq(flowExecutions.id, id)).limit(1);
  return result[0];
}

export async function listFlowExecutions(flowId: number, limit: number = 50) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listFlowExecutions(flowId, limit);
  if (!db) return [];
  return db.select().from(flowExecutions).where(eq(flowExecutions.flowId, flowId)).orderBy(desc(flowExecutions.createdAt)).limit(limit);
}

// ─── Flow Responses ───
export async function createFlowResponse(data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createFlowResponse(data);
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flowResponses).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getFlowResponses(flowExecutionId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowResponses(flowExecutionId);
  if (!db) return [];
  return db.select().from(flowResponses).where(eq(flowResponses.flowExecutionId, flowExecutionId));
}

export async function countFlowResponses(flowId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.countFlowResponses(flowId, startDate, endDate);
  if (!db) return 0;
  
  let conditions: any[] = [eq(flowExecutions.flowId, flowId)];
  if (startDate && endDate) {
    conditions.push(gte(flowExecutions.createdAt, startDate));
    conditions.push(lte(flowExecutions.createdAt, endDate));
  }
  
  const result = await db.select({ count: sql`COUNT(*)`.mapWith(Number) }).from(flowResponses)
    .innerJoin(flowExecutions, eq(flowResponses.flowExecutionId, flowExecutions.id))
    .where(and(...conditions));
  
  return result[0]?.count || 0;
}

export async function getAverageResponseTime(flowId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getAverageResponseTime(flowId, startDate, endDate);
  if (!db) return 0;
  
  let conditions: any[] = [eq(flowExecutions.flowId, flowId)];
  if (startDate && endDate) {
    conditions.push(gte(flowExecutions.createdAt, startDate));
    conditions.push(lte(flowExecutions.createdAt, endDate));
  }
  
  const result = await db.select({ avgTime: sql`AVG(${flowResponses.responseTime})`.mapWith(Number) }).from(flowResponses)
    .innerJoin(flowExecutions, eq(flowResponses.flowExecutionId, flowExecutions.id))
    .where(and(...conditions));
  
  return Math.round(result[0]?.avgTime || 0);
}

// ─── Flow Analytics ───
export async function getFlowAnalytics(flowId: number, userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowAnalytics(flowId, userId);
  if (!db) return undefined;
  const result = await db.select().from(flowAnalytics).where(and(eq(flowAnalytics.flowId, flowId), eq(flowAnalytics.userId, userId))).limit(1);
  return result[0];
}

export async function createOrUpdateFlowAnalytics(flowId: number, userId: number, data: any) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createOrUpdateFlowAnalytics(flowId, userId, data);
  if (!db) return;
  
  const existing = await db.select().from(flowAnalytics).where(and(eq(flowAnalytics.flowId, flowId), eq(flowAnalytics.userId, userId))).limit(1);
  if (existing.length > 0) {
    await db.update(flowAnalytics).set(data).where(and(eq(flowAnalytics.flowId, flowId), eq(flowAnalytics.userId, userId)));
  } else {
    await db.insert(flowAnalytics).values({ flowId, userId, ...data });
  }
}

export async function listFlowAnalytics(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listFlowAnalytics(userId);
  if (!db) return [];
  return db.select().from(flowAnalytics).where(eq(flowAnalytics.userId, userId));
}

export async function getFlowExecutionStats(flowId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowExecutionStats(flowId, startDate, endDate);
  if (!db) return { total: 0, successful: 0, failed: 0, successRate: 0 };
  
  let conditions: any[] = [eq(flowExecutions.flowId, flowId)];
  if (startDate && endDate) {
    conditions.push(gte(flowExecutions.createdAt, startDate));
    conditions.push(lte(flowExecutions.createdAt, endDate));
  }
  
  const result = await db.select({
    total: sql`COUNT(*)`.mapWith(Number),
    successful: sql`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`.mapWith(Number),
    failed: sql`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`.mapWith(Number),
  }).from(flowExecutions).where(and(...conditions));
  
  const total = result[0]?.total || 0;
  const successful = result[0]?.successful || 0;
  const failed = result[0]?.failed || 0;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
  
  return { total, successful, failed, successRate };
}

export async function getFlowExecutionsByDateRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowExecutionsByDateRange(userId, startDate, endDate);
  if (!db) return [];
  
  return db.select({
    date: sql`DATE(${flowExecutions.createdAt})`,
    count: sql`COUNT(*)`,
  }).from(flowExecutions)
    .innerJoin(flows, eq(flowExecutions.flowId, flows.id))
    .where(and(
      eq(flows.userId, userId),
      gte(flowExecutions.createdAt, startDate),
      lte(flowExecutions.createdAt, endDate)
    ))
    .groupBy(sql`DATE(${flowExecutions.createdAt})`)
    .orderBy(sql`DATE(${flowExecutions.createdAt})`);
}

export async function getFlowResponseRateByFlow(userId: number) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getFlowResponseRateByFlow(userId);
  if (!db) return [];
  
  return db.select({
    flowId: flows.id,
    flowName: flows.name,
    totalExecutions: sql`COUNT(DISTINCT ${flowExecutions.id})`,
    totalResponses: sql`COUNT(DISTINCT ${flowResponses.id})`,
    responseRate: sql`ROUND((COUNT(DISTINCT ${flowResponses.id}) / COUNT(DISTINCT ${flowExecutions.id})) * 100)`,
  }).from(flows)
    .leftJoin(flowExecutions, eq(flows.id, flowExecutions.flowId))
    .leftJoin(flowResponses, eq(flowExecutions.id, flowResponses.flowExecutionId))
    .where(eq(flows.userId, userId))
    .groupBy(flows.id, flows.name);
}

export async function getTopFlowsByExecutions(userId: number, limit: number = 10) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getTopFlowsByExecutions(userId, limit);
  if (!db) return [];
  
  return db.select({
    flowId: flows.id,
    flowName: flows.name,
    totalExecutions: sql`COUNT(${flowExecutions.id})`.mapWith(Number),
    successfulExecutions: sql`SUM(CASE WHEN ${flowExecutions.status} = 'completed' THEN 1 ELSE 0 END)`.mapWith(Number),
  })
  .from(flows)
  .leftJoin(flowExecutions, eq(flows.id, flowExecutions.flowId))
  .where(eq(flows.userId, userId))
  .groupBy(flows.id, flows.name)
  .orderBy(desc(sql`COUNT(${flowExecutions.id})`))
  .limit(limit);
}

export async function seedTestUser() {
  const db = await getDb();
  // seedTestUser operates on getDb(), which routes to MySQL if active, or JSON DB otherwise!
  if (useJsonDb) {
    console.log("[Seed] Testing JSON database auto-seed...");
    const email = "exemplo@gmail.com";
    const existing = await jsonDb.getUserByEmail(email);
    if (!existing) {
      console.log(`[Seed] Test user ${email} not found in JSON DB. Creating...`);
      const hashedPassword = await bcrypt.hash("exemplo", 10);
      const openId = `local-${nanoid()}`;
      await jsonDb.upsertUser({
        openId,
        name: "Exemplo",
        email,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });
      console.log(`[Seed] Test user ${email} created successfully in JSON DB!`);
    } else {
      console.log(`[Seed] Test user ${email} already exists in JSON DB.`);
    }
    return;
  }

  if (!db) return;
  const email = "exemplo@gmail.com";
  const existing = await getUserByEmail(email);
  if (!existing) {
    console.log(`[Seed] Test user ${email} not found in MySQL. Creating...`);
    const hashedPassword = await bcrypt.hash("exemplo", 10);
    const openId = `local-${nanoid()}`;
    await upsertUser({
      openId,
      name: "Exemplo",
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    console.log(`[Seed] Test user ${email} created successfully in MySQL!`);
  } else {
    console.log(`[Seed] Test user ${email} already exists in MySQL.`);
  }
}

export async function updateClientAttendant(clientId: number, attendantId: number | null) {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateClientAttendant(clientId, attendantId);
  if (!db) return;
  await db.update(clients).set({ assignedAttendantId: attendantId, updatedAt: new Date() }).where(eq(clients.id, clientId));
}

export async function countAssignedClients(attendantId: number): Promise<number> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.countAssignedClients(attendantId);
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(clients).where(eq(clients.assignedAttendantId, attendantId));
  return result[0]?.count ?? 0;
}

export async function createWhatsappMessage(data: any): Promise<any> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.createWhatsappMessage(data);
  if (!db) throw new Error("DB not available");
  
  const values = {
    userId: data.userId,
    clientId: data.clientId || null,
    attendantId: data.attendantId || null,
    direction: data.direction,
    message: data.message || null,
    mediaUrl: data.mediaUrl || null,
    status: data.status || "sent",
    externalId: data.externalId || null,
    transcription: data.transcription || null,
    transcriptionStatus: data.transcriptionStatus || null,
    sentiment: data.sentiment || null,
  };
  
  const result = await db.insert(whatsappMessages).values(values as any);
  return { id: result[0].insertId, ...values, createdAt: new Date() };
}

export async function listWhatsappMessages(userId: number, clientId: number): Promise<any[]> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listWhatsappMessages(userId, clientId);
  if (!db) return [];
  return db.select().from(whatsappMessages)
    .where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.clientId, clientId)))
    .orderBy(asc(whatsappMessages.createdAt));
}

export async function updateUserWhatsappConfig(
  userId: number,
  data: {
    whatsappStatus?: string;
    whatsappNumber?: string | null;
    whatsappApiUrl?: string | null;
    whatsappApiKey?: string | null;
    whatsappQrCode?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateUserWhatsappConfig(userId, data);
  if (!db) return;
}

export async function updateWhatsappMessageStatus(externalId: string, status: string): Promise<void> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateWhatsappMessageStatus(externalId, status);
  if (!db) return;
  await db.update(whatsappMessages).set({ status: status as any }).where(eq(whatsappMessages.externalId, externalId));
}

export async function updateAttendantStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.updateAttendantStatus(id, status);
  if (!db) return;
  await db.update(attendants).set({ status }).where(eq(attendants.id, id));
}

export async function listAllClients(): Promise<Client[]> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listAllClients();
  if (!db) return [];
  return db.select().from(clients);
}

export async function listAllWhatsappMessages(): Promise<any[]> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.listAllWhatsappMessages();
  if (!db) return [];
  return db.select().from(whatsappMessages);
}

export async function routeIncomingWhatsappMessage(
  companyId: number,
  phone: string,
  name: string,
  message: string,
  mediaUrl?: string
): Promise<{ msg: any; assignedAttendantId: number | null }> {
  const allClients = await listAllClients();
  let client = allClients.find(c => c.userId === companyId && c.phone === phone);
  
  if (!client) {
    const newClientRes = await createClient({
      userId: companyId,
      name: name,
      phone: phone,
      status: "prospect",
    } as any);
    client = await getClientById(newClientRes.id, companyId);
  }
  
  if (!client) throw new Error("Erro ao criar ou buscar cliente no CRM");
  
  let assignedId = client.assignedAttendantId;
  if (assignedId) {
    const att = await getAttendantById(assignedId);
    if (!att || !att.isActive || att.status !== "available") {
      assignedId = null;
    }
  }
  
  if (!assignedId) {
    const companyAttendants = await listAttendantsByCompany(companyId);
    const availableAttendants = companyAttendants.filter(a => a.isActive && a.status === "available");
    
    if (availableAttendants.length > 0) {
      let bestAttendant = null;
      
      const ruleSetting = await getSetting(companyId, "lead_distribution_rule");
      const rule = ruleSetting?.settingValue || "least_busy";
      
      if (rule === "round_robin") {
        const sortedAttendants = [...availableAttendants].sort((a, b) => a.id - b.id);
        const lastAssignedSetting = await getSetting(companyId, "last_assigned_attendant_id");
        const lastId = lastAssignedSetting ? parseInt(lastAssignedSetting.settingValue || "0", 10) : 0;
        
        let nextIndex = sortedAttendants.findIndex(a => a.id > lastId);
        if (nextIndex === -1) {
          nextIndex = 0;
        }
        
        bestAttendant = sortedAttendants[nextIndex];
        if (bestAttendant) {
          await upsertSetting(companyId, "last_assigned_attendant_id", bestAttendant.id.toString());
        }
      } else {
        let minCount = Infinity;
        for (const att of availableAttendants) {
          const count = await countAssignedClients(att.id);
          if (count < minCount) {
            minCount = count;
            bestAttendant = att;
          }
        }
      }
      
      if (bestAttendant) {
        assignedId = bestAttendant.id;
        await updateClientAttendant(client.id, assignedId);
      }
    } else {
      assignedId = null;
      await updateClientAttendant(client.id, null);
    }
  }
  
  let finalMessage = message;
  let finalMediaUrl = mediaUrl || null;
  let transcription: string | null = null;
  let transcriptionStatus: string | null = null;

  const isAudio = message.toLowerCase().includes("[áudio]") || message.toLowerCase().includes("[audio]") || message.toLowerCase().includes("audio:") || (mediaUrl && mediaUrl.includes(".mp3"));
  if (isAudio) {
    transcription = "Olá! Gostaria de saber qual o preço do plano premium de vocês e se vocês oferecem suporte aos finais de semana.";
    transcriptionStatus = "completed";
    if (message.toLowerCase().includes("[áudio]") && !mediaUrl) {
      finalMediaUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }
  }

  const textToAnalyze = (transcription || message || "").toLowerCase();
  let sentiment = "neutral";
  if (textToAnalyze.match(/(demora|atraso|reclamar|lento|ruim|péssimo|esperando|não funciona|problema|erro)/i)) {
    sentiment = "angry";
  } else if (textToAnalyze.match(/(obrigado|ótimo|bom|excelente|perfeito|gostei|parabéns|legal|sucesso)/i)) {
    sentiment = "positive";
  } else if (textToAnalyze.match(/(dúvida|preço|como funciona|saber mais|plano|informação|ajuda)/i)) {
    sentiment = "neutral";
  }

  const msg = await createWhatsappMessage({
    userId: companyId,
    clientId: client.id,
    direction: "inbound",
    message: finalMessage,
    status: "read",
    mediaUrl: finalMediaUrl,
    transcription,
    transcriptionStatus,
    sentiment,
  });
  
  await createInteraction({
    userId: companyId,
    clientId: client.id,
    type: isAudio ? "audio" : "whatsapp",
    subject: isAudio ? "Mensagem de voz recebida" : "Mensagem de WhatsApp recebida",
    content: isAudio ? `[Áudio Transcrito] ${transcription}` : message,
  });
  
  return { msg, assignedAttendantId: assignedId };
}

export async function getSetting(userId: number, settingKey: string): Promise<any> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.getSetting(userId, settingKey);
  if (!db) return null;
  const result = await db.select().from(settings).where(and(eq(settings.userId, userId), eq(settings.settingKey, settingKey))).limit(1);
  return result[0] || null;
}

export async function upsertSetting(userId: number, settingKey: string, settingValue: string): Promise<void> {
  const db = await getDb();
  if (useJsonDb) return jsonDb.upsertSetting(userId, settingKey, settingValue);
  if (!db) return;
  
  const existing = await getSetting(userId, settingKey);
  if (existing) {
    await db.update(settings).set({ settingValue, updatedAt: new Date() }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      userId,
      settingKey,
      settingValue,
    });
  }
}
