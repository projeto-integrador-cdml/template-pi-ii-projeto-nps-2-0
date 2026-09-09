import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [cols]: any = await conn.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
  console.log("Column definition for 'role':", cols);

  const [users]: any = await conn.query("SELECT id, name, email, role FROM users");
  console.log("Users and their roles:", users);

  await conn.end();
}

main().catch(console.error);
