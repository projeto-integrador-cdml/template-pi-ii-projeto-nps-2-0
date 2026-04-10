document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const closeChatBtn = document.getElementById('close-chat');
    const chatBody = document.getElementById('chat-body');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');

    // --- Estado do Chat ---
    let sessionId = sessionStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('chat_session_id', sessionId);
    }

    // --- Funções ---

    /**
     * Adiciona uma mensagem à interface do chat.
     * @param {string} text O texto da mensagem.
     * @param {'user' | 'bot'} sender Quem enviou a mensagem.
     */
    function addMessageToChat(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        messageElement.textContent = text;
        chatBody.appendChild(messageElement);
        // Rola para a mensagem mais recente
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    /**
     * Envia a mensagem para a API do backend e recebe a resposta.
     */
    async function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;

        // Adiciona a mensagem do usuário à UI
        addMessageToChat(messageText, 'user');
        chatInput.value = '';

        try {
            // Envia a mensagem para o backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageText,
                    session_id: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('A resposta da rede não foi OK');
            }

            const data = await response.json();
            const botReply = data.reply;

            // Adiciona a resposta do bot à UI
            addMessageToChat(botReply, 'bot');

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            addMessageToChat('Desculpe, estou com problemas para me conectar. Tente novamente mais tarde.', 'bot');
        }
    }

    // --- Event Listeners ---

    // Abrir o chat
    chatIcon.addEventListener('click', () => {
        chatWindow.classList.remove('hidden');
        chatIcon.classList.add('hidden');
    });

    // Fechar o chat
    closeChatBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
        chatIcon.classList.remove('hidden');
    });

    // Enviar mensagem com o botão
    sendChatBtn.addEventListener('click', sendMessage);

    // Enviar mensagem com a tecla "Enter"
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Mensagem de boas-vindas inicial
    addMessageToChat('Olá! Eu sou o S.A.G.E. Como posso ajudar? Para iniciar um agendamento, digite "!agendar".', 'bot');
});
