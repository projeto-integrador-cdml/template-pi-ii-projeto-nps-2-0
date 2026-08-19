import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
CRM_API_URL = os.getenv("CRM_API_URL", "http://localhost:3000")

MYSQL_HOST = os.getenv("MYSQL_HOST", "projectes-projectes.l.aivencloud.com")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "25241"))
MYSQL_USER = os.getenv("MYSQL_USER", "avnadmin")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "defaultdb")
