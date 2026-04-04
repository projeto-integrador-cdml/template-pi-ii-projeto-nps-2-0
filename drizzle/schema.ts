import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

// ─── Users (estendido com senha e status ativo) ───
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clientes ───
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 255 }),
  position: varchar("position", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  tags: text("tags"),
  source: varchar("source", { length: 100 }),
  status: mysqlEnum("clientStatus", ["active", "inactive", "prospect"]).default("prospect").notNull(),
  maxAttendants: int("maxAttendants").default(1).notNull(), // limite de atendentes por empresa
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Atendentes (vinculados a empresas/clientes) ───
export const attendants = mysqlTable("attendants", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(), // empresa a que pertence
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  position: varchar("position", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastIp: varchar("lastIp", { length: 64 }),
  lastDevice: text("lastDevice"),
  sessionToken: varchar("sessionToken", { length: 255 }), // token da sessão ativa (sessão única)
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendant = typeof attendants.$inferSelect;
export type InsertAttendant = typeof attendants.$inferInsert;

// ─── Sessões Ativas (controle de sessão única) ───
export const activeSessions = mysqlTable("activeSessions", {
  id: int("id").autoincrement().primaryKey(),
  attendantId: int("attendantId").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

// ─── Oportunidades (Funil de Vendas) ───
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  value: bigint("value", { mode: "number" }).default(0),
  stage: mysqlEnum("stage", ["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).default("lead").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  expectedCloseDate: timestamp("expectedCloseDate"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

// ─── Tarefas ───
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  opportunityId: int("opportunityId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  priority: mysqlEnum("taskPriority", ["low", "medium", "high"]).default("medium").notNull(),
  type: mysqlEnum("taskType", ["call", "email", "meeting", "follow_up", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Interações / Atividades ───
export const interactions = mysqlTable("interactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  opportunityId: int("opportunityId"),
  type: mysqlEnum("interactionType", ["call", "email", "meeting", "note", "whatsapp", "audio"]).default("note").notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  audioUrl: text("audioUrl"),
  transcription: text("transcription"),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = typeof interactions.$inferInsert;

// ─── Gravações de Áudio ───
export const audioRecordings = mysqlTable("audioRecordings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  interactionId: int("interactionId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).default("audio/webm").notNull(),
  duration: int("duration"),
  fileSize: int("fileSize"),
  transcription: text("transcription"),
  transcriptionStatus: mysqlEnum("transcriptionStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AudioRecording = typeof audioRecordings.$inferSelect;
export type InsertAudioRecording = typeof audioRecordings.$inferInsert;

// ─── Mensagens WhatsApp (preparado para integração futura) ───
export const whatsappMessages = mysqlTable("whatsappMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  message: text("message"),
  mediaUrl: text("mediaUrl"),
  status: mysqlEnum("whatsappStatus", ["sent", "delivered", "read", "failed"]).default("sent").notNull(),
  externalId: varchar("externalId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ─── Configurações do sistema ───
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
