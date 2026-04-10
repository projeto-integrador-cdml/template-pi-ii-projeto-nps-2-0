import json
import random
import string
import pytz
from pathlib import Path
from datetime import datetime, time, timedelta
from typing import Optional, List, Dict, Any

# --- Importações dos módulos do projeto ---
# Precisamos ajustar os caminhos para importação relativa
from .matchmaking import encontrar_match, carregar_profissionais
from .nlp_analyzer import analisar_feedback, atualizar_perfil_profissional

# --- Constantes e Configurações de Negócio ---
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PACIENTES_FILE_PATH = DATA_DIR / "pacientes.json"
TIMEZONE = pytz.timezone('America/Sao_Paulo')

HORA_INICIO_ATENDIMENTO = time(7, 0)
HORA_FIM_ATENDIMENTO = time(21, 0)
HORA_INICIO_ALMOCO = time(12, 0)
HORA_FIM_ALMOCO = time(14, 0)
DURACAO_CONSULTA_MINUTOS = 60

MESES_PORTUGUES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
}

FORMULARIO_PERGUNTAS = [
    {"key": "especialidade", "texto": "Olá! Bem-vindo(a) ao S.A.G.E. Para começar, qual especialidade você procura?"},
    {"key": "estilo_comunicacao", "texto": "Ótimo. E qual estilo de comunicação você prefere em um profissional? (Digite 'comunicativo' ou 'focado')"},
    {"key": "perfil_idade", "texto": "Entendido. Você prefere um profissional com mais anos de experiência ou um mais jovem e atualizado? (Digite 'senior' ou 'jovem')"},
    {"key": "genero_musical", "texto": "Para finalizar, qual seu gênero musical preferido? (Ex: Rock, Pop, MPB)"}
]

# --- Gerenciamento de Estado e Dados ---
# Este dicionário será gerenciado pelos servidores (web e discord)
# user_states = {} 

