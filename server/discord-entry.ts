export { createApp } from "./_core/app";
export { migrateChannels } from "./channels/migration";
import { getDb } from "./db";

export async function initializeDatabase() {
  console.log("[Database] Verificando conexao MySQL antes de iniciar a API...");
  if (!await getDb()) throw new Error("Configure o MySQL para iniciar o backend do bot.");
  console.log("[Database] Heartbeat automatico habilitado a cada 3 horas.");
}
