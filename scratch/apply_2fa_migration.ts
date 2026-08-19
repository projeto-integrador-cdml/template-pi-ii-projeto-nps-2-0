import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("Applying 2FA & PasswordResets migration to Aiven Cloud MySQL...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to get DB connection!");
    process.exit(1);
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`passwordResets\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`code\` varchar(6) NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`used\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`passwordResets_id\` PRIMARY KEY(\`id\`)
    )
  `);

  try {
    await db.execute(sql`ALTER TABLE \`users\` ADD \`twoFactorSecret\` text`);
  } catch (e: any) {
    console.log("twoFactorSecret column already exists or error ignored:", e.message);
  }

  try {
    await db.execute(sql`ALTER TABLE \`users\` ADD \`twoFactorEnabled\` boolean DEFAULT false NOT NULL`);
  } catch (e: any) {
    console.log("twoFactorEnabled column already exists or error ignored:", e.message);
  }

  try {
    await db.execute(sql`CREATE INDEX \`idx_passwordResets_email_code\` ON \`passwordResets\` (\`email\`,\`code\`)`);
  } catch (e: any) {
    console.log("Index already exists or error ignored:", e.message);
  }

  console.log("✅ 2FA & PasswordResets migration applied successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
