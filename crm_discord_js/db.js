import mysql from "mysql2/promise";
import "dotenv/config";

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
export const pool = mysql.createPool({
  host: url?.hostname || process.env.MYSQL_HOST || "localhost",
  port: Number(url?.port || process.env.MYSQL_PORT || 3306),
  user: url ? decodeURIComponent(url.username) : process.env.MYSQL_USER,
  password: url ? decodeURIComponent(url.password) : process.env.MYSQL_PASSWORD,
  database: url?.pathname.slice(1) || process.env.MYSQL_DATABASE,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

// Keep-Alive a cada 3 horas para manter Aiven MySQL ativo
const THREE_HOURS = 3 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("[Keep-Alive] 🟢 Aiven MySQL heartbeat (3h) OK!");
  } catch (e) {
    console.warn("[Keep-Alive] ⚠️ Heartbeat falhou:", e.message);
  }
}, THREE_HOURS);

function companyId() {
  const id = Number(process.env.DISCORD_COMPANY_ID);
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Error(
      "Configure a empresa autorizada para os comandos privados do bot."
    );
  return id;
}

export async function fetchRecentClients(limit = 5) {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, company, clientStatus AS status FROM clients WHERE userId = ? ORDER BY id DESC LIMIT ?",
    [companyId(), limit]
  );
  return rows;
}

export async function fetchStats() {
  const id = companyId();
  const [[{ total: clients }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM clients WHERE userId = ?",
    [id]
  );
  const [[{ total: opportunities }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM opportunities WHERE userId = ?",
    [id]
  );
  const [[{ total: interactions }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM interactions WHERE userId = ?",
    [id]
  );
  return { clients, opportunities, interactions };
}

export async function createClient(name, email, phone = null, company = null) {
  const [result] = await pool.query(
    'INSERT INTO clients (userId, name, email, phone, company, clientStatus, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, "prospect", NOW(), NOW())',
    [companyId(), name, email, phone, company]
  );
  return result.insertId;
}
