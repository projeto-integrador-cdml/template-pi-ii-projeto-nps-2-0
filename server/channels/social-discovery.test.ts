import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { scopes, socialCandidates } from "./meta";

vi.mock("axios", () => ({ default: { request: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("META_APP_ID", "123");
  vi.stubEnv("META_APP_SECRET", "app-secret");
  vi.stubEnv("META_CONFIG_ID", "business-config");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function mockGraph({ listed = [] as any[], granular = [] as any[], granted = scopes("instagram"), appId = "123", valid = true, lookup = {} as Record<string, any> } = {}) {
  vi.mocked(axios.request).mockImplementation(async (options: any) => {
    const endpoint = new URL(options.url).pathname.split("/").slice(2).join("/");
    if (endpoint === "debug_token") return { data: { data: { app_id: appId, is_valid: valid, type: "SYSTEM_USER", scopes: granted, granular_scopes: granular } } };
    if (endpoint === "me/accounts") return { data: { data: listed } };
    if (lookup[endpoint]) return { data: lookup[endpoint] };
    throw { response: { status: 403, data: { error: { code: 200 } } } };
  });
}

const page = (id = "12345") => ({ id, name: "Company Page", access_token: "page-secret", instagram_business_account: { id: "98765", username: "company", name: "Company" } });

describe("descoberta de contas autorizadas no login Meta", () => {
  it.each(["", "business-config"])("recusa Instagram sem pages_messaging antes de oferecer a conta (config=%s)", async configId => {
    vi.stubEnv("META_CONFIG_ID", configId);
    // These were the permissions granted by the failing production login.
    mockGraph({ granted: ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "instagram_basic", "instagram_manage_messages"], listed: [page()] });
    await expect(socialCandidates("instagram", "login-secret")).rejects.toThrow("Permissões ausentes: pages_messaging.");
    expect(axios.request).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith("[Meta OAuth] missing_permissions=pages_messaging");
  });

  it("recupera o Instagram por uma Pagina autorizada quando me/accounts esta vazio", async () => {
    mockGraph({ granular: [
      { scope: "pages_manage_metadata", target_ids: ["12345", "12345"] },
      { scope: "instagram_basic", target_ids: ["98765"] },
      { scope: "business_management", target_ids: ["55555"] },
    ], lookup: { "12345": page() } });
    await expect(socialCandidates("instagram", "login-secret")).resolves.toEqual([
      { type: "instagram", externalId: "98765", pageId: "12345", name: "Company", identifier: "@company", token: "page-secret" },
    ]);
    const calls = vi.mocked(axios.request).mock.calls.map(([options]) => options as any);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatchObject({ headers: { Authorization: "Bearer 123|app-secret" }, params: { input_token: "login-secret" } });
    expect(calls[2]).toMatchObject({ headers: { Authorization: "Bearer login-secret" } });
    expect(calls[2].url).toMatch(/\/12345$/);
    expect(calls[2].params.fields).not.toContain("tasks");
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toMatch(/page-secret|login-secret|app-secret/);
  });

  it("mantem o caminho normal quando a listagem retorna a Pagina", async () => {
    mockGraph({ listed: [{ ...page(), tasks: ["MESSAGING"] }] });
    expect(await socialCandidates("instagram", "login-secret")).toHaveLength(1);
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it.each([{ appId: "another-app" }, { valid: false }])("recusa token invalido ou de outro aplicativo: %j", async options => {
    mockGraph(options);
    await expect(socialCandidates("instagram", "login-secret")).rejects.toThrow("autorizacao nao pertence");
    expect(axios.request).toHaveBeenCalledOnce();
  });

  it("exige permissoes de mensagens mesmo com META_CONFIG_ID", async () => {
    mockGraph({ granted: ["pages_show_list", "instagram_basic"] });
    await expect(socialCandidates("instagram", "login-secret")).rejects.toThrow("todas as permissões");
    expect(axios.request).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("instagram_manage_messages"));
  });

  it("nao usa IDs de Instagram ou de portfolio como IDs de Paginas", async () => {
    mockGraph({ granular: [
      { scope: "instagram_basic", target_ids: ["98765"] },
      { scope: "business_management", target_ids: ["55555"] },
      { scope: "pages_show_list", target_ids: ["../private", "not-a-page"] },
    ] });
    expect(await socialCandidates("instagram", "login-secret")).toEqual([]);
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it("nao oferece uma Pagina diferente da indicada na autorizacao", async () => {
    mockGraph({ granular: [{ scope: "pages_show_list", target_ids: ["12345"] }], lookup: { "12345": page("99999") } });
    await expect(socialCandidates("instagram", "login-secret")).rejects.toThrow("Pagina diferente");
  });

  it("nao oferece conta sem token de Pagina ou vinculo Instagram", async () => {
    mockGraph({ listed: [{ ...page(), access_token: undefined }, { ...page("54321"), instagram_business_account: undefined }] });
    expect(await socialCandidates("instagram", "login-secret")).toEqual([]);
  });

  it("recupera Messenger pela mesma autorizacao de Pagina", async () => {
    mockGraph({ granted: scopes("facebook"), granular: [{ scope: "pages_messaging", target_ids: ["12345"] }], lookup: { "12345": page() } });
    expect(await socialCandidates("facebook", "login-secret")).toEqual([
      { type: "facebook", externalId: "12345", pageId: "12345", name: "Company Page", identifier: "https://www.facebook.com/12345", token: "page-secret" },
    ]);
  });

  it("mantem contas legiveis quando outra Pagina autorizada recusa a consulta", async () => {
    mockGraph({ granular: [{ scope: "pages_manage_metadata", target_ids: ["12345", "54321"] }], lookup: { "12345": page() } });
    expect(await socialCandidates("instagram", "login-secret")).toHaveLength(1);
  });
});
