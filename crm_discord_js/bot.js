import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { commands } from './commands/crm.js';
import { startApiServer } from './server.js';

// ─── 1. Iniciar o servidor API (Express + tRPC) ───────────────────────────────
startApiServer();

// ─── 2. Iniciar o Bot Discord ──────────────────────────────────────────────────
const PREFIX = '!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`[Discord Bot] 🤖 Conectado como: ${c.user.tag}`);
  console.log(`[Discord Bot] 📡 Servidores: ${c.guilds.cache.size}`);
  console.log('═══════════════════════════════════════════════════');
  c.user.setActivity('CRM Project | !help');
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = commands[commandName];
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`[Discord Bot] ❌ Erro no comando !${commandName}:`, error.message);
    await message.reply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token || token.startsWith('COLE_O_TOKEN')) {
  console.warn('[Discord Bot] ⚠️  DISCORD_BOT_TOKEN não configurado — bot Discord não iniciado.');
} else {
  client.login(token).catch(console.error);
}
