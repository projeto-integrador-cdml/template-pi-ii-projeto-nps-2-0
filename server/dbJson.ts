import fs from "node:fs";
import path from "node:path";
import {
  User, InsertUser,
  Client, InsertClient,
  Opportunity, InsertOpportunity,
  Task, InsertTask,
  Interaction, InsertInteraction,
  AudioRecording, InsertAudioRecording,
  Attendant, InsertAttendant,
  ActiveSession, InsertActiveSession
} from "../drizzle/schema";

const JSON_DB_PATH = path.resolve(process.cwd(), "db.json");

interface JsonDbData {
  users: User[];
  clients: Client[];
  opportunities: Opportunity[];
  tasks: Task[];
  interactions: Interaction[];
  audioRecordings: AudioRecording[];
  attendants: Attendant[];
  activeSessions: ActiveSession[];
  mediaAudios: any[];
  mediaFiles: any[];
  mediaDocuments: any[];
  mediaTexts: any[];
  labels: any[];
  contactLabels: any[];
  flows: any[];
  flowSteps: any[];
  sendCounters: any[];
  flowExecutions: any[];
  flowResponses: any[];
  flowAnalytics: any[];
}

const emptyData = (): JsonDbData => ({
  users: [],
  clients: [],
  opportunities: [],
  tasks: [],
  interactions: [],
  audioRecordings: [],
  attendants: [],
  activeSessions: [],
  mediaAudios: [],
  mediaFiles: [],
  mediaDocuments: [],
  mediaTexts: [],
  labels: [],
  contactLabels: [],
  flows: [],
  flowSteps: [],
  sendCounters: [],
  flowExecutions: [],
  flowResponses: [],
  flowAnalytics: [],
});

function readJsonDb(): JsonDbData {
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(emptyData(), null, 2));
    return emptyData();
  }
  try {
    const content = fs.readFileSync(JSON_DB_PATH, "utf-8");
    const parsed = JSON.parse(content);
    // Merge with emptyData to ensure all tables exist
    return { ...emptyData(), ...parsed };
  } catch (err) {
    console.error("Error reading JSON database, resetting:", err);
    return emptyData();
  }
}

function writeJsonDb(data: JsonDbData) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
}

// Helper to generate next auto-increment id
function nextId(arr: { id: number }[]): number {
  return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  const db = readJsonDb();
  const existingIndex = db.users.findIndex(u => u.openId === user.openId);

  const now = new Date();
  if (existingIndex > -1) {
    const existing = db.users[existingIndex];
    db.users[existingIndex] = {
      ...existing,
      ...user,
      id: existing.id,
      role: user.role ?? existing.role,
      isActive: user.isActive ?? existing.isActive,
      preferences: user.preferences !== undefined ? user.preferences : existing.preferences,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ? new Date(user.lastSignedIn) : existing.lastSignedIn,
    } as User;
  } else {
    const newId = nextId(db.users);
    const newUser: User = {
      id: newId,
      openId: user.openId!,
      name: user.name ?? null,
      email: user.email ?? null,
      password: user.password ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? "user",
      isActive: user.isActive ?? true,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      preferences: user.preferences ?? null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ? new Date(user.lastSignedIn) : now,
    };
    db.users.push(newUser);
  }
  writeJsonDb(db);
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = readJsonDb();
  return db.users.find(u => u.openId === openId);
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = readJsonDb();
  return db.users.find(u => u.id === id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = readJsonDb();
  return db.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
}

export async function listUsers(): Promise<User[]> {
  const db = readJsonDb();
  return [...db.users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateUserActive(id: number, isActive: boolean): Promise<void> {
  const db = readJsonDb();
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.isActive = isActive;
    user.updatedAt = new Date();
    writeJsonDb(db);
  }
}

export async function updateUserRole(id: number, role: "user" | "admin"): Promise<void> {
  const db = readJsonDb();
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.role = role;
    user.updatedAt = new Date();
    writeJsonDb(db);
  }
}

export async function updateUserPreferences(id: number, preferences: string): Promise<void> {
  const db = readJsonDb();
  const user = db.users.find(u => u.id === id);
  if (user) {
    user.preferences = preferences;
    user.updatedAt = new Date();
    writeJsonDb(db);
  }
}

// ─── Clients ───
export async function createClient(data: InsertClient): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.clients);
  const now = new Date();
  const newClient: Client = {
    id,
    userId: data.userId!,
    name: data.name!,
    email: data.email ?? null,
    phone: data.phone ?? null,
    company: data.company ?? null,
    position: data.position ?? null,
    address: data.address ?? null,
    notes: data.notes ?? null,
    tags: data.tags ?? null,
    source: data.source ?? null,
    status: data.status ?? "prospect",
    maxAttendants: data.maxAttendants ?? 1,
    createdAt: now,
    updatedAt: now,
  };
  db.clients.push(newClient);
  writeJsonDb(db);
  return { id };
}

