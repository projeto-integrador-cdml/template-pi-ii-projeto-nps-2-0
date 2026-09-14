import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs/promises";

// Run explicitly via migrate.js or the opt-in setup.js hosting entry point.
// Additive and repeatable; it never removes legacy settings or chat history.
export async function migrateChannels() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
  const url = new URL(process.env.DATABASE_URL);
  const caPath = process.env.DATABASE_SSL_CA_PATH || "certs/aiven-ca.pem";
  let ca = process.env.DATABASE_SSL_CA_PEM?.replace(/\\n/g, "\n").trim();
  if (!ca) {
    try {
      ca = await fs.readFile(caPath, "utf8");
    } catch (error: any) {
      if (process.env.DATABASE_SSL_CA_PATH || error.code !== "ENOENT") {
        throw new Error("Nao foi possivel ler o certificado CA do banco. Confira DATABASE_SSL_CA_PATH.");
      }
    }
  }
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectTimeout: 10000,
    ssl: {
      ...(ca ? { ca } : {}),
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    },
  }).catch((error: any) => {
    if (["HANDSHAKE_SSL_ERROR", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_HAS_EXPIRED"].includes(error.code)) {
      throw new Error("A conexao TLS com o MySQL falhou. Baixe o certificado CA do seu servico Aiven, salve em certs/aiven-ca.pem e tente novamente. Esse certificado e diferente do cert.pem da API.");
    }
    throw error;
  });
  try {
    await connection.execute(`CREATE TABLE IF NOT EXISTS companyChannels (
      id varchar(36) PRIMARY KEY, companyId int NOT NULL,
      type varchar(16) NOT NULL, externalId varchar(191) NOT NULL, socialSlot varchar(64) NULL,
      name varchar(150) NOT NULL, identifier varchar(191) NOT NULL, pageId varchar(191) NULL,
      businessAccountId varchar(191) NULL, tokenEncrypted text NOT NULL, status varchar(32) NOT NULL,
      lastVerifiedAt timestamp NULL, lastWebhookAt timestamp NULL,
      UNIQUE KEY uq_channel_identity (type, externalId), UNIQUE KEY uq_company_social_slot (socialSlot),
      KEY idx_channel_company (companyId),
      CONSTRAINT companyChannels_companyId_users_id_fk FOREIGN KEY (companyId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS channelResourceClaims (
      resource varchar(191) PRIMARY KEY, companyId int NOT NULL,
      CONSTRAINT channelResourceClaims_companyId_users_id_fk FOREIGN KEY (companyId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS channelAuthFlows (
      id varchar(64) PRIMARY KEY, companyId int NOT NULL, payload text NOT NULL, expiresAt timestamp NOT NULL,
      CONSTRAINT channelAuthFlows_companyId_users_id_fk FOREIGN KEY (companyId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    for (const [table, column, definition] of [
      ["clients", "channelId", "varchar(36) NULL"],
      ["clients", "externalContactId", "varchar(191) NULL"],
      ["whatsappMessages", "channelId", "varchar(36) NULL"],
    ]) {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, column]
      );
      if (!rows.length)
        await connection.execute(
          `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
        );
    }
    for (const [table, index, columns] of [
      ["clients", "uq_client_channel_contact", "channelId, externalContactId"],
      ["whatsappMessages", "uq_channel_message", "channelId, externalId"],
    ]) {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [table, index]
      );
      if (!rows.length)
        await connection.execute(
          `ALTER TABLE \`${table}\` ADD UNIQUE KEY \`${index}\` (${columns})`
        );
    }
    // Keep Drizzle's journal aligned so a future db:push does not recreate these tables.
    const migrationHash =
      process.env.CHANNEL_MIGRATION_HASH ||
      crypto
        .createHash("sha256")
        .update(await fs.readFile("drizzle/0002_company_channels.sql", "utf8"))
        .digest("hex");
    await connection.execute(
      "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)"
    );
    const [recorded] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM __drizzle_migrations WHERE created_at = ? LIMIT 1",
      [1789389344986]
    );
    if (!recorded.length)
      await connection.execute(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [migrationHash, 1789389344986]
      );
    console.log(
      "Migração de canais concluída. Os registros e históricos antigos foram preservados."
    );
  } finally {
    await connection.end();
  }
}
