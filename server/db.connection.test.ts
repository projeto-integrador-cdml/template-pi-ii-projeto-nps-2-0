import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPool: vi.fn(), execute: vi.fn(), end: vi.fn(),
}));
vi.mock("mysql2/promise", () => ({ default: { createPool: mocks.createPool } }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => ({ execute: mocks.execute }) }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_URL", "mysql://test:unused@localhost/test");
  mocks.createPool.mockReturnValue({ end: mocks.end });
  mocks.end.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue([]);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("conexao principal do MySQL", () => {
  it("verifica a conexao imediatamente e faz apenas um heartbeat a cada 3 horas", async () => {
    const { getDb } = await import("./db");
    const [first, second] = await Promise.all([getDb(), getDb()]);
    expect(first).toBe(second);
    expect(mocks.createPool).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000 - 1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("encerra o pool que falhou e permite reconectar sem trocar para JSON", async () => {
    mocks.execute.mockRejectedValueOnce(new Error("database password must not appear in logs"));
    const db = await import("./db");
    await expect(db.getDb()).rejects.toThrow("Banco MySQL indisponivel");
    expect(db.useJsonDb).toBe(false);
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining("password"));
    expect(vi.getTimerCount()).toBe(0);
    await expect(db.getDb()).resolves.toBeTruthy();
    expect(mocks.createPool).toHaveBeenCalledTimes(2);
  });

  it("recusa banco ausente em producao", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const db = await import("./db");
    await expect(db.getDb()).rejects.toThrow("Configure DATABASE_URL");
    expect(db.useJsonDb).toBe(false);
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it("mantem JSON disponivel para desenvolvimento sem MySQL configurado", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    const db = await import("./db");
    await expect(db.getDb()).resolves.toBeNull();
    expect(db.useJsonDb).toBe(true);
  });
});