export async function updateClient(id: number, userId: number, data: Partial<InsertClient>): Promise<void> {
  const db = readJsonDb();
  const index = db.clients.findIndex(c => c.id === id && (userId === 0 || c.userId === userId));
  if (index > -1) {
    db.clients[index] = {
      ...db.clients[index],
      ...data,
      id,
      userId: db.clients[index].userId,
      updatedAt: new Date(),
    } as Client;
    writeJsonDb(db);
  }
}

export async function deleteClient(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  const initialLen = db.clients.length;
  db.clients = db.clients.filter(c => !(c.id === id && (userId === 0 || c.userId === userId)));
  if (db.clients.length !== initialLen) {
    writeJsonDb(db);
  }
}

export async function getClientById(id: number, userId: number): Promise<Client | undefined> {
  const db = readJsonDb();
  return db.clients.find(c => c.id === id && (userId === 0 || c.userId === userId));
}

export async function listClients(
  userId: number,
  opts?: { search?: string; status?: string; limit?: number; offset?: number }
): Promise<{ data: Client[]; total: number }> {
  const db = readJsonDb();
  let list = db.clients.filter(c => userId === 0 || c.userId === userId);

  if (opts?.status) {
    list = list.filter(c => c.status === opts.status);
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  }

  const total = list.length;
  // sort by updatedAt desc
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const data = list.slice(offset, offset + limit);

  return { data, total };
}

// ─── Opportunities ───
export async function createOpportunity(data: InsertOpportunity): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.opportunities);
  const now = new Date();
  const newOpp: Opportunity = {
    id,
    userId: data.userId!,
    clientId: data.clientId!,
    title: data.title!,
    description: data.description ?? null,
    value: data.value ?? 0,
    stage: data.stage ?? "lead",
    priority: data.priority ?? "medium",
    expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
    closedAt: data.closedAt ? new Date(data.closedAt) : null,
    createdAt: now,
    updatedAt: now,
  };
  db.opportunities.push(newOpp);
  writeJsonDb(db);
  return { id };
}

export async function updateOpportunity(id: number, userId: number, data: Partial<InsertOpportunity>): Promise<void> {
  const db = readJsonDb();
  const index = db.opportunities.findIndex(o => o.id === id && o.userId === userId);
  if (index > -1) {
    const now = new Date();
    const updated = {
      ...db.opportunities[index],
      ...data,
      id,
      userId,
      updatedAt: now,
    } as Opportunity;
    if (data.stage === "closed_won" || data.stage === "closed_lost") {
      updated.closedAt = now;
    }
    db.opportunities[index] = updated;
    writeJsonDb(db);
  }
}

export async function deleteOpportunity(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.opportunities = db.opportunities.filter(o => !(o.id === id && o.userId === userId));
  writeJsonDb(db);
}

export async function getOpportunityById(id: number, userId: number): Promise<Opportunity | undefined> {
  const db = readJsonDb();
  return db.opportunities.find(o => o.id === id && o.userId === userId);
}

export async function listOpportunities(userId: number, opts?: { stage?: string; clientId?: number }): Promise<Opportunity[]> {
  const db = readJsonDb();
  let list = db.opportunities.filter(o => o.userId === userId);
  if (opts?.stage) {
    list = list.filter(o => o.stage === opts.stage);
  }
  if (opts?.clientId) {
    list = list.filter(o => o.clientId === opts.clientId);
  }
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// ─── Tasks ───
export async function createTask(data: InsertTask): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.tasks);
  const now = new Date();
  const newTask: Task = {
    id,
    userId: data.userId!,
    clientId: data.clientId ?? null,
    opportunityId: data.opportunityId ?? null,
    title: data.title!,
    description: data.description ?? null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    completed: data.completed ?? false,
    priority: data.priority ?? "medium",
    type: data.type ?? "other",
    createdAt: now,
    updatedAt: now,
  };
  db.tasks.push(newTask);
  writeJsonDb(db);
  return { id };
}

