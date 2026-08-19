import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { commands } from './commands/crm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── 1. Iniciar o servidor Express/tRPC (API do site) em background ───────────
console.log('[CRM Bot] 🚀 Iniciando servidor API (Express + tRPC) na porta', process.env.PORT || '26653', '...');

const apiProcess = spawn('node', ['start.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: ROOT,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '26653',
  },
});

apiProcess.on('error', (err) => console.error('[API Server] Erro ao iniciar:', err));
apiProcess.on('exit', (code) => {
  console.warn('[API Server] ⚠️ Encerrou com código:', code);
});

// ─── 2. Iniciar o Bot do Discord ───────────────────────────────────────────────
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
  console.log(`[Discord Bot] 🤖 Bot conectado: ${c.user.tag}`);
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
    console.error(`[Discord Bot] ❌ Erro no comando !${commandName}:`, error);
    await message.reply('❌ Ocorreu um erro ao executar o comando. Tente novamente.');
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token || token === 'COLE_O_TOKEN_DO_SEU_BOT_DO_DISCORD_AQUI') {
  console.warn('[Discord Bot] ⚠️  DISCORD_BOT_TOKEN não configurado no .env — bot Discord não iniciado.');
  console.log('[Discord Bot] ℹ️  Apenas o servidor API está rodando.');
} else {
  client.login(token).catch(console.error);
}
