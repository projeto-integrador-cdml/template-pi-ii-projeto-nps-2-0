import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { exchangeCode, sendThroughChannel, subscribeSocial, verifyWhatsapp } from "./meta";

vi.mock("axios", () => ({ default: { request: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("META_APP_ID", "123");
  vi.stubEnv("META_APP_SECRET", "secret");
  vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "verify");
});

describe("contratos da Meta", () => {
  it.each(["instagram", "facebook"] as const)("assina os eventos de %s com o token da Pagina autorizada", async type => {
    vi.mocked(axios.request).mockResolvedValueOnce({ data: { success: true } });
    await subscribeSocial({ type, externalId: "ig-id", pageId: "page-id", token: "page-token", name: "Empresa", identifier: "empresa" });
    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(axios.request).toHaveBeenLastCalledWith(expect.objectContaining({
      method: "POST", url: expect.stringContaining("/page-id/subscribed_apps"),
      headers: { Authorization: "Bearer page-token" },
      data: { subscribed_fields: type === "instagram" ? "messages" : "messages,messaging_postbacks" },
    }));
  });

  it("identifica a permissao citada na recusa sem expor a mensagem bruta da Meta", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.mocked(axios.request).mockRejectedValueOnce({
        config: { headers: { Authorization: "Bearer private-token" } },
        response: { status: 403, data: { error: { code: 200,
          message: "To subscribe to messages, pages_manage_metadata is needed. private-token https://example.com/?secret=private-secret",
        } } },
      });
      await expect(subscribeSocial({ type: "instagram", externalId: "ig-id", pageId: "page-id", token: "private-token", name: "Empresa", identifier: "empresa" }))
        .rejects.toThrow("Permissões citadas pela Meta: pages_manage_metadata.");
      expect(log).toHaveBeenCalledWith("[Meta OAuth] operation=subscribe_webhook http=403 code=200 subcode=unknown requested_fields=messages permission_hints=pages_manage_metadata field_hints=messages");
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-token|private-secret|example.com/);
    } finally { log.mockRestore(); }
  });

  it("exige confirmacao da Meta antes de concluir a assinatura", async () => {
    vi.mocked(axios.request).mockResolvedValueOnce({ data: { success: false } });
    await expect(subscribeSocial({ type: "instagram", externalId: "ig-id", pageId: "page-id", token: "token", name: "Empresa", identifier: "empresa" }))
      .rejects.toThrow("não confirmou a assinatura");
  });

  it("troca o codigo sem enviar Bearer vazio e usa o token recebido na extensao", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://crm.example.com");
    vi.mocked(axios.request).mockResolvedValueOnce({ data: { access_token: "short-token" } });
    vi.mocked(axios.request).mockResolvedValueOnce({ data: { access_token: "long-token" } });
    await expect(exchangeCode("auth-code")).resolves.toBe("long-token");
    const calls = vi.mocked(axios.request).mock.calls.map(([options]) => options);
    expect(calls[0]).not.toHaveProperty("headers.Authorization");
    expect(calls[0].params).toMatchObject({ code: "auth-code", redirect_uri: "https://crm.example.com/api/meta/callback" });
    expect(calls[1]).not.toHaveProperty("headers.Authorization");
    expect(calls[1].params).toMatchObject({ fb_exchange_token: "short-token" });
  });

  it("nao tenta estender uma resposta sem token", async () => {
    vi.mocked(axios.request).mockResolvedValueOnce({ data: {} });
    await expect(exchangeCode("auth-code")).rejects.toThrow("autorizacao valida");
    expect(axios.request).toHaveBeenCalledOnce();
  });

  it("registra somente a operacao e codigos numericos quando a Meta recusa a troca", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.mocked(axios.request).mockRejectedValue({
        message: "secret-details", config: { params: { code: "secret-details" } },
        response: { status: 400, data: { error: { code: 100, error_subcode: 36008, message: "secret-details" } } },
      });
      await expect(exchangeCode("secret-details")).rejects.toThrow();
      expect(log).toHaveBeenCalledWith("[Meta OAuth] operation=code_exchange http=400 code=100 subcode=36008");
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-details");
    } finally { log.mockRestore(); }
  });

  it("valida aplicativo, permissões, WABA e número antes de assinar mensagens", async () => {
    vi.mocked(axios.request).mockResolvedValueOnce({
      data: {
        data: {
          is_valid: true,
          app_id: "123",
          scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
          ],
        },
      },
    });
    vi.mocked(axios.request).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "789",
            display_phone_number: "+5511999999999",
            code_verification_status: "VERIFIED",
          },
        ],
      },
    });
    vi.mocked(axios.request).mockResolvedValueOnce({ data: { success: true } });
    const result = await verifyWhatsapp("789", "456", "user-token");
    expect(result.display_phone_number).toBe("+5511999999999");
    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: "POST",
        url: expect.stringContaining("/456/subscribed_apps"),
      })
    );
  });

  it("não aceita credencial emitida por outro aplicativo", async () => {
    vi.mocked(axios.request).mockResolvedValueOnce({
      data: { data: { is_valid: true, app_id: "other" } },
    });
    await expect(verifyWhatsapp("789", "456", "token")).rejects.toThrow(
      "aplicativo Meta deste CRM"
    );
    expect(axios.request).toHaveBeenCalledTimes(1);
  });

  it("não cadastra um número que não pertence à WABA", async () => {
    vi.mocked(axios.request).mockResolvedValueOnce({
      data: {
        data: {
          is_valid: true,
          app_id: "123",
          scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
          ],
        },
      },
    });
    vi.mocked(axios.request).mockResolvedValueOnce({
      data: { data: [{ id: "other" }] },
    });
    await expect(verifyWhatsapp("789", "456", "token")).rejects.toThrow(
      "não pertence"
    );
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it("usa o endpoint e destinatário corretos para Facebook e Instagram", async () => {
    vi.mocked(axios.request).mockResolvedValue({ data: { message_id: "mid" } });
    await sendThroughChannel(
      { type: "facebook", externalId: "page1", pageId: "page1" },
      "secret",
      "psid",
      "Olá"
    );
    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("/page1/messages"),
        data: {
          recipient: { id: "psid" },
          messaging_type: "RESPONSE",
          message: { text: "Olá" },
        },
      })
    );
    await sendThroughChannel(
      { type: "instagram", externalId: "ig1", pageId: "page1" },
      "secret",
      "igsid",
      "Olá"
    );
    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("/ig1/messages"),
        data: { recipient: { id: "igsid" }, message: { text: "Olá" } },
      })
    );
  });

  it("erros da API não vazam o token do Axios", async () => {
    vi.mocked(axios.request).mockRejectedValue({
      message: "request with secret-token",
      config: { headers: { Authorization: "Bearer secret-token" } },
      response: { data: { error: { code: 190 } } },
    });
    try {
      await sendThroughChannel(
        { type: "facebook", externalId: "1", pageId: "1" },
        "secret-token",
        "psid",
        "Olá"
      );
      throw new Error("Expected failure");
    } catch (error: any) {
      expect(error.message).toContain("expirou");
      expect(JSON.stringify(error)).not.toContain("secret-token");
    }
  });
});
