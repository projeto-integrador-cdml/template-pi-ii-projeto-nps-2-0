import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, index, uniqueIndex } from "drizzle-orm/mysql-core";

// ─── Users (empresa / administrador) ───
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
  preferences: text("preferences"),
  companyName: varchar("companyName", { length: 255 }),
  maxAttendants: int("maxAttendants").default(5).notNull(),
  whatsappStatus: varchar("whatsappStatus", { length: 32 }).default("disconnected").notNull(),
  whatsappNumber: varchar("whatsappNumber", { length: 32 }),
  whatsappApiUrl: text("whatsappApiUrl"),
  whatsappApiKey: text("whatsappApiKey"),
  whatsappQrCode: text("whatsappQrCode"),
  twoFactorSecret: text("twoFactorSecret"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clientes ───
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  assignedAttendantId: int("assignedAttendantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_clients_userId").on(table.userId),
  index("idx_clients_assignedAttendantId").on(table.assignedAttendantId),
  index("idx_clients_userId_status").on(table.userId, table.status),
]);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Atendentes (vinculados a empresas/usuários admin) ───
export const attendants = mysqlTable("attendants", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).default("available").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  position: varchar("position", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastIp: varchar("lastIp", { length: 64 }),
  lastDevice: text("lastDevice"),
  sessionToken: varchar("sessionToken", { length: 255 }),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_attendants_companyId").on(table.companyId),
  index("idx_attendants_email").on(table.email),
]);

export type Attendant = typeof attendants.$inferSelect;
export type InsertAttendant = typeof attendants.$inferInsert;

// ─── Sessões Ativas (controle de sessão única) ───
export const activeSessions = mysqlTable("activeSessions", {
  id: int("id").autoincrement().primaryKey(),
  attendantId: int("attendantId").notNull().references(() => attendants.id, { onDelete: "cascade" }),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
}, (table) => [
  index("idx_activeSessions_sessionToken").on(table.sessionToken),
]);

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

// ─── Oportunidades (Funil de Vendas) ───
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  value: bigint("value", { mode: "number" }).default(0),
  stage: mysqlEnum("stage", ["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"]).default("lead").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  expectedCloseDate: timestamp("expectedCloseDate"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_opportunities_userId").on(table.userId),
  index("idx_opportunities_clientId").on(table.clientId),
  index("idx_opportunities_stage").on(table.stage),
]);

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

// ─── Tarefas ───
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("clientId").references(() => clients.id, { onDelete: "set null" }),
  opportunityId: int("opportunityId").references(() => opportunities.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  priority: mysqlEnum("taskPriority", ["low", "medium", "high"]).default("medium").notNull(),
  type: mysqlEnum("taskType", ["call", "email", "meeting", "follow_up", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_tasks_userId_completed").on(table.userId, table.completed),
  index("idx_tasks_dueDate").on(table.dueDate),
]);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Interações / Atividades ───
export const interactions = mysqlTable("interactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  opportunityId: int("opportunityId").references(() => opportunities.id, { onDelete: "set null" }),
  type: mysqlEnum("interactionType", ["call", "email", "meeting", "note", "whatsapp", "audio"]).default("note").notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  audioUrl: text("audioUrl"),
  transcription: text("transcription"),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_interactions_clientId").on(table.clientId),
]);

export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = typeof interactions.$inferInsert;

