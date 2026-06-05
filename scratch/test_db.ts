import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database connection could not be established");
      return;
    }
    console.log("Database connected!");
    const result = await db.execute(sql`SHOW TABLES`);
    console.log("Tables in database:", JSON.stringify(result));
  } catch (err) {
    console.error("Error running query:", err);
  }
}

main();
