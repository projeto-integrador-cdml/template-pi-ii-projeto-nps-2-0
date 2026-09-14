import "dotenv/config";
import { migrateChannels } from "../server/channels/migration";
migrateChannels().catch(error => {
  console.error(
    "Migração não concluída:",
    error.code || "confira a conexão e as permissões do banco"
  );
  process.exitCode = 1;
});
