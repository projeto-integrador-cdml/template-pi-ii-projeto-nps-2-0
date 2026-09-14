import "dotenv/config";
import { loadBackend } from "./server.js";

try {
  const backend = await loadBackend();
  await backend.migrateChannels();
} catch (error) {
  console.error("Migração não concluída:", error.code || error.message);
  process.exitCode = 1;
}
