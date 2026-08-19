import logging
import mysql.connector
from discord.ext import commands, tasks
import config

class KeepAliveCog(commands.Cog):
    """Cog responsável por manter a conexão do Aiven Cloud MySQL ativa (Keep-Alive) a cada 3 horas."""

    def __init__(self, bot):
        self.bot = bot
        self.keep_alive_loop.start()

    def cog_unload(self):
        self.keep_alive_loop.cancel()

    @tasks.loop(hours=3)
    async def keep_alive_loop(self):
        """Executa SELECT 1 no Aiven Cloud MySQL a cada 3 horas para evitar desconexão por inatividade."""
        try:
            conn = mysql.connector.connect(
                host=config.MYSQL_HOST,
                port=config.MYSQL_PORT,
                user=config.MYSQL_USER,
                password=config.MYSQL_PASSWORD,
                database=config.MYSQL_DATABASE,
                ssl_disabled=False
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            conn.close()
            logging.info("[Keep-Alive] 🟢 Conexão com Aiven Cloud MySQL renovada com sucesso (Heartbeat 3h)!")
        except Exception as e:
            logging.error(f"[Keep-Alive] ❌ Erro ao enviar heartbeat para Aiven Cloud MySQL: {e}")

    @keep_alive_loop.before_loop
    async def before_keep_alive(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(KeepAliveCog(bot))
