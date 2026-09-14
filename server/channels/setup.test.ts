import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ load: vi.fn(), migrate: vi.fn(), startBot: vi.fn() }));
vi.mock("../../crm_discord_js/server.js", () => ({ loadBackend: mocks.load }));
vi.mock("../../crm_discord_js/bot.js", () => { mocks.startBot(); return {}; });
vi.mock("dotenv/config", () => ({}));
let previousExitCode: typeof process.exitCode;
beforeEach(() => {
  previousExitCode = process.exitCode;
  vi.resetModules();
  vi.resetAllMocks();
  mocks.load.mockResolvedValue({ migrateChannels: mocks.migrate });
  mocks.migrate.mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { process.exitCode = previousExitCode; vi.restoreAllMocks(); });

describe("inicializacao pelo painel Blaze", () => {
  it("aguarda a migracao antes de carregar o bot", async () => {
    await import("../../crm_discord_js/setup.js");
    expect(mocks.migrate).toHaveBeenCalledOnce();
    expect(mocks.startBot).toHaveBeenCalledOnce();
    expect(mocks.migrate.mock.invocationCallOrder[0]).toBeLessThan(mocks.startBot.mock.invocationCallOrder[0]);
  });

  it("nao inicia o bot se a migracao falhar", async () => {
    mocks.migrate.mockRejectedValue(new Error("Certificado CA ausente"));
    await import("../../crm_discord_js/setup.js");
    expect(mocks.startBot).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith("[Setup] Inicializacao interrompida:", "Certificado CA ausente");
  });
});
