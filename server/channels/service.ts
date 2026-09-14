import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as repo from "./repository";
import * as meta from "./meta";
import { encryptSecret, decryptSecret } from "./crypto";

export async function connectWhatsapp(
  companyId: number,
  input: {
    id?: string;
    name: string;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
  }
) {
  const previous = input.id
    ? await repo.getChannel(companyId, input.id)
    : undefined;
  if (
    previous &&
    (previous.type !== "whatsapp" ||
      previous.externalId !== input.phoneNumberId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Para trocar o número, cadastre um novo canal.",
    });
  }
  const tokenEncrypted = encryptSecret(input.accessToken);
  const number = await meta.verifyWhatsapp(
    input.phoneNumberId,
    input.businessAccountId,
    input.accessToken
  );
  const channel: repo.StoredChannel = {
    id: previous?.id || crypto.randomUUID(),
    companyId,
    type: "whatsapp",
    externalId: input.phoneNumberId,
    socialSlot: null,
    name: input.name,
    identifier: number.display_phone_number,
    pageId: null,
    businessAccountId: input.businessAccountId,
    tokenEncrypted,
    status: "verified",
    lastVerifiedAt: new Date(),
    lastWebhookAt: previous?.lastWebhookAt || null,
  };
  await repo.saveChannel(channel);
  return repo.publicChannel(channel);
}

export async function connectSocial(
  companyId: number,
  candidate: meta.SocialCandidate
) {
  const existing = (await repo.listChannels(companyId)).find(
    c => c.type === candidate.type
  );
  if (existing && existing.externalId !== candidate.externalId) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Desconecte a conta atual antes de conectar outra conta desta plataforma.",
    });
  }
  const encrypted = encryptSecret(candidate.token);
  await meta.subscribeSocial(candidate);
  const channel: repo.StoredChannel = {
    id: existing?.id || crypto.randomUUID(),
    companyId,
    type: candidate.type,
    externalId: candidate.externalId,
    socialSlot: `${companyId}:${candidate.type}`,
    name: candidate.name.slice(0, 150),
    identifier: candidate.identifier,
    pageId: candidate.pageId,
    businessAccountId: null,
    tokenEncrypted: encrypted,
    status: "verified",
    lastVerifiedAt: new Date(),
    lastWebhookAt: existing?.lastWebhookAt || null,
  };
  await repo.saveChannel(channel);
  return repo.publicChannel(channel);
}

export async function verifyChannel(companyId: number, id: string) {
  const channel = await repo.getChannel(companyId, id);
  try {
    const token = decryptSecret(channel.tokenEncrypted);
    if (channel.type === "whatsapp") {
      await meta.verifyWhatsapp(
        channel.externalId,
        channel.businessAccountId!,
        token
      );
    } else {
      await meta.graph("GET", channel.externalId, token, { fields: "id" });
      await meta.subscribeSocial({
        ...channel,
        type: channel.type as "instagram" | "facebook",
        pageId: channel.pageId!,
        token,
      });
    }
    await repo.updateChannel(companyId, id, {
      status: channel.lastWebhookAt ? "connected" : "verified",
      lastVerifiedAt: new Date(),
    });
  } catch (e) {
    await repo.updateChannel(companyId, id, { status: "error" });
    throw e;
  }
}

export async function resolveClientChannel(
  companyId: number,
  client: any,
  requestedId?: string
) {
  if (client.userId !== companyId)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contato não encontrado nesta empresa.",
    });
  if (client.channelId && requestedId && client.channelId !== requestedId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Responda pelo canal de origem desta conversa.",
    });
  }
  const channelId = client.channelId || requestedId;
  let channel: repo.StoredChannel;
  if (channelId) channel = await repo.getChannel(companyId, channelId);
  else {
    const candidates = (await repo.listChannels(companyId)).filter(
      c => c.type === "whatsapp" && ["verified", "connected"].includes(c.status)
    );
    if (candidates.length !== 1)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selecione o número de WhatsApp para iniciar esta conversa.",
      });
    channel = candidates[0];
  }
  if (!["verified", "connected"].includes(channel.status))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Reconecte este canal antes de enviar mensagens.",
    });
  if (
    channel.type !== "whatsapp" &&
    (!client.channelId || !client.externalContactId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Aguarde o primeiro contato pelo Instagram ou Facebook para responder.",
    });
  }
  return channel;
}

export async function sendClientMessage(
  companyId: number,
  client: any,
  input: {
    channelId?: string;
    message: string;
    mediaUrl?: string;
    mediaType?: "image" | "document" | "audio";
    internalNote?: boolean;
  },
  attendantId: number | null
) {
  if (client.userId !== companyId)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contato não encontrado.",
    });
  if (input.internalNote) {
    return db.createWhatsappMessage({
      userId: companyId,
      clientId: client.id,
      channelId: client.channelId || null,
      attendantId,
      direction: "outbound",
      message: `🔒 [Nota Interna]: ${input.message}`,
      status: "read",
    });
  }
  if (!input.message.trim() && !input.mediaUrl)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Escreva uma mensagem ou selecione um arquivo.",
    });
  if (!!input.mediaUrl !== !!input.mediaType)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe o arquivo e seu tipo.",
    });
  const channel = await resolveClientChannel(
    companyId,
    client,
    input.channelId
  );
  const recipient = client.externalContactId || client.phone;
  if (!recipient)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Contato sem destinatário válido.",
    });
  // Bind legacy contacts before sending so concurrent requests cannot switch numbers.
  await db.bindClientChannel(
    companyId,
    client.id,
    channel.id,
    channel.type === "whatsapp" ? recipient.replace(/\D/g, "") : recipient
  );
  const externalId = await meta.sendThroughChannel(
    channel,
    decryptSecret(channel.tokenEncrypted),
    recipient,
    input.message,
    input.mediaUrl && input.mediaType
      ? { url: input.mediaUrl, type: input.mediaType }
      : undefined
  );
  return db.createWhatsappMessage({
    userId: companyId,
    clientId: client.id,
    channelId: channel.id,
    attendantId,
    direction: "outbound",
    message: input.message || `[${input.mediaType}]`,
    mediaUrl: input.mediaUrl || null,
    externalId,
    status: "sent",
  });
}