// ─── Gravações de Áudio ───
export const audioRecordings = mysqlTable("audioRecordings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("clientId").references(() => clients.id, { onDelete: "set null" }),
  interactionId: int("interactionId").references(() => interactions.id, { onDelete: "set null" }),
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

// ─── Mensagens WhatsApp ───
export const whatsappMessages = mysqlTable("whatsappMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("clientId").references(() => clients.id, { onDelete: "set null" }),
  attendantId: int("attendantId").references(() => attendants.id, { onDelete: "set null" }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  message: text("message"),
  mediaUrl: text("mediaUrl"),
  status: mysqlEnum("whatsappStatus", ["sent", "delivered", "read", "failed"]).default("sent").notNull(),
  externalId: varchar("externalId", { length: 255 }),
  transcription: text("transcription"),
  transcriptionStatus: varchar("transcriptionStatus", { length: 50 }),
  sentiment: varchar("sentiment", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_whatsappMessages_userId_clientId").on(table.userId, table.clientId),
  index("idx_whatsappMessages_externalId").on(table.externalId),
]);

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ─── Configurações do sistema ───
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("idx_settings_userId_settingKey").on(table.userId, table.settingKey),
]);

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Mídias de Áudio (Biblioteca de áudios pré-gravados) ───
export const mediaAudios = mysqlTable("mediaAudios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).default("audio/mpeg").notNull(),
  duration: int("duration"),
  fileSize: int("fileSize"),
  sendAsForwarded: boolean("sendAsForwarded").default(false).notNull(),
  sendAsViewOnce: boolean("sendAsViewOnce").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaAudio = typeof mediaAudios.$inferSelect;
export type InsertMediaAudio = typeof mediaAudios.$inferInsert;

// ─── Mídias de Arquivo (Imagens/Vídeos) ───
export const mediaFiles = mysqlTable("mediaFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileType: mysqlEnum("fileType", ["image", "video"]).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize"),
  sendAsViewOnce: boolean("sendAsViewOnce").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;

// ─── Documentos ───
export const mediaDocuments = mysqlTable("mediaDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaDocument = typeof mediaDocuments.$inferSelect;
export type InsertMediaDocument = typeof mediaDocuments.$inferInsert;

// ─── Mensagens de Texto Pré-definidas ───
export const mediaTexts = mysqlTable("mediaTexts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaText = typeof mediaTexts.$inferSelect;
export type InsertMediaText = typeof mediaTexts.$inferInsert;

// ─── Etiquetas (Labels) ───
export const labels = mysqlTable("labels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Label = typeof labels.$inferSelect;
export type InsertLabel = typeof labels.$inferInsert;

// ─── Etiquetas por Contato ───
export const contactLabels = mysqlTable("contactLabels", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  labelId: int("labelId").notNull().references(() => labels.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_contactLabels_clientId_labelId").on(table.clientId, table.labelId),
]);

export type ContactLabel = typeof contactLabels.$inferSelect;
export type InsertContactLabel = typeof contactLabels.$inferInsert;

// ─── Fluxos de Automação ───
export const flows = mysqlTable("flows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerType: mysqlEnum("triggerType", ["message_contains", "message_equals", "message_starts_with", "message_ends_with", "keyword"]).notNull(),
  triggerValue: text("triggerValue").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_flows_userId").on(table.userId),
]);

export type Flow = typeof flows.$inferSelect;
export type InsertFlow = typeof flows.$inferInsert;

// ─── Passos do Fluxo ───
export const flowSteps = mysqlTable("flowSteps", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepType: mysqlEnum("stepType", ["delay", "wait_response", "randomizer", "audio", "contact", "document", "media", "text"]).notNull(),
  stepOrder: int("stepOrder").notNull(),
  delaySeconds: int("delaySeconds"),
  mediaAudioId: int("mediaAudioId"),
  mediaFileId: int("mediaFileId"),
  mediaDocumentId: int("mediaDocumentId"),
  mediaTextId: int("mediaTextId"),
  randomOptions: text("randomOptions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_flowSteps_flowId").on(table.flowId),
]);

export type FlowStep = typeof flowSteps.$inferSelect;
export type InsertFlowStep = typeof flowSteps.$inferInsert;

// ─── Contadores de Envio ───
export const sendCounters = mysqlTable("sendCounters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  counterType: mysqlEnum("counterType", ["audios", "medias", "documents", "messages", "funnis", "flows"]).notNull(),
  count: int("count").default(0).notNull(),
  maxLimit: int("maxLimit").default(20).notNull(),
  resetDate: timestamp("resetDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("idx_sendCounters_userId_counterType").on(table.userId, table.counterType),
]);

export type SendCounter = typeof sendCounters.$inferSelect;
export type InsertSendCounter = typeof sendCounters.$inferInsert;

// ─── Execução de Fluxos ───
export const flowExecutions = mysqlTable("flowExecutions", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  status: mysqlEnum("executionStatus", ["started", "in_progress", "completed", "failed"]).default("started").notNull(),
  totalSteps: int("totalSteps").notNull(),
  completedSteps: int("completedSteps").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_flowExecutions_flowId").on(table.flowId),
]);

export type FlowExecution = typeof flowExecutions.$inferSelect;
export type InsertFlowExecution = typeof flowExecutions.$inferInsert;

// ─── Respostas de Clientes (para fluxos com wait_response) ───
export const flowResponses = mysqlTable("flowResponses", {
  id: int("id").autoincrement().primaryKey(),
  flowExecutionId: int("flowExecutionId").notNull().references(() => flowExecutions.id, { onDelete: "cascade" }),
  flowStepId: int("flowStepId").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  responseText: text("responseText"),
  responseTime: int("responseTime"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FlowResponse = typeof flowResponses.$inferSelect;
export type InsertFlowResponse = typeof flowResponses.$inferInsert;

// ─── Análise de Fluxos (métricas agregadas) ───
export const flowAnalytics = mysqlTable("flowAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull().references(() => flows.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  totalExecutions: int("totalExecutions").default(0).notNull(),
  successfulExecutions: int("successfulExecutions").default(0).notNull(),
  failedExecutions: int("failedExecutions").default(0).notNull(),
  totalResponses: int("totalResponses").default(0).notNull(),
  responseRate: int("responseRate").default(0).notNull(),
  avgResponseTime: int("avgResponseTime").default(0).notNull(),
  avgCompletionTime: int("avgCompletionTime").default(0).notNull(),
  lastExecutedAt: timestamp("lastExecutedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowAnalytics = typeof flowAnalytics.$inferSelect;
export type InsertFlowAnalytics = typeof flowAnalytics.$inferInsert;

// ─── Redefinição de Senha (código de 6 dígitos) ───
export const passwordResets = mysqlTable("passwordResets", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_passwordResets_email_code").on(table.email, table.code),
]);

export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = typeof passwordResets.$inferInsert;
