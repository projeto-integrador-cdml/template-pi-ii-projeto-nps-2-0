import { beforeEach, describe, expect, it, vi } from "vitest";
import { channelsRouter } from "./router";
import * as repo from "./repository";
import * as meta from "./meta";
import * as db from "../db";
import { encryptSecret } from "./crypto";
import { sendClientMessage, resolveClientChannel } from "./service";
import type { TrpcContext } from "../_core/context";

vi.mock("./repository", async original => ({
  ...(await original<any>()),
  listChannels: vi.fn(),
  getChannel: vi.fn(),
  saveChannel: vi.fn(),
  updateChannel: vi.fn(),
  deleteChannel: vi.fn(),
  readFlow: vi.fn(),
  saveFlow: vi.fn(),
}));
vi.mock("./meta", async original => ({
  ...(await original<any>()),
  verifyWhatsapp: vi.fn(),
  subscribeSocial: vi.fn(),
  sendThroughChannel: vi.fn(),
}));
vi.mock("../db", () => ({
  createWhatsappMessage: vi.fn(async data => ({ id: 1, ...data })),
  bindClientChannel: vi.fn(),
  getDb: vi.fn(),
}));

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];
function context(companyId = 1, role = "user"): TrpcContext {
  return {
    user: { id: companyId, role, isActive: true } as any,
    attendant: null,
    req: { headers: {} } as any,
    res: { cookie: vi.fn() } as any,
  };
}
function channel(id = ids[0], type = "whatsapp"): repo.StoredChannel {
  return {
    id,
    companyId: 1,
    type,
    externalId: "123456",
    socialSlot: null,
    name: "Suporte",
    identifier: "+5511999999999",
    pageId: null,
    businessAccountId: "999999",
    status: "verified",
    tokenEncrypted: encryptSecret("token-secret"),
    lastVerifiedAt: new Date(),
    lastWebhookAt: null,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CHANNEL_ENCRYPTION_KEY", "a".repeat(64));
  vi.mocked(repo.listChannels).mockResolvedValue([]);
});

describe("API de canais e envio", () => {
  it("admin também lista somente sua própria empresa", async () => {
    await channelsRouter.createCaller(context(31, "admin")).list();
    expect(repo.listChannels).toHaveBeenCalledWith(31);
  });

  it("não permite atendente cadastrar, renomear ou desconectar", async () => {
    const ctx = context();
    ctx.attendant = { id: 2, companyId: 7, isActive: true } as any;
    const caller = channelsRouter.createCaller(ctx);
    await expect(
      caller.rename({ id: ids[0], name: "Outro nome" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.disconnect({ id: ids[0] })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.startSocialLogin({ type: "facebook" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller.list();
    expect(repo.listChannels).toHaveBeenCalledWith(7);
    expect(repo.deleteChannel).not.toHaveBeenCalled();
  });

  it("recusa usuários sem sessão e contas desativadas", async () => {
    const ctx = context();
    ctx.user = null;
    await expect(channelsRouter.createCaller(ctx).list()).rejects.toMatchObject(
      { code: "UNAUTHORIZED" }
    );
    const inactive = context();
    inactive.user!.isActive = false;
    await expect(
      channelsRouter.createCaller(inactive).list()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("não persiste número se a Meta rejeitar o token", async () => {
    vi.mocked(meta.verifyWhatsapp).mockRejectedValueOnce(
      new Error("Token inválido")
    );
    await expect(
      channelsRouter
        .createCaller(context())
        .connectWhatsapp({
          name: "Vendas",
          phoneNumberId: "123456",
          businessAccountId: "999999",
          accessToken: "x".repeat(30),
        })
    ).rejects.toThrow("Token inválido");
    expect(repo.saveChannel).not.toHaveBeenCalled();
  });

  it("usa a identidade confirmada pela Meta, gera o ID no servidor e não revela tokens", async () => {
    vi.mocked(meta.verifyWhatsapp).mockResolvedValueOnce({
      display_phone_number: "+55 11 99999-9999",
    });
    const result = await channelsRouter
      .createCaller(context())
      .connectWhatsapp({
        name: "Vendas",
        phoneNumberId: "123456",
        businessAccountId: "999999",
        accessToken: "x".repeat(30),
      });
    expect(result.identifier).toBe("+55 11 99999-9999");
    expect(result.status).toBe("verified");
    expect(result.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(result)).not.toContain("x".repeat(30));
  });

  it("responde pelo segundo WhatsApp quando esse é o canal da conversa", async () => {
    const selected = channel(ids[1]);
    vi.mocked(repo.getChannel).mockResolvedValue(selected);
    vi.mocked(meta.sendThroughChannel).mockResolvedValue("wamid.real");
    const result = await sendClientMessage(
      1,
      {
        id: 9,
        userId: 1,
        channelId: ids[1],
        externalContactId: "5511999999999",
      },
      { message: "Olá" },
      null
    );
    expect(repo.getChannel).toHaveBeenCalledWith(1, ids[1]);
    expect(meta.sendThroughChannel).toHaveBeenCalledWith(
      selected,
      "token-secret",
      "5511999999999",
      "Olá",
      undefined
    );
    expect(result).toMatchObject({
      channelId: ids[1],
      externalId: "wamid.real",
      status: "sent",
    });
  });

  it("não adivinha o número quando há mais de um WhatsApp", async () => {
    vi.mocked(repo.listChannels).mockResolvedValue([
      channel(),
      channel(ids[1]),
    ]);
    await expect(
      resolveClientChannel(1, { userId: 1, phone: "5511999999999" })
    ).rejects.toThrow("Selecione");
    await expect(
      resolveClientChannel(1, { userId: 2, channelId: ids[0] })
    ).rejects.toThrow("empresa");
    await expect(
      resolveClientChannel(1, { userId: 1, channelId: ids[0] }, ids[1])
    ).rejects.toThrow("origem");
  });

  it("falha de envio não produz mensagem marcada como enviada", async () => {
    vi.mocked(repo.getChannel).mockResolvedValue(channel());
    vi.mocked(meta.sendThroughChannel).mockRejectedValueOnce(
      new Error("Meta indisponível")
    );
    await expect(
      sendClientMessage(
        1,
        { id: 9, userId: 1, channelId: ids[0], phone: "5511999999999" },
        { message: "Teste" },
        null
      )
    ).rejects.toThrow();
    expect(db.createWhatsappMessage).not.toHaveBeenCalled();
  });

  it("notas internas nunca chamam a API da Meta", async () => {
    const result = await sendClientMessage(
      1,
      { id: 9, userId: 1 },
      { message: "Informação privada", internalNote: true },
      3
    );
    expect(meta.sendThroughChannel).not.toHaveBeenCalled();
    expect(result.message).toContain("[Nota Interna]");
  });

  it("envia respostas sociais para o identificador do contato recebido, sem tratar como telefone", async () => {
    const ig = channel(ids[0], "instagram");
    vi.mocked(repo.getChannel).mockResolvedValue(ig);
    vi.mocked(meta.sendThroughChannel).mockResolvedValue("ig.mid");
    await sendClientMessage(
      1,
      {
        id: 9,
        userId: 1,
        channelId: ids[0],
        externalContactId: "178414123456789",
      },
      { message: "Olá Instagram" },
      null
    );
    expect(meta.sendThroughChannel).toHaveBeenCalledWith(
      ig,
      "token-secret",
      "178414123456789",
      "Olá Instagram",
      undefined
    );
  });
});
