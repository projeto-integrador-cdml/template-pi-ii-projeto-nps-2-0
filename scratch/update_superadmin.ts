import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, getUserByEmail, useJsonDb } from "../server/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_JSON_PATH = path.resolve(__dirname, "../db.json");

async function run() {
  console.log("Updating superadmin credentials...");
  const newEmail = "jose.alves@sempreceub.com";
  const newPass = "exemplo123";
  const hashedPassword = await bcrypt.hash(newPass, 10);

  // Update in JSON DB first
  console.log("[JSON DB] Updating user in db.json...");
  if (fs.existsSync(DB_JSON_PATH)) {
    const raw = fs.readFileSync(DB_JSON_PATH, "utf-8");
    const json = JSON.parse(raw);
    if (json.users && Array.isArray(json.users)) {
      const adminUser = json.users.find((u: any) => u.id === 1 || u.role === "admin");
      if (adminUser) {
        adminUser.email = newEmail;
        adminUser.password = hashedPassword;
        fs.writeFileSync(DB_JSON_PATH, JSON.stringify(json, null, 2));
        console.log("✅ Updated user in db.json to:", adminUser.email);
      }
    }
  }

  // Update in MySQL DB
  console.log("[MySQL DB] Attempting connection to Aiven MySQL...");
  try {
    const db = await getDb();
    if (db && !useJsonDb) {
      await db.execute(sql`
        UPDATE users 
        SET email = ${newEmail}, password = ${hashedPassword} 
        WHERE id = 1 OR role = 'admin' OR email = 'exemplo@gmail.com'
      `);
      console.log("✅ Updated user in Aiven MySQL DB to:", newEmail);

      const user = await getUserByEmail(newEmail);
      console.log("Verified MySQL User:", {
        id: user?.id,
        name: user?.name,
        email: user?.email,
      });
      const valid = await bcrypt.compare(newPass, user!.password!);
      console.log(`MySQL Password check for "${newPass}":`, valid ? "✅ SUCCESS" : "❌ FAILED");
    } else {
      console.log("MySQL connection offline/falling back to JSON DB. JSON DB is updated!");
    }
  } catch (err: any) {
    console.log("MySQL update warning:", err.message);
  }

  console.log("Superadmin credentials update complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
