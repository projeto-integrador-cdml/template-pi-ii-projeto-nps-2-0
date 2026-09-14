import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const migration = await fs.readFile(
  path.join(root, "drizzle/0002_company_channels.sql"),
  "utf8"
);
await build({
  absWorkingDir: root,
  entryPoints: ["server/discord-entry.ts"],
  outfile: "crm_discord_js/backend.cjs",
  platform: "node",
  target: "node22",
  format: "cjs",
  bundle: true,
  packages: "bundle",
  define: {
    "process.env.CHANNEL_MIGRATION_HASH": JSON.stringify(
      crypto.createHash("sha256").update(migration).digest("hex")
    ),
  },
  logLevel: "info",
});
console.log(
  "Backend real empacotado em crm_discord_js/backend.cjs. Envie a pasta crm_discord_js para a hospedagem."
);
