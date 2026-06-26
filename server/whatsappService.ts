import * as db from './db';
import axios from 'axios';

/**
 * Inicialização de sessões (no-op para a API Oficial do WhatsApp)
 */
export async function initializeAllClients(): Promise<void> {
  // A API Oficial é stateless, não requer inicialização de navegadores/sessões
}

/**
 * Conexão do cliente (no-op para a API Oficial do WhatsApp)
 */
export async function startConnection(companyId: number): Promise<void> {
  // A API Oficial conecta de forma instantânea ao salvar as credenciais
}

/**
 * Envia uma mensagem de texto usando a API de Nuvem Oficial do WhatsApp (Meta)
 * @param companyId ID do administrador da empresa
 * @param phone Telefone do destinatário
 * @param body Texto da mensagem
 */
export async function sendMessage(companyId: number, phone: string, body: string): Promise<boolean> {
  try {
    const user = await db.getUserById(companyId);
    if (!user) {
      console.error(`[WhatsApp API] Empresa ID ${companyId} não encontrada.`);
      return false;
    }

    const { whatsappApiUrl, whatsappApiKey } = user;
    if (!whatsappApiUrl || !whatsappApiKey) {
      console.error(`[WhatsApp API] Credenciais oficiais da Meta não configuradas para a empresa ID ${companyId}`);
      return false;
    }

    // Formata o número do telefone (mantém apenas dígitos)
    const normalizedPhone = phone.replace(/\D/g, '').trim();

    console.log(`[WhatsApp API] Enviando mensagem oficial para ${normalizedPhone} (Empresa ID: ${companyId})`);

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappApiUrl}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: body
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${whatsappApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log(`[WhatsApp API] Mensagem enviada com sucesso para ${normalizedPhone}. ID: ${response.data?.messages?.[0]?.id}`);
      return true;
    }

    console.error(`[WhatsApp API] Resposta com erro da API da Meta. Status: ${response.status}`, response.data);
    return false;
  } catch (err: any) {
    console.error(
      `[WhatsApp API] Falha na requisição para a API da Meta ao enviar para ${phone}:`,
      err.response?.data || err.message
    );
    return false;
  }
}

/**
 * Desconecta o WhatsApp da empresa, limpando as credenciais do banco de dados
 * @param companyId ID do administrador da empresa
 */
export async function disconnectSession(companyId: number): Promise<void> {
  console.log(`[WhatsApp API] Desconectando e limpando configurações da API Oficial da empresa ID ${companyId}...`);
  try {
    await db.updateUserWhatsappConfig(companyId, {
      whatsappStatus: 'disconnected',
      whatsappQrCode: null,
      whatsappNumber: null,
      whatsappApiUrl: null,
      whatsappApiKey: null,
    });
  } catch (err) {
    console.error(`[WhatsApp API] Erro ao limpar credenciais no banco da empresa ID ${companyId}:`, err);
  }
}
