import { and, desc, eq, like, or, sql, asc, gte, lte, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertClient, clients,
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
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

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

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── Clients ───
export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data);
  return { id: result[0].insertId };
}

export async function updateClient(id: number, userId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set(data).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

export async function deleteClient(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

export async function getClientById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, userId))).limit(1);
  return result[0];
}

export async function listClients(userId: number, opts?: { search?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const conditions = [eq(clients.userId, userId)];
  if (opts?.status) conditions.push(eq(clients.status, opts.status as any));
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

  const where = and(...conditions);
  const [data, countResult] = await Promise.all([
    db.select().from(clients).where(where).orderBy(desc(clients.updatedAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(where),
  ]);

  return { data, total: countResult[0]?.count ?? 0 };
}

// ─── Opportunities ───
export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(opportunities).values(data);
  return { id: result[0].insertId };
}

export async function updateOpportunity(id: number, userId: number, data: Partial<InsertOpportunity>) {
  const db = await getDb();
  if (!db) return;
  await db.update(opportunities).set(data).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)));
}

export async function deleteOpportunity(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)));
}

export async function getOpportunityById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId))).limit(1);
  return result[0];
}

export async function listOpportunities(userId: number, opts?: { stage?: string; clientId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(opportunities.userId, userId)];
  if (opts?.stage) conditions.push(eq(opportunities.stage, opts.stage as any));
  if (opts?.clientId) conditions.push(eq(opportunities.clientId, opts.clientId));
  return db.select().from(opportunities).where(and(...conditions)).orderBy(desc(opportunities.updatedAt));
}

// ─── Tasks ───
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tasks).values(data);
  return { id: result[0].insertId };
}

export async function updateTask(id: number, userId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function listTasks(userId: number, opts?: { clientId?: number; completed?: boolean; upcoming?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.userId, userId)];
  if (opts?.clientId) conditions.push(eq(tasks.clientId, opts.clientId));
  if (opts?.completed !== undefined) conditions.push(eq(tasks.completed, opts.completed));
  if (opts?.upcoming) conditions.push(gte(tasks.dueDate, new Date()));
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate));
}

export async function getOverdueTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.completed, false), lte(tasks.dueDate, new Date()))
  ).orderBy(asc(tasks.dueDate));
}

// ─── Interactions ───
export async function createInteraction(data: InsertInteraction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(interactions).values(data);
  return { id: result[0].insertId };
}

export async function listInteractions(userId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(interactions).where(and(eq(interactions.userId, userId), eq(interactions.clientId, clientId))).orderBy(desc(interactions.createdAt));
}

// ─── Audio Recordings ───
export async function createAudioRecording(data: InsertAudioRecording) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(audioRecordings).values(data);
  return { id: result[0].insertId };
}

export async function updateAudioRecording(id: number, userId: number, data: Partial<InsertAudioRecording>) {
  const db = await getDb();
  if (!db) return;
  await db.update(audioRecordings).set(data).where(and(eq(audioRecordings.id, id), eq(audioRecordings.userId, userId)));
}

export async function listAudioRecordings(userId: number, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(audioRecordings.userId, userId)];
  if (clientId) conditions.push(eq(audioRecordings.clientId, clientId));
  return db.select().from(audioRecordings).where(and(...conditions)).orderBy(desc(audioRecordings.createdAt));
}

// ─── Dashboard Stats ───
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalClients: 0, activeClients: 0, totalOpportunities: 0, totalValue: 0, pendingTasks: 0, overdueTasks: 0, wonDeals: 0, wonValue: 0 };

  const [clientStats, oppStats, taskStats, wonStats] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when clientStatus = 'active' then 1 else 0 end)`,
    }).from(clients).where(eq(clients.userId, userId)),
    db.select({
      total: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(value), 0)`,
    }).from(opportunities).where(and(eq(opportunities.userId, userId), sql`stage NOT IN ('closed_won', 'closed_lost')`)),
    db.select({
      pending: sql<number>`sum(case when completed = false then 1 else 0 end)`,
      overdue: sql<number>`sum(case when completed = false and dueDate < now() then 1 else 0 end)`,
    }).from(tasks).where(eq(tasks.userId, userId)),
    db.select({
      count: sql<number>`count(*)`,
      value: sql<number>`coalesce(sum(value), 0)`,
    }).from(opportunities).where(and(eq(opportunities.userId, userId), eq(opportunities.stage, "closed_won"))),
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
  if (!db) return [];
  return db.select().from(interactions).where(eq(interactions.userId, userId)).orderBy(desc(interactions.createdAt)).limit(limit);
}

export async function getOpportunitiesByStage(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    stage: opportunities.stage,
    count: sql<number>`count(*)`,
    totalValue: sql<number>`coalesce(sum(value), 0)`,
  }).from(opportunities).where(eq(opportunities.userId, userId)).groupBy(opportunities.stage);
}

// ─── Attendants (Atendentes) ───
export async function createAttendant(data: InsertAttendant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(attendants).values(data);
  return { id: result[0].insertId };
}

export async function updateAttendant(id: number, clientId: number, data: Partial<InsertAttendant>) {
  const db = await getDb();
  if (!db) return;
  await db.update(attendants).set(data).where(and(eq(attendants.id, id), eq(attendants.clientId, clientId)));
}

export async function deleteAttendant(id: number, clientId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(attendants).where(and(eq(attendants.id, id), eq(attendants.clientId, clientId)));
}

export async function getAttendantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attendants).where(eq(attendants.id, id)).limit(1);
  return result[0];
}

