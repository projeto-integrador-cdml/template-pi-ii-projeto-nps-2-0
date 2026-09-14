import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateChannels } from "./migration";

const mocks = vi.hoisted(() => ({ connect: vi.fn(), execute: vi.fn(), end: vi.fn(), readFile: vi.fn() }));
vi.mock("mysql2/promise", () => ({ default: { createConnection: mocks.connect } }));
vi.mock("node:fs/promises", () => ({ default: { readFile: mocks.readFile } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATABASE_URL", "mysql://test:unused@localhost/test");
  vi.stubEnv("DATABASE_SSL_CA_PATH", "");
  vi.stubEnv("DATABASE_SSL_CA_PEM", "");
  vi.stubEnv("DATABASE_SSL_REJECT_UNAUTHORIZED", "");
  vi.stubEnv("CHANNEL_MIGRATION_HASH", "test-hash");
  mocks.connect.mockResolvedValue({ execute: mocks.execute, end: mocks.end });
  mocks.execute.mockResolvedValue([[{ id: 1 }]]);
  mocks.end.mockResolvedValue(undefined);
  mocks.readFile.mockResolvedValue("AIVEN_CA_TEST");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("migracao dos canais na hospedagem", () => {
  it("usa o CA da Aiven com verificacao TLS e preserva estruturas existentes ao repetir", async () => {
    await migrateChannels();
    await migrateChannels();
    expect(mocks.readFile).toHaveBeenCalledWith("certs/aiven-ca.pem", "utf8");
    expect(mocks.connect).toHaveBeenCalledWith(expect.objectContaining({ ssl: { ca: "AIVEN_CA_TEST", rejectUnauthorized: true } }));
    const statements = mocks.execute.mock.calls.map(([query]) => query);
    expect(statements.some(query => /ALTER TABLE|DROP TABLE|DELETE FROM|INSERT INTO/i.test(query))).toBe(false);
    expect(mocks.end).toHaveBeenCalledTimes(2);
  });

  it("aceita o CA em variavel com quebras de linha escapadas", async () => {
    vi.stubEnv("DATABASE_SSL_CA_PEM", "BEGIN\\nCERTIFICATE\\nEND");
    await migrateChannels();
    expect(mocks.readFile).not.toHaveBeenCalled();
    expect(mocks.connect).toHaveBeenCalledWith(expect.objectContaining({ ssl: { ca: "BEGIN\nCERTIFICATE\nEND", rejectUnauthorized: true } }));
  });

  it("interrompe antes de conectar quando o caminho configurado nao existe", async () => {
    vi.stubEnv("DATABASE_SSL_CA_PATH", "missing.pem");
    mocks.readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    await expect(migrateChannels()).rejects.toThrow("DATABASE_SSL_CA_PATH");
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("explica o erro TLS sem desabilitar validacao ou executar DDL", async () => {
    mocks.connect.mockRejectedValue(Object.assign(new Error("certificate failure"), { code: "HANDSHAKE_SSL_ERROR" }));
    await expect(migrateChannels()).rejects.toThrow("certs/aiven-ca.pem");
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });
});
