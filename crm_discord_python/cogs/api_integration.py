import aiohttp
import mysql.connector
from discord.ext import commands
import config

class APIIntegration(commands.Cog):
    """Cog responsável pela comunicação assíncrona com o CRM e banco Aiven MySQL."""

    def __init__(self, bot):
        self.bot = bot

    def get_db_connection(self):
        """Cria conexão síncrona com o banco Aiven Cloud MySQL via SSL."""
        return mysql.connector.connect(
            host=config.MYSQL_HOST,
            port=config.MYSQL_PORT,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            database=config.MYSQL_DATABASE,
            ssl_disabled=False
        )

    async def fetch_recent_clients(self, limit: int = 5):
        """Busca os últimos clientes cadastrados diretamente no MySQL Aiven."""
        conn = self.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, phone, status, company FROM clients ORDER BY id DESC LIMIT %s", (limit,))
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results

    async def fetch_crm_stats(self):
        """Busca contagens gerais do CRM (clientes, oportunidades, interações)."""
        conn = self.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) as total FROM clients")
        total_clients = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM opportunities")
        total_opps = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) as total FROM interactions")
        total_interactions = cursor.fetchone()['total']

        cursor.close()
        conn.close()
        return {
            "clients": total_clients,
            "opportunities": total_opps,
            "interactions": total_interactions
        }

    async def create_client(self, name: str, email: str, phone: str = None, company: str = None):
        """Cadastra um novo cliente no CRM."""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO clients (userId, name, email, phone, company, status, createdAt, updatedAt) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
            (1, name, email, phone, company, 'lead')
        )
        conn.commit()
        client_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return client_id

async def setup(bot):
    await bot.add_cog(APIIntegration(bot))
