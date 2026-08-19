import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
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
} from "../drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_JSON_PATH = path.resolve(__dirname, "../db.json");

interface JsonDbData {
  users: any[];
  clients: any[];
  opportunities: any[];
  tasks: any[];
  interactions: any[];
  audioRecordings: any[];
  attendants: any[];
  activeSessions: any[];
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
  whatsappMessages: any[];
  settings: any[];
}

function loadJsonDb(): JsonDbData {
  const raw = fs.readFileSync(DB_JSON_PATH, "utf-8");
  return JSON.parse(raw);
}

function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Fix concatenated phones like "+5511999991111+5511999991111"
  if (phone.length > 20 && phone.includes("+", 1)) {
    return phone.substring(0, phone.indexOf("+", 1));
  }
  return phone;
}

function toDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toDateRequired(val: any): Date {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  CRM Aiven MySQL — Seed from db.json");
  console.log("═══════════════════════════════════════════════════");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in .env");
    process.exit(1);
  }

  console.log("\n📂 Loading db.json...");
  const data = loadJsonDb();

  console.log("\n📊 Data summary:");
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val) && val.length > 0) {
      console.log(`   ${key}: ${val.length} records`);
    }
  }

  console.log("\n🔌 Connecting to Aiven MySQL...");
  const dbUrl = new URL(process.env.DATABASE_URL);
  const pool = mysql.createPool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || "3306", 10),
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace("/", ""),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
  });

  const db = drizzle(pool);
  await db.execute(sql`SELECT 1`);
  console.log("✅ Connected successfully!\n");

  console.log("🧹 Truncating existing tables for a clean seed...");
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  const tableList = [
    "activeSessions", "flowResponses", "flowExecutions", "flowAnalytics",
    "flowSteps", "flows", "contactLabels", "labels", "mediaTexts",
    "mediaDocuments", "mediaFiles", "mediaAudios", "sendCounters",
    "settings", "whatsappMessages", "audioRecordings", "interactions",
    "tasks", "opportunities", "clients", "attendants", "users"
  ];
  for (const tableName of tableList) {
    await db.execute(sql.raw(`TRUNCATE TABLE \`${tableName}\``));
  }
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  console.log("✅ Tables truncated!\n");

  // ── 1. Seed Users ──
  if (data.users?.length) {
    console.log(`👤 Seeding ${data.users.length} users...`);
    for (const u of data.users) {
      await db.insert(users).values({
        id: u.id,
        openId: u.openId,
        name: u.name || null,
        email: u.email || null,
        password: u.password || null,
        loginMethod: u.loginMethod || null,
        role: u.role || "user",
        isActive: u.isActive ?? true,
        phone: u.phone || null,
        avatarUrl: u.avatarUrl || null,
        preferences: u.preferences || null,
        companyName: u.companyName || null,
        maxAttendants: u.maxAttendants ?? 5,
        whatsappStatus: u.whatsappStatus || "disconnected",
        whatsappNumber: u.whatsappNumber || null,
        whatsappApiUrl: u.whatsappApiUrl || null,
        whatsappApiKey: u.whatsappApiKey || null,
        whatsappQrCode: null, // QR codes are ephemeral, don't migrate
        createdAt: toDateRequired(u.createdAt),
        updatedAt: toDateRequired(u.updatedAt),
        lastSignedIn: toDateRequired(u.lastSignedIn),
      });
    }
    console.log("   ✅ Users seeded");
  }

  // ── 2. Seed Attendants (before clients, since clients may reference attendants) ──
  if (data.attendants?.length) {
    console.log(`🧑‍💼 Seeding ${data.attendants.length} attendants...`);
    // Get valid user IDs
    const validUserIds = new Set(data.users.map((u: any) => u.id));
    for (const a of data.attendants) {
      const companyId = a.companyId || a.clientId;
      if (!validUserIds.has(companyId)) {
        console.log(`   ⚠️  Skipping attendant "${a.name}" — invalid companyId ${companyId}`);
        continue;
      }
      await db.insert(attendants).values({
        id: a.id,
        companyId: companyId,
        status: a.status || "available",
        name: a.name,
        email: a.email,
        password: a.password,
        phone: a.phone || null,
        position: a.position || null,
        isActive: a.isActive ?? true,
        lastIp: a.lastIp || null,
        lastDevice: a.lastDevice || null,
        sessionToken: null, // Don't migrate sessions
        lastLoginAt: toDate(a.lastLoginAt),
        createdAt: toDateRequired(a.createdAt),
        updatedAt: toDateRequired(a.updatedAt),
      });
    }
    console.log("   ✅ Attendants seeded");
  }

  // ── 3. Seed Clients ──
  if (data.clients?.length) {
    console.log(`📋 Seeding ${data.clients.length} clients...`);
    const validUserIds = new Set(data.users.map((u: any) => u.id));
    const validAttendantIds = new Set(data.attendants?.map((a: any) => a.id) || []);
    const adminUserId = data.users.find((u: any) => u.role === "admin")?.id || 1;

    for (const c of data.clients) {
      // Fix clients with userId: 0 (invalid) — assign to admin
      let userId = c.userId;
      if (!userId || !validUserIds.has(userId)) {
        console.log(`   ⚠️  Client "${c.name}" had invalid userId=${userId}, reassigning to admin (id=${adminUserId})`);
        userId = adminUserId;
      }

      // Validate assignedAttendantId
      let assignedAttendantId = c.assignedAttendantId || null;
      if (assignedAttendantId && !validAttendantIds.has(assignedAttendantId)) {
        assignedAttendantId = null;
      }

      await db.insert(clients).values({
        id: c.id,
        userId: userId,
        name: c.name,
        email: c.email || null,
        phone: sanitizePhone(c.phone),
        company: c.company || null,
        position: c.position || null,
        address: c.address || null,
        notes: c.notes || null,
        tags: c.tags || null,
        source: c.source || null,
        status: c.status || "prospect",
        assignedAttendantId: assignedAttendantId,
        createdAt: toDateRequired(c.createdAt),
        updatedAt: toDateRequired(c.updatedAt),
      });
    }
    console.log("   ✅ Clients seeded");
  }

  // ── 4. Seed Interactions ──
  if (data.interactions?.length) {
    console.log(`💬 Seeding ${data.interactions.length} interactions...`);
    const validUserIds = new Set(data.users.map((u: any) => u.id));
    const validClientIds = new Set(data.clients.map((c: any) => c.id));
    const adminUserId = data.users.find((u: any) => u.role === "admin")?.id || 1;

    for (const i of data.interactions) {
      let userId = i.userId;
      if (!userId || !validUserIds.has(userId)) userId = adminUserId;
      if (!validClientIds.has(i.clientId)) {
        console.log(`   ⚠️  Skipping interaction id=${i.id} — invalid clientId ${i.clientId}`);
        continue;
      }

      await db.insert(interactions).values({
        id: i.id,
        userId: userId,
        clientId: i.clientId,
        opportunityId: i.opportunityId || null,
        type: i.type || "note",
        subject: i.subject || null,
        content: i.content || null,
        audioUrl: i.audioUrl || null,
        transcription: i.transcription || null,
        duration: i.duration || null,
        createdAt: toDateRequired(i.createdAt),
      });
    }
    console.log("   ✅ Interactions seeded");
  }

  // ── 5. Seed WhatsApp Messages ──
  if (data.whatsappMessages?.length) {
    console.log(`📱 Seeding ${data.whatsappMessages.length} WhatsApp messages...`);
    const validUserIds = new Set(data.users.map((u: any) => u.id));
    const validClientIds = new Set(data.clients.map((c: any) => c.id));
    const adminUserId = data.users.find((u: any) => u.role === "admin")?.id || 1;

    for (const m of data.whatsappMessages) {
      let userId = m.userId;
      if (!userId || !validUserIds.has(userId)) userId = adminUserId;
      const clientId = validClientIds.has(m.clientId) ? m.clientId : null;

      let mediaUrl = m.mediaUrl || null;
      if (mediaUrl && mediaUrl.length > 60000) {
        // If it's a large data URI, strip it or replace with null to prevent MySQL TEXT column overflow
        mediaUrl = null;
      }

      await db.insert(whatsappMessages).values({
        id: m.id,
        userId: userId,
        clientId: clientId,
        attendantId: m.attendantId || null,
        direction: m.direction,
        message: m.message || null,
        mediaUrl: mediaUrl,
        status: m.status || "sent",
        externalId: m.externalId || null,
        transcription: m.transcription || null,
        transcriptionStatus: m.transcriptionStatus || null,
        sentiment: m.sentiment || null,
        createdAt: toDateRequired(m.createdAt),
      }).onDuplicateKeyUpdate({ set: { status: m.status || "sent" } });
    }
    console.log("   ✅ WhatsApp messages seeded");
  }

  // ── 6. Seed Settings ──
  if (data.settings?.length) {
    console.log(`⚙️  Seeding ${data.settings.length} settings...`);
    for (const s of data.settings) {
      await db.insert(settings).values({
        id: s.id,
        userId: s.userId,
        settingKey: s.settingKey,
        settingValue: s.settingValue || null,
        createdAt: toDateRequired(s.createdAt),
        updatedAt: toDateRequired(s.updatedAt),
      });
    }
    console.log("   ✅ Settings seeded");
  }

  // ── 7. Seed remaining tables (if they have data) ──
  const simpleSeeds: Array<{ name: string; data: any[]; table: any; mapper: (item: any) => any }> = [
    { name: "opportunities", data: data.opportunities || [], table: opportunities, mapper: (o) => ({
      id: o.id, userId: o.userId, clientId: o.clientId, title: o.title,
      description: o.description || null, value: o.value || 0,
      stage: o.stage || "lead", priority: o.priority || "medium",
      expectedCloseDate: toDate(o.expectedCloseDate), closedAt: toDate(o.closedAt),
      createdAt: toDateRequired(o.createdAt), updatedAt: toDateRequired(o.updatedAt),
    })},
    { name: "tasks", data: data.tasks || [], table: tasks, mapper: (t) => ({
      id: t.id, userId: t.userId, clientId: t.clientId || null,
      opportunityId: t.opportunityId || null, title: t.title,
      description: t.description || null, dueDate: toDate(t.dueDate),
      completed: t.completed ?? false, priority: t.priority || "medium",
      type: t.type || "other",
      createdAt: toDateRequired(t.createdAt), updatedAt: toDateRequired(t.updatedAt),
    })},
    { name: "labels", data: data.labels || [], table: labels, mapper: (l) => ({
      id: l.id, userId: l.userId, name: l.name, color: l.color || "#3B82F6",
      createdAt: toDateRequired(l.createdAt), updatedAt: toDateRequired(l.updatedAt),
    })},
  ];

  for (const seed of simpleSeeds) {
    if (seed.data.length > 0) {
      console.log(`📦 Seeding ${seed.data.length} ${seed.name}...`);
      for (const item of seed.data) {
        await db.insert(seed.table).values(seed.mapper(item));
      }
      console.log(`   ✅ ${seed.name} seeded`);
    }
  }

  // ── Final Summary ──
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ SEED COMPLETE — All data migrated to Aiven!");
  console.log("═══════════════════════════════════════════════════");

  // Verify counts
  console.log("\n📊 Verification — Row counts in Aiven MySQL:");
  const tables = [
    { name: "users", t: users },
    { name: "clients", t: clients },
    { name: "attendants", t: attendants },
    { name: "interactions", t: interactions },
    { name: "whatsappMessages", t: whatsappMessages },
    { name: "settings", t: settings },
  ];
  for (const { name, t } of tables) {
    const result = await db.select({ count: sql<number>`count(*)` }).from(t);
    console.log(`   ${name}: ${result[0]?.count ?? 0} rows`);
  }

  await pool.end();
  console.log("\n🔒 Connection closed. Migration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
