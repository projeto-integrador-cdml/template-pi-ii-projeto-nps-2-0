import * as db from './db';
import axios from 'axios';
import { storagePut } from './storage';
import * as repo from './channels/repository';
import { decryptSecret } from './channels/crypto';
import { graph, graphBase, sendThroughChannel } from './channels/meta';

export async function initializeAllClients(): Promise<void> {}

async function resolve(companyId: number, phone: string, channelId?: string) {
  const channels = (await repo.listChannels(companyId)).filter(c => c.type === "whatsapp" && ["verified", "connected"].includes(c.status));
  if (channelId) {
    const selected = channels.find(c => c.id === channelId);
    if (!selected) throw new Error("Canal não disponível nesta empresa.");
    return selected;
  }
  const normalized = phone.replace(/\D/g, "");
  const clients = (await db.listAllClients()).filter(c => c.userId === companyId && c.channelId && c.phone?.replace(/\D/g, "") === normalized);
  const matches = channels.filter(c => clients.some(client => client.channelId === c.id));
  if (matches.length === 1) return matches[0];
  if (!matches.length && channels.length === 1) return channels[0];
  throw new Error("Selecione explicitamente o número de WhatsApp desta conversa.");
}

export async function sendMessage(companyId: number, phone: string, body: string, channelId?: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const channel = await resolve(companyId, phone, channelId);
    const messageId = await sendThroughChannel(channel, decryptSecret(channel.tokenEncrypted), phone, body);
    return { success: true, messageId };
  } catch { return { success: false }; }
}

export async function sendMediaMessage(companyId: number, phone: string, mediaUrl: string, mediaType: "image" | "document" | "audio", caption?: string, channelId?: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const channel = await resolve(companyId, phone, channelId);
    const messageId = await sendThroughChannel(channel, decryptSecret(channel.tokenEncrypted), phone, caption || "", { url: mediaUrl, type: mediaType });
    return { success: true, messageId };
  } catch { return { success: false }; }
}

export async function sendTemplateMessage(companyId: number, phone: string, templateName: string, languageCode: string, parameters: string[], channelId?: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const channel = await resolve(companyId, phone, channelId);
    const response = await graph("POST", channel.externalId + "/messages", decryptSecret(channel.tokenEncrypted), {
      messaging_product: "whatsapp", to: phone.replace(/\D/g, ""), type: "template",
      template: { name: templateName, language: { code: languageCode }, ...(parameters.length ? { components: [{ type: "body", parameters: parameters.map(text => ({ type: "text", text })) }] } : {}) },
    });
    return { success: !!response.messages?.[0]?.id, messageId: response.messages?.[0]?.id };
  } catch { return { success: false }; }
}

export async function downloadMetaMedia(
  mediaId: string,
  accessToken: string,
  mimeType: string
): Promise<string> {
  try {
    // 1. Consultar dados do arquivo na Meta
    const res = await axios.get(`${graphBase()}/${mediaId}`, {
      timeout: 20000, headers: { Authorization: `Bearer ${accessToken}` }
    });

    const downloadUrl = res.data?.url;
    if (!downloadUrl) {
      console.error(`[WhatsApp API] URL de download não encontrada para a mídia ${mediaId}`);
      return "";
    }

    // 2. Baixar buffer de mídia
    const fileRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20000, maxContentLength: 25 * 1024 * 1024, responseType: 'arraybuffer'
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
      "Falha ao baixar arquivo"
    );
    return "";
  }
}
