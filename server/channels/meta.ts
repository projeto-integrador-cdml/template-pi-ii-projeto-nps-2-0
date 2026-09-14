import axios from "axios";
import { TRPCError } from "@trpc/server";
import type { ChannelType } from "../../shared/channels";

export const graphVersion = () => process.env.META_GRAPH_API_VERSION || "v25.0";
export const graphBase = () => `https://graph.facebook.com/${graphVersion()}`;
export function publicOrigin() {
  const url = new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("Configure PUBLIC_APP_URL com o domínio HTTPS do CRM.");
  return url.origin;
}
export const callbackUrl = () => `${publicOrigin()}/api/meta/callback`;

export function requireMetaConfig() {
  if (
    !process.env.META_APP_ID ||
    !process.env.META_APP_SECRET ||
    !process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "O administrador do sistema precisa configurar o aplicativo da Meta no servidor.",
    });
  }
}

export const scopes = (type: "instagram" | "facebook") => [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  ...(type === "facebook"
    ? ["pages_messaging"]
    : ["instagram_business_basic", "instagram_business_manage_messages"]),
];

// Never propagate Axios errors: they contain the Authorization header and URLs.
export async function graph<T = any>(
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  token: string,
  data: Record<string, any> = {}
): Promise<T> {
  try {
    const response = await axios.request({
      method,
      url: `${graphBase()}/${endpoint}`,
      timeout: 20000,
      headers: { Authorization: `Bearer ${token}` },
      ...(method === "GET" ? { params: data } : { data }),
    });
    return response.data;
  } catch (e: any) {
    const code = e.response?.data?.error?.code;
    const message =
      code === 190
        ? "A autorização da Meta expirou ou foi revogada. Reconecte o canal."
        : code === 10 || code === 200
          ? "A Meta não autorizou esta operação. Confira as permissões e a aprovação do aplicativo."
          : "A Meta não confirmou a operação. Confira a conta, as credenciais e a janela permitida para responder mensagens.";
    throw new TRPCError({ code: "BAD_REQUEST", message, cause: undefined });
  }
}

export async function graphList(
  endpoint: string,
  token: string,
  fields: string
) {
  const result: any[] = [];
  let after: string | undefined;
  do {
    const page = await graph("GET", endpoint, token, {
      fields,
      limit: 100,
      ...(after ? { after } : {}),
    });
    result.push(...(page.data || []));
    after = page.paging?.next ? page.paging?.cursors?.after : undefined;
  } while (after);
  return result;
}

export async function exchangeCode(code: string) {
  const credentials = {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
  };
  const initial = await graph("GET", "oauth/access_token", "", {
    ...credentials,
    redirect_uri: callbackUrl(),
    code,
  });
  const longLived = await graph("GET", "oauth/access_token", "", {
    ...credentials,
    grant_type: "fb_exchange_token",
    fb_exchange_token: initial.access_token,
  });
  if (!longLived.access_token)
    throw new Error("A Meta não retornou uma autorização válida.");
  return longLived.access_token as string;
}

export interface SocialCandidate {
  type: "instagram" | "facebook";
  externalId: string;
  pageId: string;
  name: string;
  identifier: string;
  token: string;
}

export async function socialCandidates(
  type: "instagram" | "facebook",
  token: string
): Promise<SocialCandidate[]> {
  const permissions = await graphList(
    "me/permissions",
    token,
    "permission,status"
  );
  const granted = new Set(
    permissions.filter(p => p.status === "granted").map(p => p.permission)
  );
  const isGranted = (scope: string) => {
    if (granted.has(scope)) return true;
    if (scope === "instagram_business_basic" && granted.has("instagram_basic")) return true;
    if (scope === "instagram_business_manage_messages" && granted.has("instagram_manage_messages")) return true;
    return false;
  };
  if (!process.env.META_CONFIG_ID && scopes(type).some(scope => !isGranted(scope))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Autorize todas as permissões de mensagens solicitadas para conectar o canal.",
    });
  }
  const fields =
    type === "instagram"
      ? "id,name,access_token,tasks,instagram_business_account{id,username,name}"
      : "id,name,access_token,tasks";
  const pages = await graphList("me/accounts", token, fields);
  console.log(`[Meta OAuth] ${type}: ${pages.length} página(s) retornada(s).`, pages.map(p => ({
    id: p.id,
    name: p.name,
    hasToken: Boolean(p.access_token),
    tasks: p.tasks,
    hasInstagram: Boolean(p.instagram_business_account?.id),
    igUsername: p.instagram_business_account?.username,
  })));
  return pages
    .filter(
      p =>
        p.access_token &&
        (!p.tasks?.length ||
          p.tasks.some((t: string) =>
            [
              "MESSAGING",
              "MANAGE",
              "MODERATE",
              "CREATE_CONTENT",
              "PROFILE_PLUS_MESSAGING",
              "PROFILE_PLUS_FULL_CONTROL",
            ].includes(t)
          ))
    )
    .filter(p => type === "facebook" || p.instagram_business_account?.id)
    .map(p => ({
      type,
      pageId: String(p.id),
      token: p.access_token,
      externalId: String(
        type === "facebook" ? p.id : p.instagram_business_account.id
      ),
      name:
        type === "facebook"
          ? p.name
          : p.instagram_business_account.name ||
            p.instagram_business_account.username,
      identifier:
        type === "facebook"
          ? `https://www.facebook.com/${p.id}`
          : `@${p.instagram_business_account.username}`,
    }));
}

