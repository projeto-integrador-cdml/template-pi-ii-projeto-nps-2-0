import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { sendThroughChannel, verifyWhatsapp } from "./meta";

vi.mock("axios", () => ({ default: { request: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("META_APP_ID", "123");
  vi.stubEnv("META_APP_SECRET", "secret");
  vi.stubEnv("META_WEBHOOK_VERIFY_TOKEN", "verify");
});

describe("contratos da Meta", () => {
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