def carregar_pacientes():
    if not PACIENTES_FILE_PATH.exists():
        PACIENTES_FILE_PATH.touch()
        return {}
    try:
        with open(PACIENTES_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

def salvar_pacientes(data):
    with open(PACIENTES_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def obter_especialidades_disponiveis():
    profissionais = carregar_profissionais()
    especialidades = set()
    for prof in profissionais:
        for esp in prof.get("especialidade", []):
            especialidades.add(esp)
    return sorted(list(especialidades))

# --- Funções de Lógica de Negócio (Datas e Horários) ---
def parse_data_flexivel(texto_data: str) -> Optional[datetime.date]:
    now = datetime.now(TIMEZONE)
    texto_data = texto_data.lower().replace(" de ", "/")
    for fmt in ["%d/%m/%Y", "%d/%m"]:
        try:
            dt = datetime.strptime(texto_data, fmt)
            if fmt == "%d/%m":
                data_no_ano_atual = dt.replace(year=now.year).date()
                if data_no_ano_atual < now.date():
                    return data_no_ano_atual.replace(year=now.year + 1)
                return data_no_ano_atual
            return dt.date()
        except ValueError:
            continue
    try:
        dia_str, mes_str = texto_data.split('/')
        dia = int(dia_str)
        mes = MESES_PORTUGUES[mes_str.rstrip('s')]
        dt = datetime(now.year, mes, dia)
        data_no_ano_atual = dt.date()
        if data_no_ano_atual < now.date():
            return data_no_ano_atual.replace(year=now.year + 1)
        return data_no_ano_atual
    except (ValueError, KeyError):
        return None

def gerar_horarios_disponiveis(data_escolhida: datetime.date) -> list[str]:
    now = datetime.now(TIMEZONE)
    horarios = []
    if data_escolhida < now.date(): return []
    hora_inicial = HORA_INICIO_ATENDIMENTO
    if data_escolhida == now.date():
        proxima_hora = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        if proxima_hora.time() > hora_inicial:
            hora_inicial = proxima_hora.time()
    slot_atual = datetime.combine(data_escolhida, hora_inicial)
    fim_atendimento = datetime.combine(data_escolhida, HORA_FIM_ATENDIMENTO)
    while slot_atual < fim_atendimento:
        hora_slot = slot_atual.time()
        if not (HORA_INICIO_ALMOCO <= hora_slot < HORA_FIM_ALMOCO):
            horarios.append(hora_slot.strftime("%H:%M"))
        slot_atual += timedelta(minutes=DURACAO_CONSULTA_MINUTOS)
    return horarios

# --- Máquina de Estados da Conversa ---

async def processar_mensagem(user_id: str, user_states: Dict, message_text: str) -> List[str]:
    """Função central que processa a mensagem do usuário e retorna uma lista de respostas do bot."""
    
    # Normaliza a mensagem de entrada
    message_text = message_text.strip().lower()
    respostas_bot = []

    # Estado inicial ou comando de agendamento
    if user_id not in user_states or "agendar" in message_text:
        # Lógica para diferenciar o início da conversa entre web e discord
        if "web" in user_id:
            user_states[user_id] = {"estado": "aguardando_nome_web", "respostas": {}}
            respostas_bot.append("Olá! Bem-vindo(a) ao S.A.G.E. Para começarmos, qual é o seu nome?")
        else: # Início padrão para Discord
            user_states[user_id] = {"estado": "iniciando_agendamento", "passo_formulario": 0, "respostas": {}}
            pergunta_info = FORMULARIO_PERGUNTAS[0]
            texto_pergunta = pergunta_info["texto"]
            especialidades = obter_especialidades_disponiveis()
            if especialidades:
                lista_opcoes = "\n".join(f"- {esp}" for esp in especialidades)
                texto_pergunta += "\n\nAs opções que temos são:\n" + lista_opcoes
            respostas_bot.append(texto_pergunta)
        return respostas_bot

    estado_atual = user_states[user_id].get("estado")

    # --- Novo Fluxo para Web: Coleta de Nome ---
    if estado_atual == "aguardando_nome_web":
        # Salva o nome do paciente e avança para o formulário normal
        nome_paciente = message_text.strip().title()
        user_states[user_id]["respostas"]["paciente_nome"] = nome_paciente
        user_states[user_id]["estado"] = "iniciando_agendamento"
        user_states[user_id]["passo_formulario"] = 0
        
        pergunta_info = FORMULARIO_PERGUNTAS[0]
        texto_pergunta = pergunta_info["texto"].replace("Olá! Bem-vindo(a) ao S.A.G.E. Para começar, ", "")
        
        especialidades = obter_especialidades_disponiveis()
        
        texto_pergunta = f"Prazer, {nome_paciente}! {texto_pergunta}"
        if especialidades:
            lista_opcoes = "\n".join(f"- {esp}" for esp in especialidades)
            texto_pergunta += "\n\nAs opções que temos são:\n" + lista_opcoes
            
        respostas_bot.append(texto_pergunta)

    # --- Fluxo do Formulário ---
    elif estado_atual == "iniciando_agendamento":

        passo_atual = user_states[user_id]["passo_formulario"]
        key_pergunta = FORMULARIO_PERGUNTAS[passo_atual]["key"]
        user_states[user_id]["respostas"][key_pergunta] = message_text
        
        user_states[user_id]["passo_formulario"] += 1
        
        if user_states[user_id]["passo_formulario"] < len(FORMULARIO_PERGUNTAS):
            pergunta_info = FORMULARIO_PERGUNTAS[user_states[user_id]["passo_formulario"]]
            respostas_bot.append(pergunta_info["texto"])
        else:
            # Formulário concluído, apresentar profissionais
            respostas_bot.append("Obrigado por suas respostas! Estou buscando os melhores profissionais para você...")
            matches = encontrar_match(user_states[user_id]["respostas"])
            if not matches:
                respostas_bot.append("Poxa, não encontrei nenhum profissional com essa especialidade. Tente novamente mais tarde.")
                del user_states[user_id]
            else:
                response = "Aqui estão os 3 profissionais mais compatíveis com seu perfil:\n\n"
                top_matches = matches[:3]
                for i, match in enumerate(top_matches):
                    prof = match['profissional']
                    response += (f"**{i+1}. {prof['nome']}** (Score: {match['score']})\n"
                                 f"   - **Especialidades:** {', '.join(prof['especialidade'])}\n"
                                 f"   - **Perfil:** {prof['estilo_comunicacao']}, {prof['perfil_idade']}\n"
                                 f"   - **Afinidades:** Gosta de {', '.join(prof['genero_musical_afinidade'])}\n\n")
                respostas_bot.append(response)
                respostas_bot.append("Com qual profissional você gostaria de agendar? (Digite 1, 2 ou 3)")
                user_states[user_id]["estado"] = "aguardando_escolha_profissional"
                user_states[user_id]["matches_apresentados"] = top_matches

    # --- Fluxo de Agendamento ---
    elif estado_atual == "aguardando_escolha_profissional":
        if message_text not in ["1", "2", "3"]:
            respostas_bot.append("Opção inválida. Por favor, digite 1, 2 ou 3.")
        else:
            indice_escolhido = int(message_text) - 1
            matches_apresentados = user_states[user_id]["matches_apresentados"]
            if indice_escolhido >= len(matches_apresentados):
                respostas_bot.append("Opção inválida. Escolha um dos números apresentados.")
            else:
                profissional_escolhido = matches_apresentados[indice_escolhido]['profissional']
                user_states[user_id]["profissional_escolhido"] = profissional_escolhido
                user_states[user_id]["estado"] = "aguardando_confirmacao_agendamento"
                respostas_bot.append(f"Você escolheu **{profissional_escolhido['nome']}**. Deseja marcar um horário? (sim/não)")
    
    elif estado_atual == "aguardando_confirmacao_agendamento":
        if message_text in ["sim", "s"]:
            user_states[user_id]["estado"] = "aguardando_data"
            respostas_bot.append("Ótimo! Para qual data você gostaria de agendar? (Ex: 25/12, 31 de dezembro ou 01/01/2025)")
        elif message_text in ["não", "nao", "n"]:
            respostas_bot.append("Tudo bem. Se quiser buscar novamente, é só digitar 'agendar'.")
            del user_states[user_id]
        else:
            respostas_bot.append("Resposta inválida. Por favor, digite 'sim' ou 'não'.")

    elif estado_atual == "aguardando_data":
        data_escolhida = parse_data_flexivel(message_text)
        if not data_escolhida:
            respostas_bot.append("Formato de data inválido. Tente usar DD/MM, DD de [mês] ou DD/MM/AAAA.")
        else:
            horarios = gerar_horarios_disponiveis(data_escolhida)
            if not horarios:
                respostas_bot.append(f"Não há horários disponíveis para {data_escolhida.strftime('%d/%m/%Y')}. Por favor, escolha outra data.")
            else:
                user_states[user_id]["data_escolhida"] = data_escolhida
                user_states[user_id]["horarios_disponiveis"] = horarios
                user_states[user_id]["estado"] = "aguardando_horario"
                lista_horarios = ", ".join(horarios)
                respostas_bot.append(f"Ok, para o dia **{data_escolhida.strftime('%d/%m/%Y')}**, os horários disponíveis são:\n`{lista_horarios}`\n\nQual horário você escolhe?")

    elif estado_atual == "aguardando_horario":
        horarios_disponiveis = user_states[user_id].get("horarios_disponiveis", [])
        if message_text not in horarios_disponiveis:
            respostas_bot.append("Horário inválido ou indisponível. Por favor, escolha um da lista.")
        else:
            data_escolhida = user_states[user_id]["data_escolhida"]
            horario_obj = datetime.strptime(message_text, "%H:%M").time()
            data_hora_agendamento = datetime.combine(data_escolhida, horario_obj)
            profissional_escolhido = user_states[user_id]["profissional_escolhido"]
            consulta_id = f"CONSULTA-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"
            
            pacientes = carregar_pacientes()
            
            # Busca o nome do paciente salvo no início da conversa
            nome_paciente = user_states[user_id]["respostas"].get("paciente_nome", "Usuário Anônimo")

            pacientes[consulta_id] = {
                "paciente_id": user_id, "paciente_nome": nome_paciente,
                "id_profissional": profissional_escolhido["id_profissional"],
                "profissional_nome": profissional_escolhido["nome"],
                "data_hora_agendamento": data_hora_agendamento.isoformat(),
                "perfil_buscado": user_states[user_id]["respostas"]
            }

            salvar_pacientes(pacientes)
            
            respostas_bot.append(f"**Agendamento confirmado!**\n\n"
                                 f"**Profissional:** {profissional_escolhido['nome']}\n"
                                 f"**Data:** {data_escolhida.strftime('%d/%m/%Y')}\n"
                                 f"**Horário:** {message_text}\n\n"
                                 f"O ID da sua consulta é: `{consulta_id}`")
            del user_states[user_id]
            
    return respostas_bot