export async function subscribeSocial(candidate: SocialCandidate) {
  // Facebook Login for Instagram uses the linked Page's token/subscription.
  const result = await graph(
    "POST",
    `${candidate.pageId}/subscribed_apps`,
    candidate.token,
    {
      subscribed_fields: "messages,messaging_postbacks",
    }
  );
  if (result.success !== true)
    throw new Error("A Meta não confirmou a assinatura de mensagens.");
}

export async function verifyWhatsapp(
  phoneNumberId: string,
  wabaId: string,
  token: string
) {
  requireMetaConfig();
  const debug = await graph(
    "GET",
    "debug_token",
    `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`,
    { input_token: token }
  );
  if (
    !debug.data?.is_valid ||
    String(debug.data.app_id) !== process.env.META_APP_ID ||
    ["whatsapp_business_management", "whatsapp_business_messaging"].some(
      scope => !debug.data.scopes?.includes(scope)
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Use um token válido do aplicativo Meta deste CRM, com permissões de gerenciamento e mensagens do WhatsApp.",
    });
  }
  const numbers = await graphList(
    `${wabaId}/phone_numbers`,
    token,
    "id,display_phone_number,verified_name,code_verification_status"
  );
  const number = numbers.find(n => String(n.id) === phoneNumberId);
  if (
    !number ||
    number.code_verification_status !== "VERIFIED" ||
    !number.display_phone_number
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "O número não está verificado ou não pertence à conta WhatsApp Business informada.",
    });
  }
  const subscription = await graph("POST", `${wabaId}/subscribed_apps`, token);
  if (subscription.success !== true)
    throw new Error(
      "A Meta não confirmou o recebimento de mensagens do WhatsApp."
    );
  return number;
}

export async function sendThroughChannel(
  channel: { type: string; externalId: string; pageId: string | null },
  token: string,
  recipient: string,
  text: string,
  media?: { url: string; type: "image" | "document" | "audio" }
) {
  let mediaUrl = media?.url;
  if (mediaUrl?.startsWith("/")) mediaUrl = `${publicOrigin()}${mediaUrl}`;
  if (mediaUrl && !/^https:\/\//.test(mediaUrl))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "O arquivo precisa de uma URL HTTPS acessível pela Meta.",
    });
  if (channel.type === "whatsapp") {
    const message: Record<string, any> = media
      ? {
          type: media.type,
          [media.type]: {
            link: mediaUrl,
            ...(text && media.type !== "audio" ? { caption: text } : {}),
          },
        }
      : { type: "text", text: { body: text } };
    const result = await graph(
      "POST",
      `${channel.externalId}/messages`,
      token,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient.replace(/\D/g, ""),
        ...message,
      }
    );
    if (!result.messages?.[0]?.id)
      throw new Error("A Meta não confirmou o envio.");
    return result.messages[0].id as string;
  }
  if (media && channel.type === "instagram" && media.type !== "image")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Neste canal Instagram, envie texto ou imagem.",
    });
  const result = await graph(
    "POST",
    `${channel.type === "instagram" ? channel.externalId : channel.pageId || channel.externalId}/messages`,
    token,
    {
      recipient: { id: recipient },
      ...(channel.type === "facebook" ? { messaging_type: "RESPONSE" } : {}),
      message: media
        ? {
            attachment: {
              type: media.type === "document" ? "file" : media.type,
              payload: { url: mediaUrl },
            },
          }
        : { text },
    }
  );
  if (!result.message_id) throw new Error("A Meta não confirmou o envio.");
  return result.message_id as string;
}
