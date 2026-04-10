import json
from pathlib import Path

# Define o caminho para o arquivo de dados dos profissionais
# Path.resolve().parent.parent aponta para o diretório raiz 'SAGE/'
# a partir de 'SAGE/modules/matchmaking.py'
PROFISSIONAIS_FILE_PATH = Path(__file__).resolve().parent.parent / "data" / "profissionais.json"

# --- Pesos para o cálculo de pontuação ---
PESO_ELIMINATORIO = 1000  # Usado para garantir que a especialidade seja atendida
PESO_ALTO = 1.5         # Estilo de comunicação
PESO_MEDIO = 1.0        # Perfil de idade/experiência
PESO_BAIXO = 0.5        # Afinidade musical

def carregar_profissionais():
    """Carrega a lista de profissionais do arquivo JSON."""
    try:
        with open(PROFISSIONAIS_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Em caso de erro, retorna uma lista vazia para não quebrar o sistema
        return []

def encontrar_match(perfil_paciente):
    """
    Encontra os profissionais mais compatíveis com base no perfil do paciente.

    Args:
        perfil_paciente (dict): Dicionário com as preferências do paciente.
            Ex: {
                "especialidade": "Fisioterapia Esportiva",
                "estilo_comunicacao": "comunicativo",
                "perfil_idade": "jovem",
                "genero_musical": "Rock"
            }

    Returns:
        list: Lista de dicionários de profissionais, ordenada por compatibilidade.
    """
    profissionais = carregar_profissionais()
    
    # 1. Filtros Eliminatórios: Especialidade e Estilo de Comunicação
    paciente_especialidade = perfil_paciente["especialidade"]
    paciente_estilo = perfil_paciente["estilo_comunicacao"]
    profissionais_filtrados = [
        prof for prof in profissionais
        if (any(paciente_especialidade == prof_spec.lower() for prof_spec in prof["especialidade"])) and
           (paciente_estilo == prof["estilo_comunicacao"])
    ]



    if not profissionais_filtrados:
        return []

    # 2. Cálculo da Pontuação Ponderada
    resultados = []
    for prof in profissionais_filtrados:
        score = 0
        
        # Similaridade de comunicação (Peso Alto)
        # Usamos o score dinâmico do profissional, que reflete o feedback dos pacientes
        if perfil_paciente["estilo_comunicacao"] == "comunicativo":
            score += prof["score_comunicativo"] * PESO_ALTO
        elif perfil_paciente["estilo_comunicacao"] == "focado":
            score += prof["score_foco"] * PESO_ALTO
        
        # Similaridade de experiência/perfil (Peso Médio)
        if perfil_paciente["perfil_idade"] == prof["perfil_idade"]:
            score += PESO_MEDIO

        # Similaridade de afinidade musical (Peso Baixo)
        # Converte ambos os conjuntos de gêneros para minúsculas antes de comparar
        paciente_generos = set(g.strip() for g in perfil_paciente["genero_musical"].split(','))
        prof_generos = {g.lower() for g in prof["genero_musical_afinidade"]}
        if paciente_generos.intersection(prof_generos):
            score += PESO_BAIXO

            
        resultados.append({"profissional": prof, "score": round(score, 2)})

    # 3. Ordenar por pontuação (do maior para o menor)
    resultados_ordenados = sorted(resultados, key=lambda x: x["score"], reverse=True)

    return resultados_ordenados

# --- Bloco de Teste ---
# Este código só será executado quando o arquivo for chamado diretamente (python matchmaking.py)
if __name__ == "__main__":
    print("--- Iniciando teste do Módulo de Matchmaking ---")

    # Perfil de um paciente de exemplo (com valores em minúsculas, como viriam do bot)
    paciente_exemplo = {
        "especialidade": "fisioterapia esportiva",
        "estilo_comunicacao": "comunicativo",
        "perfil_idade": "jovem",
        "genero_musical": "rock" # Paciente pode ter um ou mais, separados por vírgula
    }

    
    print(f"\nBuscando profissionais para o perfil:")
    print(paciente_exemplo)

    # Executa a função de matchmaking
    matches = encontrar_match(paciente_exemplo)

    if not matches:
        print("\nNenhum profissional compatível encontrado.")
    else:
        print(f"\n--- Top 3 Profissionais Encontrados ---")
        for i, match in enumerate(matches[:3]):
            prof = match['profissional']
            print(f"{i+1}. {prof['nome']} (Score: {match['score']})")
            print(f"   - Especialidades: {', '.join(prof['especialidade'])}")
            print(f"   - Estilo: {prof['estilo_comunicacao']}, Perfil: {prof['perfil_idade']}")
            print(f"   - Afinidade Musical: {', '.join(prof['genero_musical_afinidade'])}")
            print("-" * 20)

    print("\n--- Teste finalizado ---")
