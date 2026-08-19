import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { commands } from './commands/crm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Localiza a raiz do projeto ───────────────────────────────────────────────
// Suporta dois layouts de deploy:
//   1. Blaze Host: só a pasta crm_discord_js/ foi enviada
//      → __dirname = /home/container  (o bot.js está na raiz do container)
//   2. Projeto completo no container
//      → __dirname = /home/container/crm_discord_js
function findProjectRoot() {
  // Verifica se start.js existe no diretório atual ou no pai
  const candidates = [
    __dirname,                        // bot.js está na raiz do projeto
    path.join(__dirname, '..'),       // bot.js está em subpasta
    path.join(__dirname, '..', '..'),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'start.js'))) return dir;
  }
  return null;
}

const projectRoot = findProjectRoot();

// ─── 1. Iniciar o servidor Express/tRPC (API do site) ─────────────────────────
if (projectRoot) {
  console.log(`[CRM Bot] 🚀 Servidor API encontrado em: ${projectRoot}`);
  console.log(`[CRM Bot] 🌐 Iniciando na porta ${process.env.PORT || '26653'}...`);

  const apiProcess = spawn('node', ['start.js'], {
    stdio: 'inherit',
    shell: false,          // sem shell evita warning de segurança
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: process.env.PORT || '26653',
    },
  });

  apiProcess.on('error', (err) => console.error('[API Server] ❌ Erro ao iniciar:', err.message));
  apiProcess.on('exit', (code) => {
    if (code !== 0) console.warn(`[API Server] ⚠️ Encerrou com código: ${code}`);
  });
} else {
  console.warn('[CRM Bot] ⚠️  start.js não encontrado — certifique-se de que o projeto completo está no container.');
  console.warn('[CRM Bot] ℹ️  Continuando apenas com o Bot Discord...');
}

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
