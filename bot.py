import discord
import os
from pathlib import Path
from dotenv import load_dotenv
import asyncio

# --- Importações dos nossos módulos ---
# A lógica principal da conversa agora está em bot_logic
from modules.bot_logic import processar_mensagem

# --- Configuração Inicial ---
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
intents.dm_messages = True

bot = discord.Client(intents=intents)

# --- Gerenciamento de Estado ---
# Cada plataforma (Discord, Web) gerencia seu próprio dicionário de estados
discord_user_states = {}

# --- Eventos do Bot ---

@bot.event
async def on_ready():
    """Evento disparado quando o bot está online e pronto."""
    print(f'S.A.G.E. (Discord) está online! Logado como {bot.user}')

@bot.event
async def on_message(message):
    """Evento disparado para cada mensagem que o bot recebe."""
    # Ignora mensagens do próprio bot
    if message.author == bot.user:
        return

    # Processa apenas mensagens que começam com '!' em canais ou qualquer mensagem em DMs
    if isinstance(message.channel, discord.DMChannel) or message.content.startswith('!'):
        user_id = str(message.author.id)
        
        # Remove o '!' do início se for um comando
        message_text = message.content
        if message.content.startswith('!'):
            message_text = message.content[1:]

        # Chama a lógica de bot compartilhada para processar a mensagem
        bot_responses = await processar_mensagem(user_id, discord_user_states, message_text)

        # Envia as respostas para o usuário
        for response in bot_responses:
            # Em DMs, envia diretamente. Em canais, envia para o autor.
            if isinstance(message.channel, discord.DMChannel):
                await message.channel.send(response)
            else:
                await message.author.send(response)
        
        # Reação para feedback visual no canal público, se aplicável
        if not isinstance(message.channel, discord.DMChannel):
            await message.add_reaction("✅")


# --- Execução do Bot ---
if __name__ == "__main__":
    if not DISCORD_TOKEN or DISCORD_TOKEN == "SEU_TOKEN_AQUI":
        print("ERRO: O token do Discord não foi encontrado no arquivo .env")
    else:
        try:
            bot.run(DISCORD_TOKEN)
        except discord.errors.LoginFailure:
            print("ERRO: O token do Discord fornecido é inválido.")
        except Exception as e:
            print(f"Ocorreu um erro inesperado ao iniciar o bot do Discord: {e}")
