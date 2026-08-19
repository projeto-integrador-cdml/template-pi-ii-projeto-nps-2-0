import { relations } from "drizzle-orm";
import {
  users,
  clients,
  attendants,
  activeSessions,
  opportunities,
  tasks,
  interactions,
  audioRecordings,
  whatsappMessages,
  settings,
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
} from "./schema";

// ─── Users ───
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  attendants: many(attendants),
  opportunities: many(opportunities),
  tasks: many(tasks),
  interactions: many(interactions),
  audioRecordings: many(audioRecordings),
  whatsappMessages: many(whatsappMessages),
  settings: many(settings),
  mediaAudios: many(mediaAudios),
  mediaFiles: many(mediaFiles),
  mediaDocuments: many(mediaDocuments),
  mediaTexts: many(mediaTexts),
  labels: many(labels),
  flows: many(flows),
  sendCounters: many(sendCounters),
  flowAnalytics: many(flowAnalytics),
}));

// ─── Clients ───
export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  assignedAttendant: one(attendants, { fields: [clients.assignedAttendantId], references: [attendants.id] }),
  opportunities: many(opportunities),
  tasks: many(tasks),
  interactions: many(interactions),
  audioRecordings: many(audioRecordings),
  whatsappMessages: many(whatsappMessages),
  contactLabels: many(contactLabels),
  flowExecutions: many(flowExecutions),
  flowResponses: many(flowResponses),
}));

// ─── Attendants ───
export const attendantsRelations = relations(attendants, ({ one, many }) => ({
  company: one(users, { fields: [attendants.companyId], references: [users.id] }),
  activeSessions: many(activeSessions),
  whatsappMessages: many(whatsappMessages),
}));

// ─── Active Sessions ───
export const activeSessionsRelations = relations(activeSessions, ({ one }) => ({
  attendant: one(attendants, { fields: [activeSessions.attendantId], references: [attendants.id] }),
}));

// ─── Opportunities ───
export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  user: one(users, { fields: [opportunities.userId], references: [users.id] }),
  client: one(clients, { fields: [opportunities.clientId], references: [clients.id] }),
  tasks: many(tasks),
  interactions: many(interactions),
}));

// ─── Tasks ───
export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  opportunity: one(opportunities, { fields: [tasks.opportunityId], references: [opportunities.id] }),
}));

// ─── Interactions ───
export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(users, { fields: [interactions.userId], references: [users.id] }),
  client: one(clients, { fields: [interactions.clientId], references: [clients.id] }),
  opportunity: one(opportunities, { fields: [interactions.opportunityId], references: [opportunities.id] }),
}));

// ─── Audio Recordings ───
export const audioRecordingsRelations = relations(audioRecordings, ({ one }) => ({
  user: one(users, { fields: [audioRecordings.userId], references: [users.id] }),
  client: one(clients, { fields: [audioRecordings.clientId], references: [clients.id] }),
  interaction: one(interactions, { fields: [audioRecordings.interactionId], references: [interactions.id] }),
}));

// ─── WhatsApp Messages ───
export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  user: one(users, { fields: [whatsappMessages.userId], references: [users.id] }),
  client: one(clients, { fields: [whatsappMessages.clientId], references: [clients.id] }),
  attendant: one(attendants, { fields: [whatsappMessages.attendantId], references: [attendants.id] }),
}));

// ─── Settings ───
export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, { fields: [settings.userId], references: [users.id] }),
}));

// ─── Media Audios ───
export const mediaAudiosRelations = relations(mediaAudios, ({ one }) => ({
  user: one(users, { fields: [mediaAudios.userId], references: [users.id] }),
}));

// ─── Media Files ───
export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  user: one(users, { fields: [mediaFiles.userId], references: [users.id] }),
}));

// ─── Media Documents ───
export const mediaDocumentsRelations = relations(mediaDocuments, ({ one }) => ({
  user: one(users, { fields: [mediaDocuments.userId], references: [users.id] }),
}));

// ─── Media Texts ───
export const mediaTextsRelations = relations(mediaTexts, ({ one }) => ({
  user: one(users, { fields: [mediaTexts.userId], references: [users.id] }),
}));

// ─── Labels ───
export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, { fields: [labels.userId], references: [users.id] }),
  contactLabels: many(contactLabels),
}));

// ─── Contact Labels ───
export const contactLabelsRelations = relations(contactLabels, ({ one }) => ({
  client: one(clients, { fields: [contactLabels.clientId], references: [clients.id] }),
  label: one(labels, { fields: [contactLabels.labelId], references: [labels.id] }),
}));

// ─── Flows ───
export const flowsRelations = relations(flows, ({ one, many }) => ({
  user: one(users, { fields: [flows.userId], references: [users.id] }),
  steps: many(flowSteps),
  executions: many(flowExecutions),
  analytics: many(flowAnalytics),
}));

// ─── Flow Steps ───
export const flowStepsRelations = relations(flowSteps, ({ one, many }) => ({
  flow: one(flows, { fields: [flowSteps.flowId], references: [flows.id] }),
  responses: many(flowResponses),
}));

// ─── Send Counters ───
export const sendCountersRelations = relations(sendCounters, ({ one }) => ({
  user: one(users, { fields: [sendCounters.userId], references: [users.id] }),
}));

// ─── Flow Executions ───
export const flowExecutionsRelations = relations(flowExecutions, ({ one, many }) => ({
  flow: one(flows, { fields: [flowExecutions.flowId], references: [flows.id] }),
  client: one(clients, { fields: [flowExecutions.clientId], references: [clients.id] }),
  responses: many(flowResponses),
}));

// ─── Flow Responses ───
export const flowResponsesRelations = relations(flowResponses, ({ one }) => ({
  execution: one(flowExecutions, { fields: [flowResponses.flowExecutionId], references: [flowExecutions.id] }),
  step: one(flowSteps, { fields: [flowResponses.flowStepId], references: [flowSteps.id] }),
  client: one(clients, { fields: [flowResponses.clientId], references: [clients.id] }),
}));

// ─── Flow Analytics ───
export const flowAnalyticsRelations = relations(flowAnalytics, ({ one }) => ({
  flow: one(flows, { fields: [flowAnalytics.flowId], references: [flows.id] }),
  user: one(users, { fields: [flowAnalytics.userId], references: [users.id] }),
}));
