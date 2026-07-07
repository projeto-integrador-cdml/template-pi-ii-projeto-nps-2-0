import * as db from './db';
import axios from 'axios';
import { storagePut } from './storage';

/**
 * Inicialização de sessões (no-op para a API Oficial do WhatsApp)
 */
export async function initializeAllClients(): Promise<void> {
  // A API Oficial é stateless
}

/**
 * Conexão do cliente (no-op para a API Oficial do WhatsApp)
 */
export async function startConnection(companyId: number): Promise<void> {
  // Conexão instantânea via salvamento de configurações
}

/**
 * Envia uma mensagem de texto usando a API de Nuvem Oficial do WhatsApp (Meta)
 * @param companyId ID do administrador da empresa
 * @param phone Telefone do destinatário
 * @param body Texto da mensagem
 */
export async function sendMessage(
  companyId: number,
  phone: string,
  body: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const user = await db.getUserById(companyId);
    if (!user) {
      console.error(`[WhatsApp API] Empresa ID ${companyId} não encontrada.`);
      return { success: false };
    }

    const { whatsappApiUrl, whatsappApiKey } = user;
    if (!whatsappApiUrl || !whatsappApiKey) {
      console.error(`[WhatsApp API] Credenciais oficiais da Meta não configuradas para a empresa ID ${companyId}`);
      return { success: false };
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
      const msgId = response.data?.messages?.[0]?.id;
      console.log(`[WhatsApp API] Mensagem enviada com sucesso para ${normalizedPhone}. ID: ${msgId}`);
      return { success: true, messageId: msgId };
    }

    console.error(`[WhatsApp API] Resposta com erro da API da Meta. Status: ${response.status}`, response.data);
    return { success: false };
  } catch (err: any) {
    console.error(
      `[WhatsApp API] Falha na requisição para a API da Meta ao enviar para ${phone}:`,
      err.response?.data || err.message
    );
    return { success: false };
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

/**
 * Baixa arquivos de mídia recebidos via Webhook da Meta e salva no Storage Local/Nuvem
 * @param mediaId ID da mídia gerado pela Meta
 * @param accessToken Token de Acesso da Meta da empresa
 * @param mimeType MIME Type da mídia
 */
export async function downloadMetaMedia(
  mediaId: string,
  accessToken: string,
  mimeType: string
): Promise<string> {
  try {
    // 1. Consultar dados do arquivo na Meta
    const res = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const downloadUrl = res.data?.url;
    if (!downloadUrl) {
      console.error(`[WhatsApp API] URL de download não encontrada para a mídia ${mediaId}`);
      return "";
    }

    // 2. Baixar buffer de mídia
    const fileRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(fileRes.data);

    // 3. Mapear extensão de arquivo
    let ext = 'bin';
    const mime = mimeType.toLowerCase();
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('ogg')) ext = 'ogg';
    else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
    else if (mime.includes('webm')) ext = 'webm';
    else if (mime.includes('wav')) ext = 'wav';
    else if (mime.includes('mp4')) ext = 'mp4';

    const fileKey = `whatsapp_media/${mediaId}.${ext}`;
    const result = await storagePut(fileKey, buffer, mimeType);
    return result.url;
  } catch (err: any) {
    console.error(
      `[WhatsApp API] Falha no download da mídia Meta (${mediaId}):`,
      err.response?.data || err.message
    );
    return "";
  }
}

/**
 * Envia uma mensagem com modelo (Template) parametrizado
 */
export async function sendTemplateMessage(
  companyId: number,
  phone: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const user = await db.getUserById(companyId);
    if (!user) {
      console.error(`[WhatsApp API] Empresa ID ${companyId} não encontrada.`);
      return { success: false };
    }

    const { whatsappApiUrl, whatsappApiKey } = user;
    if (!whatsappApiUrl || !whatsappApiKey) {
      console.error(`[WhatsApp API] Credenciais oficiais da Meta não configuradas para a empresa ID ${companyId}`);
      return { success: false };
    }

    const normalizedPhone = phone.replace(/\D/g, '').trim();

    console.log(`[WhatsApp API] Enviando template "${templateName}" para ${normalizedPhone} (Empresa ID: ${companyId})`);

    const formattedParams = parameters.map(p => ({
      type: "text",
      text: p
    }));

    const components = formattedParams.length > 0 ? [
      {
        type: "body",
        parameters: formattedParams
      }
    ] : [];

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappApiUrl}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components
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
      const msgId = response.data?.messages?.[0]?.id;
      console.log(`[WhatsApp API] Template enviado com sucesso. ID: ${msgId}`);
      return { success: true, messageId: msgId };
    }

    console.error(`[WhatsApp API] Erro ao enviar template. Meta status: ${response.status}`, response.data);
    return { success: false };
  } catch (err: any) {
    console.error(
      `[WhatsApp API] Erro no envio de template para ${phone}:`,
      err.response?.data || err.message
    );
    return { success: false };
  }
}

/**
 * Envia mensagens contendo mídia (imagens, documentos ou áudio) via links públicos ou locais
 */
export async function sendMediaMessage(
  companyId: number,
  phone: string,
  mediaUrl: string,
  mediaType: "image" | "document" | "audio",
  caption?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const user = await db.getUserById(companyId);
    if (!user) {
      console.error(`[WhatsApp API] Empresa ID ${companyId} não encontrada.`);
      return { success: false };
    }

    const { whatsappApiUrl, whatsappApiKey } = user;
    if (!whatsappApiUrl || !whatsappApiKey) {
      console.error(`[WhatsApp API] Credenciais oficiais da Meta não configuradas para a empresa ID ${companyId}`);
      return { success: false };
    }

    const normalizedPhone = phone.replace(/\D/g, '').trim();

    // Determinar URL absoluta para a Meta conseguir baixar (em ambientes locais ela utilizará localhost do backend)
    let absoluteMediaUrl = mediaUrl;
    if (mediaUrl.startsWith("/")) {
      const port = process.env.PORT || "3000";
      const host = process.env.SERVER_URL || `http://localhost:${port}`;
      absoluteMediaUrl = `${host}${mediaUrl}`;
    }

    console.log(`[WhatsApp API] Enviando mídia (${mediaType}) para ${normalizedPhone}. URL: ${absoluteMediaUrl}`);

    const mediaPayload: Record<string, any> = {
      link: absoluteMediaUrl
    };

    if (mediaType === "image" && caption) {
      mediaPayload.caption = caption;
    } else if (mediaType === "document" && caption) {
      mediaPayload.filename = caption;
    }

    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${whatsappApiUrl}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: mediaType,
        [mediaType]: mediaPayload
      },
      {
        headers: {
          "Authorization": `Bearer ${whatsappApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status === 200 || response.status === 201) {
      const msgId = response.data?.messages?.[0]?.id;
      console.log(`[WhatsApp API] Mídia enviada com sucesso. ID: ${msgId}`);
      return { success: true, messageId: msgId };
    }

    console.error(`[WhatsApp API] Erro ao enviar mídia. Meta status: ${response.status}`, response.data);
    return { success: false };
  } catch (err: any) {
    console.error(
      `[WhatsApp API] Erro no envio de mídia para ${phone}:`,
      err.response?.data || err.message
    );
    return { success: false };
  }
}
