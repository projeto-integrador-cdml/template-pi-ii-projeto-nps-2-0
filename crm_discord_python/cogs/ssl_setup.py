import os
import subprocess
import logging
from discord.ext import commands

# Certs ficam dentro da própria pasta do bot (diretório gravável no container da Blaze Host)
BOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CERTS_DIR = os.path.join(BOT_DIR, "certs")
CERT_PATH = os.path.join(CERTS_DIR, "cert.pem")
KEY_PATH = os.path.join(CERTS_DIR, "key.pem")

class SSLSetup(commands.Cog):
    """Cog que verifica e gera automaticamente o certificado SSL para o servidor HTTPS (executa apenas uma vez)."""

    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
        """Verifica e gera o certificado SSL ao iniciar o bot, se ainda não existir."""
        cert_exists = os.path.isfile(CERT_PATH) and os.path.isfile(KEY_PATH)

        if cert_exists:
            logging.info("[SSL Setup] ✅ Certificado SSL já existe em certs/ — nenhuma ação necessária.")
            return

        logging.info("[SSL Setup] 🔒 Certificado SSL não encontrado. Gerando automaticamente...")

        try:
            os.makedirs(CERTS_DIR, exist_ok=True)

            result = subprocess.run(
                [
                    "openssl", "req", "-x509",
                    "-newkey", "rsa:2048",
                    "-keyout", KEY_PATH,
                    "-out", CERT_PATH,
                    "-days", "365",
                    "-nodes",
                    "-subj", "/CN=sd-us1.blazebr.com"
                ],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                logging.info("[SSL Setup] ✅ Certificado SSL gerado com sucesso em certs/cert.pem e certs/key.pem!")
                logging.info("[SSL Setup] 🔄 Reinicie o servidor Node.js (node start.js) para ativar HTTPS.")
            else:
                logging.error(f"[SSL Setup] ❌ Falha ao gerar certificado SSL: {result.stderr}")
                logging.warning("[SSL Setup] ⚠️  Gere manualmente com: openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj '/CN=sd-us1.blazebr.com'")

        except FileNotFoundError:
            logging.error("[SSL Setup] ❌ 'openssl' não encontrado no sistema. Instale com: apt install openssl")
        except subprocess.TimeoutExpired:
            logging.error("[SSL Setup] ❌ Timeout ao gerar o certificado SSL.")
        except Exception as e:
            logging.error(f"[SSL Setup] ❌ Erro inesperado: {e}")

async def setup(bot):
    await bot.add_cog(SSLSetup(bot))
