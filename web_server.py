from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import os
import json
import asyncio
from modules.bot_logic import processar_mensagem

# --- Configuração do Servidor Flask ---
project_root = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(project_root, 'web')
static_dir = os.path.join(project_root, 'web')
DATA_DIR = os.path.join(project_root, 'data')
PACIENTES_FILE = os.path.join(DATA_DIR, 'pacientes.json')
PROFISSIONAIS_FILE = os.path.join(DATA_DIR, 'profissionais.json')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.secret_key = 'chave-super-secreta-para-tcc-sage'

# Credenciais do administrador
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

# --- Gerenciamento de Estado para o Chat Web ---
web_user_states = {}

# --- Funções Auxiliares de Dados ---
def carregar_dados(caminho_arquivo):
    try:
        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {} if caminho_arquivo == PACIENTES_FILE else []

def salvar_dados(caminho_arquivo, dados):
    with open(caminho_arquivo, 'w', encoding='utf-8') as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)

# --- Rotas do Site Público ---
@app.route('/')
def index():
    return render_template('index.html')

# --- API do Chatbot Público ---
@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    user_message = data.get('message', '').strip()
    session_id = data.get('session_id', 'default_user')
    if not user_message:
        return jsonify({"reply": "Por favor, digite uma mensagem."})
    bot_responses = asyncio.run(processar_mensagem(session_id, web_user_states, user_message))
    response_text = "\n".join(bot_responses)
    return jsonify({"reply": response_text})

# --- Rotas da Área do Administrador ---
@app.route('/admin')
def admin_redirect():
    return redirect(url_for('admin_login'))

@app.route('/admin/login', methods=['GET'])
def admin_login():
    return render_template('admin_login.html')

@app.route('/admin/auth', methods=['POST'])
def admin_auth():
    username = request.form.get('username')
    password = request.form.get('password')
    if username == ADMIN_USER and password == ADMIN_PASS:
        session['logged_in'] = True
        return redirect(url_for('admin_dashboard'))
    else:
        flash('Usuário ou senha inválidos.')
        return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    if not session.get('logged_in'):
        return redirect(url_for('admin_login'))
    
    profissionais = carregar_dados(PROFISSIONAIS_FILE)
    # Ordena a lista de profissionais pelo nome em ordem alfabética
    profissionais_ordenados = sorted(profissionais, key=lambda p: p.get('nome', ''))
    return render_template('admin_dashboard.html', profissionais=profissionais_ordenados)


@app.route('/admin/logout')
def admin_logout():
    session.pop('logged_in', None)
    flash('Você saiu da sua conta.')
    return redirect(url_for('admin_login'))

# --- API da Área do Administrador ---
@app.route('/admin/api/agenda/<id_profissional>')
def get_agenda(id_profissional):
    if not session.get('logged_in'):
        return jsonify({"error": "Não autorizado"}), 403

    todos_agendamentos = carregar_dados(PACIENTES_FILE)
    
    # Filtra e transforma os agendamentos para o formato que o frontend espera
    agenda_profissional = []
    for consulta_id, consulta_data in todos_agendamentos.items():
        if consulta_data.get('id_profissional') == id_profissional:
            agenda_profissional.append({
                'id_consulta': consulta_id,
                'nome_paciente': consulta_data.get('paciente_nome', 'N/A'),
                'data_hora': consulta_data.get('data_hora_agendamento', 'N/A').replace('T', ' '),
                'status': consulta_data.get('status', 'agendado')
            })
    
    data_filtro = request.args.get('data')
    
    if data_filtro:
        agenda_filtrada = [
            consulta for consulta in agenda_profissional
            if consulta.get('data_hora', '').startswith(data_filtro)
        ]
        return jsonify(agenda_filtrada)

    return jsonify(agenda_profissional)



@app.route('/admin/api/agenda/deletar', methods=['POST'])
def deletar_agenda():
    if not session.get('logged_in'):
        return jsonify({"success": False, "message": "Não autorizado"}), 403

    data = request.json
    id_consulta = data.get('id_consulta')

    if not id_consulta:
        return jsonify({"success": False, "message": "ID da consulta não fornecido."}), 400

    agendamentos = carregar_dados(PACIENTES_FILE)
    
    if id_consulta in agendamentos:
        agendamentos.pop(id_consulta)
        salvar_dados(PACIENTES_FILE, agendamentos)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "ID da consulta não encontrado."}), 404


# --- Execução do Servidor ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