export async function updateTask(id: number, userId: number, data: Partial<InsertTask>): Promise<void> {
  const db = readJsonDb();
  const index = db.tasks.findIndex(t => t.id === id && t.userId === userId);
  if (index > -1) {
    db.tasks[index] = {
      ...db.tasks[index],
      ...data,
      id,
      userId,
      updatedAt: new Date(),
    } as Task;
    writeJsonDb(db);
  }
}

export async function deleteTask(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.tasks = db.tasks.filter(t => !(t.id === id && t.userId === userId));
  writeJsonDb(db);
}

export async function listTasks(userId: number, opts?: { clientId?: number; completed?: boolean; upcoming?: boolean }): Promise<Task[]> {
  const db = readJsonDb();
  let list = db.tasks.filter(t => t.userId === userId);
  if (opts?.clientId) {
    list = list.filter(t => t.clientId === opts.clientId);
  }
  if (opts?.completed !== undefined) {
    list = list.filter(t => t.completed === opts.completed);
  }
  if (opts?.upcoming) {
    const now = new Date();
    list = list.filter(t => t.dueDate && new Date(t.dueDate) >= now);
  }
  return list.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export async function getOverdueTasks(userId: number): Promise<Task[]> {
  const db = readJsonDb();
  const now = new Date();
  return db.tasks
    .filter(t => t.userId === userId && !t.completed && t.dueDate && new Date(t.dueDate) < now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
}

// ─── Interactions ───
export async function createInteraction(data: InsertInteraction): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.interactions);
  const newInt: Interaction = {
    id,
    userId: data.userId!,
    clientId: data.clientId!,
    opportunityId: data.opportunityId ?? null,
    type: data.type ?? "note",
    subject: data.subject ?? null,
    content: data.content ?? null,
    audioUrl: data.audioUrl ?? null,
    transcription: data.transcription ?? null,
    duration: data.duration ?? null,
    createdAt: new Date(),
  };
  db.interactions.push(newInt);
  writeJsonDb(db);
  return { id };
}

export async function listInteractions(userId: number, clientId: number): Promise<Interaction[]> {
  const db = readJsonDb();
  return db.interactions
    .filter(i => i.userId === userId && i.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Audio Recordings ───
export async function createAudioRecording(data: InsertAudioRecording): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.audioRecordings);
  const newRec: AudioRecording = {
    id,
    userId: data.userId!,
    clientId: data.clientId ?? null,
    interactionId: data.interactionId ?? null,
    fileName: data.fileName!,
    fileUrl: data.fileUrl!,
    fileKey: data.fileKey!,
    mimeType: data.mimeType ?? "audio/webm",
    duration: data.duration ?? null,
    fileSize: data.fileSize ?? null,
    transcription: data.transcription ?? null,
    transcriptionStatus: data.transcriptionStatus ?? "pending",
    createdAt: new Date(),
  };
  db.audioRecordings.push(newRec);
  writeJsonDb(db);
  return { id };
}

export async function updateAudioRecording(id: number, userId: number, data: Partial<InsertAudioRecording>): Promise<void> {
  const db = readJsonDb();
  const index = db.audioRecordings.findIndex(r => r.id === id && r.userId === userId);
  if (index > -1) {
    db.audioRecordings[index] = {
      ...db.audioRecordings[index],
      ...data,
      id,
      userId,
    } as AudioRecording;
    writeJsonDb(db);
  }
}

