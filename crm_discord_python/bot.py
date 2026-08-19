import os
import asyncio
import logging
import discord
from discord.ext import commands
import config

# Configura o sistema de logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Configura os Intents do Discord
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=commands.DefaultHelpCommand())

@bot.event
async def on_ready():
    logging.info("═════════════════════════════════════════════════════════")
    logging.info(f"🤖 Bot do Discord Conectado com Sucesso: {bot.user.name} ({bot.user.id})")
    logging.info(f"📊 Servidores Conectados: {len(bot.guilds)}")
    logging.info("═════════════════════════════════════════════════════════")
    await bot.change_presence(activity=discord.Game(name="CRM Project ES | !help"))

async def load_cogs():
    """Carrega dinamicamente todas as Cogs presentes na pasta cogs/."""
    cogs_dir = os.path.join(os.path.dirname(__file__), "cogs")
    for filename in os.listdir(cogs_dir):
        if filename.endswith(".py") and not filename.startswith("__"):
            cog_name = f"cogs.{filename[:-3]}"
            try:
                await bot.load_extension(cog_name)
                logging.info(f"✅ Cog carregada com sucesso: {cog_name}")
            except Exception as e:
                logging.error(f"❌ Falha ao carregar a cog {cog_name}: {e}")

async def main():
    async with bot:
        await load_cogs()
        token = config.DISCORD_TOKEN
        if not token:
            logging.warning("⚠️ DISCORD_BOT_TOKEN não definido no arquivo .env!")
            logging.info("👉 Adicione o seu token em crm_discord_python/.env e inicie novamente com: python bot.py")
            return
        await bot.start(token)

if __name__ == "__main__":
    asyncio.run(main())
