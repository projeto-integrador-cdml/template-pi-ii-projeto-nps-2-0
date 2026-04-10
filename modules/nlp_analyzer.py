import json
import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# --- Configuração de Caminhos e Constantes ---
BASE_DIR = Path(__file__).resolve().parent.parent
PROFISSIONAIS_FILE_PATH = BASE_DIR / "data" / "profissionais.json"
ENV_PATH = BASE_DIR / ".env"

# Carrega as variáveis de ambiente (DISCORD_TOKEN, GEMINI_API_KEY)
load_dotenv(dotenv_path=ENV_PATH)

# Fator de ajuste para os scores dos profissionais
AJUSTE_SCORE = 0.05

# --- Configuração da API do Gemini ---
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY or GEMINI_API_KEY == "SUA_CHAVE_API_GEMINI_AQUI":
        print("AVISO: A variável de ambiente GEMINI_API_KEY não foi definida.")
        print("AVISO: A análise de feedback não funcionará. Por favor, adicione sua chave ao arquivo .env")
        genai.configure(api_key="INVALID_KEY") # Configura com uma chave inválida para evitar erros de inicialização
    else:
        genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"ERRO: Falha ao configurar a API do Gemini. Erro: {e}")

def criar_prompt_analise(texto_feedback: str) -> str:
    """Cria o prompt estruturado para a análise de sentimento via Gemini."""
    return f"""
    Analise o seguinte feedback de um paciente sobre uma consulta de fisioterapia.
    Seu objetivo é extrair o sentimento geral e identificar a qual aspecto o feedback se refere.

    O feedback é: "{texto_feedback}"

    Os aspectos de interesse são:
    1. 'comunicacao': Relacionado a como o profissional se comunica, explica, ouve, etc.
    2. 'foco': Relacionado à técnica, objetividade e precisão do tratamento.

    Responda APENAS com um objeto JSON válido, contendo as seguintes chaves:
    - "sentimento_geral": pode ser "positivo", "negativo" ou "neutro".
    - "aspectos": um dicionário onde as chaves são os aspectos identificados ('comunicacao' ou 'foco') e os valores são o sentimento associado a cada um ("positivo", "negativo" ou "neutro"). Se nenhum aspecto for identificado, retorne um dicionário vazio.

    Exemplo de resposta:
    {{
      "sentimento_geral": "positivo",
      "aspectos": {{
        "comunicacao": "positivo"
      }}
    }}
    """

def analisar_feedback(texto_feedback: str) -> dict:
    """
    Analisa o texto de feedback usando a API do Gemini.

    Args:
        texto_feedback (str): O feedback fornecido pelo usuário.

    Returns:
        dict: Um dicionário com o sentimento geral e os aspectos identificados.
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = criar_prompt_analise(texto_feedback)
        response = model.generate_content(prompt)
        
        # Limpa a resposta para garantir que seja um JSON válido
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"ERRO ao chamar a API do Gemini ou processar a resposta: {e}")
        # Retorna um dicionário padrão em caso de falha
        return {"sentimento_geral": "neutro", "aspectos": {}}

def atualizar_perfil_profissional(id_profissional: str, analise: dict):
    """
    Atualiza o score de um profissional com base na análise do feedback.
    (Esta função permanece a mesma da versão anterior)
    """
    try:
        with open(PROFISSIONAIS_FILE_PATH, 'r+', encoding='utf-8') as f:
            profissionais = json.load(f)
            
            profissional_encontrado = next((p for p in profissionais if p["id_profissional"] == id_profissional), None)
            
            if not profissional_encontrado:
                print(f"AVISO: Profissional com ID {id_profissional} não encontrado.")
                return

            for aspecto, sentimento in analise.get("aspectos", {}).items():
                if aspecto == "comunicacao":
                    score_key = "score_comunicativo"
                elif aspecto == "foco":
                    score_key = "score_foco"
                else:
                    continue

                if sentimento == 'positivo':
                    profissional_encontrado[score_key] = min(1.0, profissional_encontrado[score_key] + AJUSTE_SCORE)
                elif sentimento == 'negativo':
                    profissional_encontrado[score_key] = max(0.0, profissional_encontrado[score_key] - AJUSTE_SCORE)
            
            f.seek(0)
            json.dump(profissionais, f, indent=2, ensure_ascii=False)
            f.truncate()
            
            print(f"Perfil do profissional {id_profissional} atualizado com sucesso.")

    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"ERRO: Não foi possível ler ou atualizar o arquivo de profissionais. Erro: {e}")

# --- Bloco de Teste ---
if __name__ == "__main__":
    print("--- Iniciando teste do Módulo de Análise de NLP (com Gemini API) ---")

    # Verifica se a chave da API foi configurada antes de prosseguir
    if not GEMINI_API_KEY or GEMINI_API_KEY == "SUA_CHAVE_API_GEMINI_AQUI":
        print("\nTeste não pode continuar. Configure a GEMINI_API_KEY no arquivo .env")
    else:
        feedback_exemplo_positivo = "Adorei a consulta! A doutora foi muito atenciosa e explicou tudo em detalhes. Uma profissional super comunicativa."
        id_profissional_exemplo = "PROF002"

        print(f"\nAnalisando feedback: '{feedback_exemplo_positivo}'")
        
        analise_resultado = analisar_feedback(feedback_exemplo_positivo)
        print(f"Resultado da Análise: {analise_resultado}")

        if analise_resultado and analise_resultado.get("aspectos"):
            print(f"\nAtualizando perfil do profissional: {id_profissional_exemplo}")
            
            # Mostra o score antes
            with open(PROFISSIONAIS_FILE_PATH, 'r', encoding='utf-8') as f:
                prof_antes = next((p for p in json.load(f) if p["id_profissional"] == id_profissional_exemplo), None)
                if prof_antes:
                    print(f"Score de comunicação ANTES: {prof_antes['score_comunicativo']:.2f}")

            # Atualiza
            atualizar_perfil_profissional(id_profissional_exemplo, analise_resultado)

            # Mostra o score depois
            with open(PROFISSIONAIS_FILE_PATH, 'r', encoding='utf-8') as f:
                prof_depois = next((p for p in json.load(f) if p["id_profissional"] == id_profissional_exemplo), None)
                if prof_depois:
                    print(f"Score de comunicação DEPOIS: {prof_depois['score_comunicativo']:.2f}")

    print("\n--- Teste finalizado ---")