export async function listAudioRecordings(userId: number, clientId?: number): Promise<AudioRecording[]> {
  const db = readJsonDb();
  let list = db.audioRecordings.filter(r => r.userId === userId);
  if (clientId) {
    list = list.filter(r => r.clientId === clientId);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── Attendants ───
export async function createAttendant(data: InsertAttendant): Promise<{ id: number }> {
  const db = readJsonDb();
  const id = nextId(db.attendants);
  const now = new Date();
  const newAtt: Attendant = {
    id,
    clientId: data.clientId!,
    name: data.name!,
    email: data.email!,
    password: data.password!,
    phone: data.phone ?? null,
    position: data.position ?? null,
    isActive: data.isActive ?? true,
    lastIp: data.lastIp ?? null,
    lastDevice: data.lastDevice ?? null,
    sessionToken: data.sessionToken ?? null,
    lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null,
    createdAt: now,
    updatedAt: now,
  };
  db.attendants.push(newAtt);
  writeJsonDb(db);
  return { id };
}

export async function updateAttendant(id: number, clientId: number, data: Partial<InsertAttendant>): Promise<void> {
  const db = readJsonDb();
  const index = db.attendants.findIndex(a => a.id === id && (clientId === 0 || a.clientId === clientId));
  if (index > -1) {
    db.attendants[index] = {
      ...db.attendants[index],
      ...data,
      id,
      clientId: db.attendants[index].clientId,
      updatedAt: new Date(),
    } as Attendant;
    writeJsonDb(db);
  }
}

export async function deleteAttendant(id: number, clientId: number): Promise<void> {
  const db = readJsonDb();
  db.attendants = db.attendants.filter(a => !(a.id === id && (clientId === 0 || a.clientId === clientId)));
  writeJsonDb(db);
}

export async function getAttendantById(id: number): Promise<Attendant | undefined> {
  const db = readJsonDb();
  return db.attendants.find(a => a.id === id);
}

export async function getAttendantByEmail(email: string): Promise<Attendant | undefined> {
  const db = readJsonDb();
  return db.attendants.find(a => a.email.toLowerCase() === email.toLowerCase());
}

export async function listAttendantsByClient(clientId: number): Promise<Attendant[]> {
  const db = readJsonDb();
  return db.attendants.filter(a => a.clientId === clientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function countAttendantsByClient(clientId: number): Promise<number> {
  const db = readJsonDb();
  return db.attendants.filter(a => a.clientId === clientId).length;
}

export async function updateAttendantSession(id: number, sessionToken: string, ip: string, device: string): Promise<void> {
  const db = readJsonDb();
  const attendant = db.attendants.find(a => a.id === id);
  if (attendant) {
    attendant.sessionToken = sessionToken;
    attendant.lastIp = ip;
    attendant.lastDevice = device;
    attendant.lastLoginAt = new Date();
    attendant.updatedAt = new Date();
    writeJsonDb(db);
  }
}

export async function clearAttendantSession(id: number): Promise<void> {
  const db = readJsonDb();
  const attendant = db.attendants.find(a => a.id === id);
  if (attendant) {
    attendant.sessionToken = null;
    attendant.updatedAt = new Date();
    writeJsonDb(db);
  }
}

export async function listAllAttendants(): Promise<Attendant[]> {
  const db = readJsonDb();
  return [...db.attendants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function toggleAttendantActive(id: number, isActive: boolean): Promise<void> {
  const db = readJsonDb();
  const attendant = db.attendants.find(a => a.id === id);
  if (attendant) {
    attendant.isActive = isActive;
    if (!isActive) attendant.sessionToken = null;
    attendant.updatedAt = new Date();
    writeJsonDb(db);
  }
}

// ─── Active Sessions ───
export async function createActiveSession(data: InsertActiveSession): Promise<{ id: number }> {
  const db = readJsonDb();
  db.activeSessions = db.activeSessions.filter(s => s.attendantId !== data.attendantId);
  const id = nextId(db.activeSessions);
  const newSession: ActiveSession = {
    id,
    attendantId: data.attendantId!,
    sessionToken: data.sessionToken!,
    ipAddress: data.ipAddress ?? null,
    userAgent: data.userAgent ?? null,
    createdAt: new Date(),
    expiresAt: new Date(data.expiresAt!),
  };
  db.activeSessions.push(newSession);
  writeJsonDb(db);
  return { id };
}

export async function getActiveSessionByToken(token: string): Promise<ActiveSession | undefined> {
  const db = readJsonDb();
  return db.activeSessions.find(s => s.sessionToken === token);
}

export async function deleteSessionsByAttendant(attendantId: number): Promise<void> {
  const db = readJsonDb();
  db.activeSessions = db.activeSessions.filter(s => s.attendantId !== attendantId);
  writeJsonDb(db);
}

// ─── Dashboard Stats ───
export async function getDashboardStats(userId: number): Promise<any> {
  const db = readJsonDb();
  const cList = db.clients.filter(c => c.userId === userId);
  const oList = db.opportunities.filter(o => o.userId === userId);
  const tList = db.tasks.filter(t => t.userId === userId);

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

export async function getRecentActivities(userId: number, limit = 10): Promise<Interaction[]> {
  const db = readJsonDb();
  return db.interactions
    .filter(i => i.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getOpportunitiesByStage(userId: number): Promise<any[]> {
  const db = readJsonDb();
  const opps = db.opportunities.filter(o => o.userId === userId);
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

// ─── ZapVoice & Automações ───
export async function listMediaAudios(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.mediaAudios.filter(m => m.userId === userId);
}

export async function createMediaAudio(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.mediaAudios);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.mediaAudios.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function deleteMediaAudio(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.mediaAudios = db.mediaAudios.filter(m => !(m.id === id && m.userId === userId));
  writeJsonDb(db);
}

export async function listMediaFiles(userId: number, fileType?: string): Promise<any[]> {
  const db = readJsonDb();
  let list = db.mediaFiles.filter(m => m.userId === userId);
  if (fileType) {
    list = list.filter(m => m.fileType === fileType);
  }
  return list;
}

export async function createMediaFile(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.mediaFiles);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.mediaFiles.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function deleteMediaFile(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.mediaFiles = db.mediaFiles.filter(m => !(m.id === id && m.userId === userId));
  writeJsonDb(db);
}

export async function listMediaDocuments(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.mediaDocuments.filter(m => m.userId === userId);
}

export async function createMediaDocument(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.mediaDocuments);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.mediaDocuments.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function deleteMediaDocument(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.mediaDocuments = db.mediaDocuments.filter(m => !(m.id === id && m.userId === userId));
  writeJsonDb(db);
}

export async function listMediaTexts(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.mediaTexts.filter(m => m.userId === userId);
}

export async function createMediaText(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.mediaTexts);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.mediaTexts.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function deleteMediaText(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.mediaTexts = db.mediaTexts.filter(m => !(m.id === id && m.userId === userId));
  writeJsonDb(db);
}

export async function listLabels(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.labels.filter(l => l.userId === userId);
}

export async function createLabel(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.labels);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.labels.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function updateLabel(id: number, userId: number, data: any): Promise<void> {
  const db = readJsonDb();
  const idx = db.labels.findIndex(l => l.id === id && l.userId === userId);
  if (idx > -1) {
    db.labels[idx] = { ...db.labels[idx], ...data, id, userId, updatedAt: new Date() };
    writeJsonDb(db);
  }
}

export async function deleteLabel(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.labels = db.labels.filter(l => !(l.id === id && l.userId === userId));
  writeJsonDb(db);
}

export async function addLabelToClient(clientId: number, labelId: number): Promise<void> {
  const db = readJsonDb();
  const existing = db.contactLabels.find(cl => cl.clientId === clientId && cl.labelId === labelId);
  if (!existing) {
    db.contactLabels.push({ id: nextId(db.contactLabels), clientId, labelId, createdAt: new Date() });
    writeJsonDb(db);
  }
}

export async function removeLabelFromClient(clientId: number, labelId: number): Promise<void> {
  const db = readJsonDb();
  db.contactLabels = db.contactLabels.filter(cl => !(cl.clientId === clientId && cl.labelId === labelId));
  writeJsonDb(db);
}

export async function getClientLabels(clientId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.contactLabels.filter(cl => cl.clientId === clientId);
}

export async function listFlows(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.flows.filter(f => f.userId === userId);
}

export async function createFlow(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.flows);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.flows.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function updateFlow(id: number, userId: number, data: any): Promise<void> {
  const db = readJsonDb();
  const idx = db.flows.findIndex(f => f.id === id && f.userId === userId);
  if (idx > -1) {
    db.flows[idx] = { ...db.flows[idx], ...data, id, userId, updatedAt: new Date() };
    writeJsonDb(db);
  }
}

export async function deleteFlow(id: number, userId: number): Promise<void> {
  const db = readJsonDb();
  db.flows = db.flows.filter(f => !(f.id === id && f.userId === userId));
  db.flowSteps = db.flowSteps.filter(s => s.flowId !== id);
  writeJsonDb(db);
}

export async function getFlowById(id: number, userId: number): Promise<any> {
  const db = readJsonDb();
  return db.flows.find(f => f.id === id && f.userId === userId);
}

export async function toggleFlowActive(id: number, userId: number, isActive: boolean): Promise<void> {
  const db = readJsonDb();
  const flow = db.flows.find(f => f.id === id && f.userId === userId);
  if (flow) {
    flow.isActive = isActive;
    flow.updatedAt = new Date();
    writeJsonDb(db);
  }
}

export async function createFlowStep(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.flowSteps);
  const newItem = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
  db.flowSteps.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function updateFlowStep(id: number, data: any): Promise<void> {
  const db = readJsonDb();
  const idx = db.flowSteps.findIndex(s => s.id === id);
  if (idx > -1) {
    db.flowSteps[idx] = { ...db.flowSteps[idx], ...data, id, updatedAt: new Date() };
    writeJsonDb(db);
  }
}

export async function deleteFlowStep(id: number): Promise<void> {
  const db = readJsonDb();
  db.flowSteps = db.flowSteps.filter(s => s.id !== id);
  writeJsonDb(db);
}

export async function listFlowSteps(flowId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.flowSteps.filter(s => s.flowId === flowId).sort((a, b) => a.stepOrder - b.stepOrder);
}

export async function reorderFlowSteps(flowId: number, stepIds: number[]): Promise<void> {
  const db = readJsonDb();
  for (let i = 0; i < stepIds.length; i++) {
    const step = db.flowSteps.find(s => s.id === stepIds[i] && s.flowId === flowId);
    if (step) {
      step.stepOrder = i + 1;
    }
  }
  writeJsonDb(db);
}

export async function getSendCounters(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.sendCounters.filter(s => s.userId === userId);
}

export async function upsertSendCounter(userId: number, counterType: string, count: number, maxLimit: number): Promise<void> {
  const db = readJsonDb();
  const existing = db.sendCounters.find(s => s.userId === userId && s.counterType === counterType);
  if (existing) {
    existing.count = count;
    existing.maxLimit = maxLimit;
    existing.updatedAt = new Date();
  } else {
    db.sendCounters.push({
      id: nextId(db.sendCounters),
      userId,
      counterType,
      count,
      maxLimit,
      resetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  writeJsonDb(db);
}

export async function incrementSendCounter(userId: number, counterType: string): Promise<void> {
  const db = readJsonDb();
  const existing = db.sendCounters.find(s => s.userId === userId && s.counterType === counterType);
  if (existing) {
    existing.count += 1;
    existing.updatedAt = new Date();
  } else {
    db.sendCounters.push({
      id: nextId(db.sendCounters),
      userId,
      counterType,
      count: 1,
      maxLimit: 20,
      resetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  writeJsonDb(db);
}

export async function createFlowExecution(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.flowExecutions);
  const newItem = { id, ...data, completedSteps: 0, startedAt: new Date(), createdAt: new Date() };
  db.flowExecutions.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function updateFlowExecution(id: number, data: any): Promise<void> {
  const db = readJsonDb();
  const idx = db.flowExecutions.findIndex(e => e.id === id);
  if (idx > -1) {
    db.flowExecutions[idx] = { ...db.flowExecutions[idx], ...data, id };
    if (data.status === "completed" || data.status === "failed") {
      db.flowExecutions[idx].completedAt = new Date();
    }
    writeJsonDb(db);
  }
}

export async function getFlowExecution(id: number): Promise<any> {
  const db = readJsonDb();
  return db.flowExecutions.find(e => e.id === id);
}

export async function listFlowExecutions(flowId: number, limit = 50): Promise<any[]> {
  const db = readJsonDb();
  return db.flowExecutions
    .filter(e => e.flowId === flowId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function createFlowResponse(data: any): Promise<any> {
  const db = readJsonDb();
  const id = nextId(db.flowResponses);
  const newItem = { id, ...data, createdAt: new Date() };
  db.flowResponses.push(newItem);
  writeJsonDb(db);
  return newItem;
}

export async function getFlowResponses(flowExecutionId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.flowResponses.filter(r => r.flowExecutionId === flowExecutionId);
}

export async function countFlowResponses(flowId: number, startDate?: Date, endDate?: Date): Promise<number> {
  const db = readJsonDb();
  const execIds = new Set(
    db.flowExecutions
      .filter(e => e.flowId === flowId && (!startDate || new Date(e.createdAt) >= startDate) && (!endDate || new Date(e.createdAt) <= endDate))
      .map(e => e.id)
  );
  return db.flowResponses.filter(r => execIds.has(r.flowExecutionId)).length;
}

export async function getAverageResponseTime(flowId: number, startDate?: Date, endDate?: Date): Promise<number> {
  const db = readJsonDb();
  const execIds = new Set(
    db.flowExecutions
      .filter(e => e.flowId === flowId && (!startDate || new Date(e.createdAt) >= startDate) && (!endDate || new Date(e.createdAt) <= endDate))
      .map(e => e.id)
  );
  const responses = db.flowResponses.filter(r => execIds.has(r.flowExecutionId) && typeof r.responseTime === "number");
  if (responses.length === 0) return 0;
  const sum = responses.reduce((acc, r) => acc + (r.responseTime || 0), 0);
  return Math.round(sum / responses.length);
}

export async function getFlowAnalytics(flowId: number, userId: number): Promise<any> {
  const db = readJsonDb();
  return db.flowAnalytics.find(a => a.flowId === flowId && a.userId === userId);
}

export async function createOrUpdateFlowAnalytics(flowId: number, userId: number, data: any): Promise<void> {
  const db = readJsonDb();
  const idx = db.flowAnalytics.findIndex(a => a.flowId === flowId && a.userId === userId);
  if (idx > -1) {
    db.flowAnalytics[idx] = { ...db.flowAnalytics[idx], ...data, flowId, userId, updatedAt: new Date() };
  } else {
    db.flowAnalytics.push({
      id: nextId(db.flowAnalytics),
      flowId,
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  writeJsonDb(db);
}

export async function listFlowAnalytics(userId: number): Promise<any[]> {
  const db = readJsonDb();
  return db.flowAnalytics.filter(a => a.userId === userId);
}

export async function getFlowExecutionStats(flowId: number, startDate?: Date, endDate?: Date): Promise<any> {
  const db = readJsonDb();
  const list = db.flowExecutions.filter(e => 
    e.flowId === flowId &&
    (!startDate || new Date(e.createdAt) >= startDate) &&
    (!endDate || new Date(e.createdAt) <= endDate)
  );
  const total = list.length;
  const successful = list.filter(e => e.status === "completed").length;
  const failed = list.filter(e => e.status === "failed").length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
  return { total, successful, failed, successRate };
}

export async function getFlowExecutionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
  const db = readJsonDb();
  const userFlowIds = new Set(db.flows.filter(f => f.userId === userId).map(f => f.id));
  const list = db.flowExecutions.filter(e => 
    userFlowIds.has(e.flowId) &&
    new Date(e.createdAt) >= startDate &&
    new Date(e.createdAt) <= endDate
  );

  const counts: Record<string, number> = {};
  for (const e of list) {
    const dStr = new Date(e.createdAt).toISOString().split("T")[0];
    counts[dStr] = (counts[dStr] || 0) + 1;
  }

  return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getFlowResponseRateByFlow(userId: number): Promise<any[]> {
  const db = readJsonDb();
  const userFlows = db.flows.filter(f => f.userId === userId);
  const result = [];
  for (const f of userFlows) {
    const executions = db.flowExecutions.filter(e => e.flowId === f.id);
    const execIds = new Set(executions.map(e => e.id));
    const responses = db.flowResponses.filter(r => execIds.has(r.flowExecutionId));
    const totalExecutions = executions.length;
    const totalResponses = responses.length;
    const responseRate = totalExecutions > 0 ? Math.round((totalResponses / totalExecutions) * 100) : 0;
    result.push({
      flowId: f.id,
      flowName: f.name,
      totalExecutions,
      totalResponses,
      responseRate
    });
  }
  return result;
}

export async function getTopFlowsByExecutions(userId: number, limit = 10): Promise<any[]> {
  const db = readJsonDb();
  const userFlows = db.flows.filter(f => f.userId === userId);
  const result = [];
  for (const f of userFlows) {
    const executions = db.flowExecutions.filter(e => e.flowId === f.id);
    const successfulExecutions = executions.filter(e => e.status === "completed").length;
    result.push({
      flowId: f.id,
      flowName: f.name,
      totalExecutions: executions.length,
      successfulExecutions
    });
  }
  return result.sort((a, b) => b.totalExecutions - a.totalExecutions).slice(0, limit);
}
