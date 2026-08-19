import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'projectes-projectes.l.aivencloud.com',
  port: parseInt(process.env.MYSQL_PORT || '25241'),
  user: process.env.MYSQL_USER || 'avnadmin',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

// Keep-Alive a cada 3 horas para manter Aiven MySQL ativo
const THREE_HOURS = 3 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[Keep-Alive] 🟢 Aiven MySQL heartbeat (3h) OK!');
  } catch (e) {
    console.warn('[Keep-Alive] ⚠️ Heartbeat falhou:', e.message);
  }
}, THREE_HOURS);

export async function fetchRecentClients(limit = 5) {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone, company, status FROM clients ORDER BY id DESC LIMIT ?',
    [limit]
  );
  return rows;
}

export async function fetchStats() {
  const [[{ total: clients }]] = await pool.query('SELECT COUNT(*) AS total FROM clients');
  const [[{ total: opportunities }]] = await pool.query('SELECT COUNT(*) AS total FROM opportunities');
  const [[{ total: interactions }]] = await pool.query('SELECT COUNT(*) AS total FROM interactions');
  return { clients, opportunities, interactions };
}

export async function createClient(name, email, phone = null, company = null) {
  const [result] = await pool.query(
    'INSERT INTO clients (userId, name, email, phone, company, status, createdAt, updatedAt) VALUES (1, ?, ?, ?, ?, "lead", NOW(), NOW())',
    [name, email, phone, company]
  );
  return result.insertId;
}
