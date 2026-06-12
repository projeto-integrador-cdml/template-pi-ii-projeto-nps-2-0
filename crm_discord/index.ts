import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { getDb } from "../server/db";
import { clients, tasks } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// =============================================================================
// 1. Inicializar e Iniciar o Servidor Express/tRPC do CRM
// =============================================================================
console.log("[CRM Discord] Inicializando o Servidor Backend Express...");
// Ao importar o arquivo de entrada do server, ele iniciará o servidor HTTP automaticamente
import("../server/_core/index");

// =============================================================================
// 2. Configuração do Bot do Discord
// =============================================================================
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  console.warn("[CRM Discord] DISCORD_TOKEN não está definido no .env. O bot do Discord não será iniciado.");
} else {
  const botClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // Comandos Slash
  const commands = [
    new SlashCommandBuilder()
      .setName("crmstatus")
      .setDescription("Verifica o status do CRM e do Servidor API"),
    new SlashCommandBuilder()
      .setName("crmclientes")
      .setDescription("Lista os últimos clientes cadastrados no CRM"),
    new SlashCommandBuilder()
      .setName("crmtarefas")
      .setDescription("Lista as tarefas pendentes no CRM"),
  ].map((command) => command.toJSON());

  // Registrar Comandos no Discord
  const rest = new REST({ version: "10" }).setToken(token);

  (async () => {
    try {
      if (clientId) {
        console.log("[CRM Discord] Iniciando o registro dos comandos slash...");
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("[CRM Discord] Comandos slash registrados com sucesso globalmente!");
      } else {
        console.warn("[CRM Discord] DISCORD_CLIENT_ID não configurado. Comandos slash não foram registrados.");
      }
    } catch (error) {
      console.error("[CRM Discord] Erro ao registrar comandos slash:", error);
    }
  })();

  // Evento Ready
  botClient.once("ready", () => {
    console.log(`[CRM Discord] Bot online e conectado como: ${botClient.user?.tag}`);
  });

  // Interação de Comandos
  botClient.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      // ─── Comando /crmstatus ───
      if (commandName === "crmstatus") {
        await interaction.reply({
          content: `✅ **Servidor CRM Online!**\n🤖 **Bot Discord:** Conectado como ${botClient.user?.tag}\n🌐 **Porta da API:** ${process.env.PORT || 3000}`,
          ephemeral: true,
        });
      }

      // ─── Comando /crmclientes ───
      else if (commandName === "crmclientes") {
        await interaction.deferReply({ ephemeral: true });
        const db = await getDb();
        if (!db) {
          await interaction.editReply("❌ Conectando ao banco de dados...");
          return;
        }

        const clientList = await db.select().from(clients).limit(5);

        if (clientList.length === 0) {
          await interaction.editReply("📭 Nenhum cliente cadastrado no CRM ainda.");
          return;
        }

        let replyText = "📂 **Últimos 5 Clientes Cadastrados:**\n";
        clientList.forEach((cli) => {
          replyText += `• **${cli.name}** | Empresa: ${cli.company || "N/A"} | Cel: ${cli.phone || "N/A"}\n`;
        });

        await interaction.editReply(replyText);
      }

      // ─── Comando /crmtarefas ───
      else if (commandName === "crmtarefas") {
        await interaction.deferReply({ ephemeral: true });
        const db = await getDb();
        if (!db) {
          await interaction.editReply("❌ Conectando ao banco de dados...");
          return;
        }

        const taskList = await db
          .select()
          .from(tasks)
          .where(eq(tasks.completed, false))
          .limit(5);

        if (taskList.length === 0) {
          await interaction.editReply("🎉 Nenhuma tarefa pendente encontrada!");
          return;
        }

        let replyText = "📝 **Próximas 5 Tarefas Pendentes:**\n";
        taskList.forEach((task) => {
          const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Sem data";
          replyText += `• [${task.priority.toUpperCase()}] **${task.title}** | Vence em: ${dateStr}\n`;
        });

        await interaction.editReply(replyText);
      }
    } catch (err) {
      console.error(`[CRM Discord] Erro ao executar comando ${commandName}:`, err);
      if (interaction.deferred) {
        await interaction.editReply("❌ Ocorreu um erro interno ao processar este comando.");
      } else {
        await interaction.reply({ content: "❌ Ocorreu um erro interno ao processar este comando.", ephemeral: true });
      }
    }
  });

  botClient.login(token).catch((err) => {
    console.error("[CRM Discord] Falha no login do bot Discord:", err);
  });
}
