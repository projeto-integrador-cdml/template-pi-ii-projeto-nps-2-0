import crypto from "node:crypto";
import { parse } from "cookie";
import type { Express, Request } from "express";
import * as db from "../db";
import { sdk } from "../_core/sdk";
import * as repo from "./repository";
import * as meta from "./meta";
import { decryptSecret, encryptSecret } from "./crypto";
import { oauthCookieName } from "./router";
import { downloadMetaMedia } from "../whatsappService";
import { processIncomingMessage } from "../services/aiOrchestrator";
import { sendClientMessage } from "./service";

export function validSignature(
  rawBody: Buffer | undefined,
  signature: unknown,
  secret: string | undefined
): boolean {
  if (
    !secret ||
    !rawBody ||
    typeof signature !== "string" ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  return crypto.timingSafeEqual(
    expected,
    Buffer.from(signature.slice(7), "hex")
  );
}

async function receive(
  channel: repo.StoredChannel,
  sender: string,
  name: string,
  text: string,
  externalId: string,
  mediaUrl?: string
) {
  if (!sender || !externalId || (!text && !mediaUrl)) {
    console.warn(`[Meta Webhook] receive: descartada por campos vazios sender=${!!sender} externalId=${!!externalId} text=${!!text} mediaUrl=${!!mediaUrl}`);
    return;
  }
  const owner = await db.getUserById(channel.companyId);
  if (!owner?.isActive) {
    console.warn(`[Meta Webhook] receive: empresa ${channel.companyId} inativa ou não encontrada`);
    return;
  }
  if (await db.channelMessageExists(channel.companyId, channel.id, externalId)) {
    console.log(`[Meta Webhook] receive: mensagem duplicada externalId=${externalId}`);
    return;
  }
  let routed;
  try {
    routed = await db.routeIncomingWhatsappMessage(
      channel.companyId,
      channel.type === "whatsapp" ? `+${sender}` : `${channel.type}:${sender}`,
      name,
      text,
      mediaUrl,
      {
        id: channel.id,
        type: channel.type,
        externalContactId: sender,
        externalId,
      }
    );
    console.log(`[Meta Webhook] receive: mensagem roteada com sucesso. clientId=${routed.msg?.clientId} attendant=${routed.assignedAttendantId}`);
  } catch (e: any) {
    if (e.code !== "ER_DUP_ENTRY" && e.cause?.code !== "ER_DUP_ENTRY") throw e;
    console.log(`[Meta Webhook] receive: duplicata no banco (ER_DUP_ENTRY)`);
    return;
  }
  // Preserve the existing WhatsApp assistant, now using the exact conversation
  // and channel instead of the company's first number.
  if (channel.type === "whatsapp" && routed.msg?.clientId) {
    try {
      const reply = await processIncomingMessage({
        companyId: channel.companyId,
        channelClientId: routed.msg.clientId,
        clientPhone: `+${sender}`,
        clientName: name,
        userMessage: text,
        mediaUrl,
      });
      const client = await db.getClientById(
        routed.msg.clientId,
        channel.companyId
      );
      if (reply.replyText && client)
        await sendClientMessage(
          channel.companyId,
          client,
          { channelId: channel.id, message: reply.replyText },
          null
        );
    } catch {
      console.error(
        "[Meta] Mensagem recebida; resposta automática não concluída."
      );
    }
  }
}

export async function processMetaWebhook(body: any) {
  console.log(`[Meta Webhook] Recebido: object=${body.object} entries=${(body.entry || []).length}`);
  for (const entry of body.entry || []) {
    if (body.object === "whatsapp_business_account") {
      for (const change of entry.changes || []) {
        const value = change.value;
        const numberId = value?.metadata?.phone_number_id;
        if (!numberId) continue;
        const channel = await repo.findByIdentity("whatsapp", String(numberId));
        if (!channel) {
          console.warn(`[Meta Webhook] WhatsApp: canal não encontrado para phone_number_id=${numberId}`);
          continue;
        }
        await repo.updateChannel(channel.companyId, channel.id, {
          lastWebhookAt: new Date(),
          status: "connected",
        });
        for (const status of value.statuses || []) {
          if (["sent", "delivered", "read", "failed"].includes(status.status)) {
            await db.updateChannelMessageStatus(
              channel.companyId,
              channel.id,
              status.id,
              status.status
            );
          }
        }
        for (const msg of value.messages || []) {
          const sender = String(msg.from || "");
          const name =
            value.contacts?.find((c: any) => c.wa_id === sender)?.profile
              ?.name || `WhatsApp ${sender}`;
          let text =
            msg.text?.body ||
            msg.button?.text ||
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            "";
          let mediaUrl: string | undefined;
          const attachment =
            msg.image || msg.audio || msg.document || msg.video || msg.sticker;
          if (attachment?.id) {
            text =
              attachment.caption ||
              attachment.filename ||
              (msg.audio ? "[Áudio]" : "[Arquivo]");
            mediaUrl = await downloadMetaMedia(
              attachment.id,
              decryptSecret(channel.tokenEncrypted),
              attachment.mime_type || "application/octet-stream"
            );
            if (!mediaUrl) throw new Error("Falha ao receber arquivo da Meta.");
          }
          console.log(`[Meta Webhook] WhatsApp: processando msg de ${sender} mid=${msg.id}`);
          await receive(
            channel,
            sender,
            name,
            text || `[${msg.type || "Mensagem"}]`,
            msg.id,
            mediaUrl
          );
        }
      }
    } else if (body.object === "page" || body.object === "instagram") {
      const type = body.object === "page" ? "facebook" : "instagram";
      console.log(`[Meta Webhook] ${type}: entry.id=${entry.id} messaging_events=${(entry.messaging || []).length}`);
      const channel = await repo.findByIdentity(type, String(entry.id));
      if (!channel) {
        console.warn(`[Meta Webhook] ${type}: canal NÃO encontrado para externalId=${entry.id}. Verifique se a conta está conectada no CRM.`);
        continue;
      }
      console.log(`[Meta Webhook] ${type}: canal encontrado id=${channel.id} company=${channel.companyId}`);
      await repo.updateChannel(channel.companyId, channel.id, {
        lastWebhookAt: new Date(),
        status: "connected",
      });
      for (const event of entry.messaging || []) {
        const senderId = String(event.sender?.id || "");
        const isEcho = !!event.message?.is_echo;
        const isSelf = senderId === channel.externalId;
        if (isEcho || isSelf) {
          console.log(`[Meta Webhook] ${type}: ignorado (is_echo=${isEcho} is_self=${isSelf} sender=${senderId})`);
          continue;
        }
        if (event.message?.mid) {
          const attachment = event.message.attachments?.[0];
          console.log(`[Meta Webhook] ${type}: processando msg de sender=${senderId} mid=${event.message.mid} text=${!!event.message.text} attachment=${attachment?.type || "nenhum"}`);
          await receive(
            channel,
            senderId,
            `${type === "instagram" ? "Instagram" : "Facebook"} ${senderId}`,
            event.message.text || `[${attachment?.type || "Mensagem"}]`,
            event.message.mid,
            attachment?.payload?.url
          );
          console.log(`[Meta Webhook] ${type}: mensagem roteada com sucesso mid=${event.message.mid}`);
        } else {
          console.log(`[Meta Webhook] ${type}: evento sem message.mid (delivery/read/etc) sender=${senderId}`);
        }
        for (const mid of event.delivery?.mids || [])
          await db.updateChannelMessageStatus(
            channel.companyId,
            channel.id,
            mid,
            "delivered"
          );
      }
    } else {
      console.warn(`[Meta Webhook] Objeto desconhecido: ${body.object}`);
    }
  }
}

export function registerMetaRoutes(app: Express) {
  app.get("/api/meta/callback", async (req, res) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    let stage = "session";
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isActive) throw new Error("Sessão inválida");
      stage = "state";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      if (!/^[a-f0-9]{64}$/.test(state)) throw new Error("Estado inválido");
      stage = "flow";
      const flow = await repo.readFlow(user.id, state);
      stage = "decrypt";
      const payload = JSON.parse(decryptSecret(flow.payload));
      stage = "browser";
      const cookie = parse(req.headers.cookie || "")[oauthCookieName];
      console.log(`[Meta OAuth] callback: cookie_header_present=${!!req.headers.cookie} oauth_cookie_present=${!!cookie} phase=${payload.phase} nonce_match=${cookie ? payload.browserNonce === cookie : "N/A"}`);
      if (
        payload.phase !== "login" ||
        !cookie ||
        payload.browserNonce !== cookie
      )
        throw new Error("Navegador inválido");
      stage = "consume_flow";
      await repo.readFlow(user.id, state, true);
      res.clearCookie(oauthCookieName, {
        path: "/api/meta",
        httpOnly: true,
        secure: meta.publicOrigin().startsWith("https:"),
        sameSite: "lax",
      });
      if (req.query.error)
        return res.redirect(
          `${meta.publicOrigin()}/channels?meta_error=cancelled`
        );
      stage = "code_exchange";
      if (typeof req.query.code !== "string")
        throw new Error("Autorização ausente");
      const token = await meta.exchangeCode(req.query.code);
      stage = "accounts";
      const candidates = await meta.socialCandidates(payload.type, token);
      if (!candidates.length)
        return res.redirect(
          `${meta.publicOrigin()}/channels?meta_error=no_accounts`
        );
      const selection = crypto.randomBytes(32).toString("hex");
      stage = "save_selection";
      await repo.saveFlow({
        id: selection,
        companyId: user.id,
        expiresAt: new Date(Date.now() + 10 * 60_000),
        payload: encryptSecret(JSON.stringify({ phase: "select", candidates })),
      });
      return res.redirect(
        `${meta.publicOrigin()}/channels?meta_flow=${selection}`
      );
    } catch {
      // Only log a controlled stage, never request URLs, cookies or error objects.
      console.warn(`[Meta OAuth] callback_failed stage=${stage}`);
      return res.redirect(
        `${meta.publicOrigin()}/channels?meta_error=authorization&meta_stage=${stage}`
      );
    }
  });

  for (const route of ["/api/meta/webhook", "/api/whatsapp/webhook"]) {
    app.get(route, (req, res) => {
      const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
      if (
        expected &&
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === expected
      )
        return res.status(200).send(req.query["hub.challenge"]);
      return res.sendStatus(403);
    });
    app.post(route, async (req: Request & { rawBody?: Buffer }, res) => {
      console.log(`[Meta Webhook] POST ${route} recebido. META_APP_SECRET configurado: ${!!process.env.META_APP_SECRET}, rawBody: ${!!req.rawBody} (${req.rawBody?.length || 0} bytes), signature: ${!!req.headers["x-hub-signature-256"]}`);
      if (!process.env.META_APP_SECRET) {
        console.error("[Meta Webhook] META_APP_SECRET não configurado! Retornando 503.");
        return res.sendStatus(503);
      }
      if (
        !validSignature(
          req.rawBody,
          req.headers["x-hub-signature-256"],
          process.env.META_APP_SECRET
        )
      ) {
        console.warn("[Meta Webhook] Assinatura inválida! Retornando 401.");
        return res.sendStatus(401);
      }
      try {
        await processMetaWebhook(req.body);
        return res.sendStatus(200);
      } catch (e: any) {
        console.error(
          `[Meta Webhook] Falha ao persistir evento; a Meta poderá tentar novamente. Erro: ${e.message || "desconhecido"}`
        );
        return res.sendStatus(500);
      }
    });
  }
}
