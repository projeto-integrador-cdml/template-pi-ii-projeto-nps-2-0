import "dotenv/config";
import { loadBackend } from "./server.js";

// Hosting panels can select this file as MAIN_FILE without providing a shell.
// The additive migration is repeatable. Start the bot only after it succeeds.
try {
  console.log("[Setup] Preparando as tabelas de canais antes de iniciar o bot...");
  const backend = await loadBackend();
  await backend.migrateChannels();
  console.log("[Setup] Banco atualizado. Iniciando o bot e a API...");
  await import("./bot.js");
} catch (error) {
  console.error("[Setup] Inicializacao interrompida:", error.code || error.message);
  process.exitCode = 1;
}
