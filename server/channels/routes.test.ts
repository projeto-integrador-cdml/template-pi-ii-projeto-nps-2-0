import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import {
  processMetaWebhook,
  registerMetaRoutes,
  validSignature,
} from "./routes";
import * as repo from "./repository";
import * as db from "../db";
import * as meta from "./meta";
import { encryptSecret } from "./crypto";
import { sdk } from "../_core/sdk";

vi.mock("./repository", () => ({
  findByIdentity: vi.fn(),
  updateChannel: vi.fn(),
  readFlow: vi.fn(),
  saveFlow: vi.fn(),
}));
vi.mock("../db", () => ({
  getUserById: vi.fn(),
  channelMessageExists: vi.fn(),
  routeIncomingWhatsappMessage: vi.fn(),
  updateChannelMessageStatus: vi.fn(),
}));
vi.mock("./meta", async original => ({
  ...(await original<any>()),
  exchangeCode: vi.fn(),
  socialCandidates: vi.fn(),
}));
vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));
vi.mock("../whatsappService", () => ({ downloadMetaMedia: vi.fn() }));
vi.mock("../services/aiOrchestrator", () => ({
  processIncomingMessage: vi.fn(async () => ({ replyText: "" })),
}));
vi.mock("./service", () => ({ sendClientMessage: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CHANNEL_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("PUBLIC_APP_URL", "https://crm.example.com");
  vi.mocked(db.getUserById).mockResolvedValue({
    id: 12,
    isActive: true,
  } as any);
  vi.mocked(db.channelMessageExists).mockResolvedValue(false);
  vi.mocked(db.routeIncomingWhatsappMessage).mockResolvedValue({
    msg: {},
    assignedAttendantId: null,
  });
});
const channel = (type: string, externalId: string) =>
  ({
    id: `local-${externalId}`,
    companyId: 12,
    type,
    externalId,
    tokenEncrypted: encryptSecret("secret-token"),
  }) as repo.StoredChannel;

describe("webhook Meta", () => {
  it("recusa assinaturas ausentes, inválidas e conteúdo alterado", () => {
    const body = Buffer.from('{"entry":[]}');
    const signature = `sha256=${crypto.createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(validSignature(body, signature, "secret")).toBe(true);
    expect(validSignature(Buffer.from("changed"), signature, "secret")).toBe(
      false
    );
    expect(validSignature(body, undefined, "secret")).toBe(false);
    expect(validSignature(body, "sha256=123", "secret")).toBe(false);
    expect(validSignature(body, signature, undefined)).toBe(false);
  });

  it("processa todos os números de todos os itens e roteia pela identidade do canal", async () => {
    vi.mocked(repo.findByIdentity).mockImplementation(async (type, id) =>
      channel(type, id)
    );
    await processMetaWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-1" },
                messages: [
                  {
                    id: "m1",
                    from: "5511111111111",
                    type: "text",
                    text: { body: "Primeiro" },
                  },
                ],
              },
            },
            {
              value: {
                metadata: { phone_number_id: "phone-2" },
                messages: [
                  {
                    id: "m2",
                    from: "5511111111111",
                    text: { body: "Segundo" },
                  },
                ],
              },
            },
          ],
        },
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-3" },
                statuses: [{ id: "outbound", status: "read" }],
              },
            },
          ],
        },
      ],
    });
    expect(db.routeIncomingWhatsappMessage).toHaveBeenNthCalledWith(
      1,
      12,
      "+5511111111111",
      "WhatsApp 5511111111111",
      "Primeiro",
      undefined,
      {
        id: "local-phone-1",
        type: "whatsapp",
        externalContactId: "5511111111111",
        externalId: "m1",
      }
    );
    expect(db.routeIncomingWhatsappMessage).toHaveBeenNthCalledWith(
      2,
      12,
      "+5511111111111",
      "WhatsApp 5511111111111",
      "Segundo",
      undefined,
      {
        id: "local-phone-2",
        type: "whatsapp",
        externalContactId: "5511111111111",
        externalId: "m2",
      }
    );
    expect(db.updateChannelMessageStatus).toHaveBeenCalledWith(
      12,
      "local-phone-3",
      "outbound",
      "read"
    );
  });

  it("ignora contas desconhecidas, mensagens repetidas e ecos", async () => {
    vi.mocked(repo.findByIdentity).mockResolvedValue(undefined);
    const event = {
      object: "instagram",
      entry: [
        {
          id: "ig1",
          messaging: [
            { sender: { id: "customer" }, message: { mid: "m1", text: "Olá" } },
          ],
        },
      ],
    };
    await processMetaWebhook(event);
    expect(db.routeIncomingWhatsappMessage).not.toHaveBeenCalled();
    vi.mocked(repo.findByIdentity).mockResolvedValue(
      channel("instagram", "ig1")
    );
    vi.mocked(db.channelMessageExists).mockResolvedValue(true);
    await processMetaWebhook(event);
    expect(db.routeIncomingWhatsappMessage).not.toHaveBeenCalled();
    vi.mocked(db.channelMessageExists).mockResolvedValue(false);
    event.entry[0].messaging[0].message = {
      mid: "m1",
      text: "Olá",
      is_echo: true,
    } as any;
    await processMetaWebhook(event);
    expect(db.routeIncomingWhatsappMessage).not.toHaveBeenCalled();
  });

  it("recebe Instagram e Messenger na empresa proprietária", async () => {
    vi.mocked(repo.findByIdentity).mockImplementation(async (type, id) =>
      channel(type, id)
    );
    for (const object of ["instagram", "page"])
      await processMetaWebhook({
        object,
        entry: [
          {
            id: "account",
            messaging: [
              {
                sender: { id: "customer" },
                message: { mid: `${object}-message`, text: "Olá" },
              },
            ],
          },
        ],
      });
    expect(db.routeIncomingWhatsappMessage).toHaveBeenCalledTimes(2);
    expect(db.routeIncomingWhatsappMessage).toHaveBeenCalledWith(
      12,
      "instagram:customer",
      "Instagram customer",
      "Olá",
      undefined,
      expect.objectContaining({
        type: "instagram",
        externalContactId: "customer",
      })
    );
    expect(db.routeIncomingWhatsappMessage).toHaveBeenCalledWith(
      12,
      "facebook:customer",
      "Facebook customer",
      "Olá",
      undefined,
      expect.objectContaining({
        type: "facebook",
        externalContactId: "customer",
      })
    );
  });
});

describe("retorno de login OAuth", () => {
  function setup() {
    const handlers = new Map<string, any>();
    registerMetaRoutes({
      get: (path: string, handler: any) => handlers.set(path, handler),
      post: vi.fn(),
    } as any);
    const res = { setHeader: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn() };
    return { callback: handlers.get("/api/meta/callback"), res };
  }

  it("vincula o retorno à empresa e ao navegador e armazena as escolhas sem tokens na URL", async () => {
    const { callback, res } = setup();
    const state = "b".repeat(64);
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: 12,
      isActive: true,
    } as any);
    vi.mocked(repo.readFlow).mockResolvedValue({
      id: state,
      companyId: 12,
      expiresAt: new Date(Date.now() + 1000),
      payload: encryptSecret(
        JSON.stringify({
          phase: "login",
          type: "facebook",
          browserNonce: "browser",
        })
      ),
    });
    vi.mocked(meta.exchangeCode).mockResolvedValue("user-token");
    vi.mocked(meta.socialCandidates).mockResolvedValue([
      {
        externalId: "123",
        pageId: "123",
        type: "facebook",
        name: "Página",
        identifier: "Página",
        token: "page-secret",
      },
    ]);
    await callback(
      {
        headers: { cookie: "meta_channel_oauth=browser" },
        query: { state, code: "authorization-code" },
      },
      res
    );
    expect(repo.readFlow).toHaveBeenCalledWith(12, state, true);
    expect(repo.saveFlow).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 12 })
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/crm.example.com\/channels\?meta_flow=[a-f0-9]{64}$/
      )
    );
    expect(JSON.stringify(res.redirect.mock.calls)).not.toContain(
      "page-secret"
    );
    expect(JSON.stringify(repo.saveFlow.mock.calls)).not.toContain(
      "page-secret"
    );
  });

  it("recusa estado de outro navegador antes de trocar o código", async () => {
    const { callback, res } = setup();
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: 12,
      isActive: true,
    } as any);
    vi.mocked(repo.readFlow).mockResolvedValue({
      payload: encryptSecret(
        JSON.stringify({
          phase: "login",
          type: "facebook",
          browserNonce: "correct",
        })
      ),
    } as any);
    await callback(
      {
        headers: { cookie: "meta_channel_oauth=wrong" },
        query: { state: "b".repeat(64), code: "code" },
      },
      res
    );
    expect(meta.exchangeCode).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      "https://crm.example.com/channels?meta_error=authorization&meta_stage=browser"
    );
  });

  it.each(["session", "code_exchange", "accounts", "save_selection"])("identifica a falha em %s sem expor a autorizacao", async stage => {
    const { callback, res } = setup();
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const failure = new Error("secret-token-and-sql");
      vi.mocked(sdk.authenticateRequest).mockResolvedValue({ id: 12, isActive: true } as any);
      vi.mocked(repo.readFlow).mockResolvedValue({ payload: encryptSecret(JSON.stringify({ phase: "login", type: "instagram", browserNonce: "browser" })) } as any);
      vi.mocked(meta.exchangeCode).mockResolvedValue("secret-token");
      vi.mocked(meta.socialCandidates).mockResolvedValue([{ externalId: "123", token: "secret-token" }] as any);
      if (stage === "session") vi.mocked(sdk.authenticateRequest).mockRejectedValue(failure);
      if (stage === "code_exchange") vi.mocked(meta.exchangeCode).mockRejectedValue(failure);
      if (stage === "accounts") vi.mocked(meta.socialCandidates).mockRejectedValue(failure);
      if (stage === "save_selection") vi.mocked(repo.saveFlow).mockRejectedValue(failure);
      await callback({ headers: { cookie: "meta_channel_oauth=browser" }, query: { state: "b".repeat(64), code: "private-code" } }, res);
      expect(res.redirect).toHaveBeenCalledWith(`https://crm.example.com/channels?meta_error=authorization&meta_stage=${stage}`);
      expect(log).toHaveBeenCalledWith(`[Meta OAuth] callback_failed stage=${stage}`);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret-token|private-code/);
      if (stage === "session") expect(meta.exchangeCode).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