export async function getAttendantByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attendants).where(eq(attendants.email, email)).limit(1);
  return result[0];
}

export async function listAttendantsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendants).where(eq(attendants.clientId, clientId)).orderBy(desc(attendants.createdAt));
}

export async function countAttendantsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(attendants).where(eq(attendants.clientId, clientId));
  return result[0]?.count ?? 0;
}

export async function updateAttendantSession(id: number, sessionToken: string, ip: string, device: string) {
  const db = await getDb();
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
  if (!db) return;
  await db.update(attendants).set({ sessionToken: null }).where(eq(attendants.id, id));
}

export async function listAllAttendants() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: attendants.id,
    clientId: attendants.clientId,
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
  if (!db) return;
  await db.update(attendants).set({ isActive, sessionToken: isActive ? undefined : null }).where(eq(attendants.id, id));
}

// ─── Active Sessions ───
export async function createActiveSession(data: InsertActiveSession) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Remove old sessions for this attendant (sessão única)
  await db.delete(activeSessions).where(eq(activeSessions.attendantId, data.attendantId));
  const result = await db.insert(activeSessions).values(data);
  return { id: result[0].insertId };
}

export async function getActiveSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(activeSessions).where(eq(activeSessions.sessionToken, token)).limit(1);
  return result[0];
}

export async function deleteSessionsByAttendant(attendantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(activeSessions).where(eq(activeSessions.attendantId, attendantId));
}


// ─── Media Audios ───
export async function listMediaAudios(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaAudios).where(eq(mediaAudios.userId, userId));
}

export async function createMediaAudio(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaAudios).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaAudio(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(mediaAudios).where(and(eq(mediaAudios.id, id), eq(mediaAudios.userId, userId)));
}

// ─── Media Files ───
export async function listMediaFiles(userId: number, fileType?: string) {
  const db = await getDb();
  if (!db) return [];
  if (fileType) {
    return db.select().from(mediaFiles).where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.fileType, fileType as any)));
  }
  return db.select().from(mediaFiles).where(eq(mediaFiles.userId, userId));
}

export async function createMediaFile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaFiles).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaFile(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(mediaFiles).where(and(eq(mediaFiles.id, id), eq(mediaFiles.userId, userId)));
}

// ─── Media Documents ───
export async function listMediaDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaDocuments).where(eq(mediaDocuments.userId, userId));
}

export async function createMediaDocument(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaDocuments).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaDocument(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(mediaDocuments).where(and(eq(mediaDocuments.id, id), eq(mediaDocuments.userId, userId)));
}

// ─── Media Texts ───
export async function listMediaTexts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaTexts).where(eq(mediaTexts.userId, userId));
}

export async function createMediaText(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mediaTexts).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteMediaText(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(mediaTexts).where(and(eq(mediaTexts.id, id), eq(mediaTexts.userId, userId)));
}

// ─── Labels ───
export async function listLabels(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(labels).where(eq(labels.userId, userId));
}

export async function createLabel(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(labels).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateLabel(id: number, userId: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(labels).set(data).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

export async function deleteLabel(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(labels).where(and(eq(labels.id, id), eq(labels.userId, userId)));
}

export async function addLabelToClient(clientId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactLabels).values({ clientId, labelId });
}

export async function removeLabelFromClient(clientId: number, labelId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactLabels).where(and(eq(contactLabels.clientId, clientId), eq(contactLabels.labelId, labelId)));
}

export async function getClientLabels(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactLabels).where(eq(contactLabels.clientId, clientId));
}

// ─── Flows ───
export async function listFlows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flows).where(eq(flows.userId, userId));
}

export async function createFlow(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flows).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlow(id: number, userId: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(flows).set(data).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

export async function deleteFlow(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(flows).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

export async function getFlowById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flows).where(and(eq(flows.id, id), eq(flows.userId, userId))).limit(1);
  return result[0];
}

export async function toggleFlowActive(id: number, userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(flows).set({ isActive }).where(and(eq(flows.id, id), eq(flows.userId, userId)));
}

// ─── Flow Steps ───
export async function createFlowStep(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(flowSteps).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateFlowStep(id: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.update(flowSteps).set(data).where(eq(flowSteps.id, id));
}

export async function deleteFlowStep(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(flowSteps).where(eq(flowSteps.id, id));
}

export async function listFlowSteps(flowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowSteps).where(eq(flowSteps.flowId, flowId));
}

export async function reorderFlowSteps(flowId: number, stepIds: number[]) {
  const db = await getDb();
  if (!db) return;
  for (let i = 0; i < stepIds.length; i++) {
    await db.update(flowSteps).set({ stepOrder: i + 1 }).where(eq(flowSteps.id, stepIds[i]));
  }
}

// ─── Send Counters ───
export async function getSendCounters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sendCounters).where(eq(sendCounters.userId, userId));
}

export async function upsertSendCounter(userId: number, counterType: "audios" | "medias" | "documents" | "messages" | "funnis" | "flows", count: number, maxLimit: number) {
  const db = await getDb();
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
  if (!db) return;
  const existing = await db.select().from(sendCounters).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType))).limit(1);
  if (existing.length > 0) {
    await db.update(sendCounters).set({ count: existing[0].count + 1 }).where(and(eq(sendCounters.userId, userId), eq(sendCounters.counterType, counterType)));
  } else {
    await db.insert(sendCounters).values({ userId, counterType, count: 1, maxLimit: 20 });
  }
}
