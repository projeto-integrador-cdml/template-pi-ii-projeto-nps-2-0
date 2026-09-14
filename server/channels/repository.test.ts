import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import * as repo from "./repository";
import { encryptSecret, decryptSecret } from "./crypto";

vi.mock("../db", () => ({ getDb: vi.fn(async () => null) }));
let directory: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "crm-channels-test-"));
  vi.stubEnv("CHANNEL_STORE_PATH", path.join(directory, "channels.json"));
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("CHANNEL_ENCRYPTION_KEY", "a".repeat(64));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(directory, { recursive: true, force: true });
});

function channel(
  companyId: number,
  type = "whatsapp",
  externalId = crypto.randomUUID(),
  pageId: string | null = null
): repo.StoredChannel {
  return {
    id: crypto.randomUUID(),
    companyId,
    type,
    externalId,
    socialSlot: type === "whatsapp" ? null : `${companyId}:${type}`,
    name: "Atendimento",
    identifier: externalId,
    pageId,
    businessAccountId: null,
    tokenEncrypted: encryptSecret("secret-access-token"),
    status: "verified",
    lastVerifiedAt: new Date(),
    lastWebhookAt: null,
  };
}

describe("isolamento persistente dos canais", () => {
  it("permite vários números e limita cada rede social por empresa", async () => {
    const first = channel(1, "instagram", "ig-1", "page-1");
    await repo.saveChannel(channel(1));
    await repo.saveChannel(channel(1));
    await repo.saveChannel(first);
    await repo.saveChannel(channel(1, "facebook", "page-1", "page-1"));
    await expect(
      repo.saveChannel(channel(1, "instagram", "ig-2", "page-2"))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      repo.saveChannel(channel(1, "facebook", "page-2", "page-2"))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await repo.listChannels(1)).toHaveLength(4);
    expect(await repo.listChannels(2)).toEqual([]);
  });

  it("impede duas empresas de disputar o mesmo número simultaneamente", async () => {
    const attempts = await Promise.allSettled([
      repo.saveChannel(channel(1, "whatsapp", "number-1")),
      repo.saveChannel(channel(2, "whatsapp", "number-1")),
    ]);
    expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(
      (await repo.listChannels(1)).length + (await repo.listChannels(2)).length
    ).toBe(1);
  });

  it("protege também a Página vinculada ao Instagram de outra empresa", async () => {
    await repo.saveChannel(channel(1, "instagram", "ig-1", "page-1"));
    await expect(
      repo.saveChannel(channel(2, "facebook", "page-1", "page-1"))
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("não permite consultar, editar ou excluir o canal de outra empresa", async () => {
    const first = channel(1);
    await repo.saveChannel(first);
    await expect(repo.getChannel(2, first.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      repo.saveChannel({ ...first, companyId: 2 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await repo.updateChannel(2, first.id, { name: "Invadido" });
    await repo.deleteChannel(2, first.id);
    expect((await repo.getChannel(1, first.id)).name).toBe("Atendimento");
  });

  it("mantém a reserva da Página enquanto o outro canal ainda a utiliza", async () => {
    const ig = channel(1, "instagram", "ig-1", "page-1");
    const fb = channel(1, "facebook", "page-1", "page-1");
    await repo.saveChannel(ig);
    await repo.saveChannel(fb);
    await repo.deleteChannel(1, fb.id);
    await expect(
      repo.saveChannel(channel(2, "facebook", "page-1", "page-1"))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await repo.deleteChannel(1, ig.id);
    await expect(
      repo.saveChannel(channel(2, "facebook", "page-1", "page-1"))
    ).resolves.toBeUndefined();
  });

  it("criptografa tokens e não os inclui na resposta pública", async () => {
    const saved = channel(1);
    await repo.saveChannel(saved);
    const contents = await fs.readFile(
      path.join(directory, "channels.json"),
      "utf8"
    );
    expect(contents).not.toContain("secret-access-token");
    expect(decryptSecret(saved.tokenEncrypted)).toBe("secret-access-token");
    expect(repo.publicChannel(saved)).not.toHaveProperty("tokenEncrypted");
    expect(repo.publicChannel(saved)).not.toHaveProperty("accessToken");
    vi.stubEnv("CHANNEL_ENCRYPTION_KEY", "b".repeat(64));
    expect(() => decryptSecret(saved.tokenEncrypted)).toThrow();
  });

  it("consome o login uma única vez e impede uso por outra empresa", async () => {
    const id = "c".repeat(64);
    await repo.saveFlow({
      id,
      companyId: 1,
      payload: encryptSecret("payload"),
      expiresAt: new Date(Date.now() + 60000),
    });
    await expect(repo.readFlow(2, id, true)).rejects.toThrow();
    const results = await Promise.allSettled([
      repo.readFlow(1, id, true),
      repo.readFlow(1, id, true),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await repo.saveFlow({
      id,
      companyId: 1,
      payload: "expired",
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(repo.readFlow(1, id)).rejects.toThrow();
  });

  it("não usa um banco JSON paralelo se o MySQL configurado estiver indisponível", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://configured-but-unavailable");
    await expect(repo.listChannels(1)).rejects.toThrow("MySQL");
  });
});
