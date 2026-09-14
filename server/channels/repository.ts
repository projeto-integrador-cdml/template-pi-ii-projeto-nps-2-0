import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  companyChannels,
  channelResourceClaims,
  channelAuthFlows,
  users,
} from "../../drizzle/schema";
import type {
  ChannelType,
  ChannelStatus,
  PublicChannel,
} from "../../shared/channels";

export type StoredChannel = typeof companyChannels.$inferSelect;
type Flow = typeof channelAuthFlows.$inferSelect;
type LocalData = { channels: StoredChannel[]; flows: Flow[] };

// JSON mode is for local installations only. A lock and atomic replacement protect
// identities across simultaneous requests/processes; MySQL uses unique indexes.
async function local<T>(fn: (data: LocalData) => T): Promise<T> {
  const file = path.resolve(
    process.env.CHANNEL_STORE_PATH || "data/channels.json"
  );
  await fs.mkdir(path.dirname(file), { recursive: true });
  let lock;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      lock = await fs.open(`${file}.lock`, "wx");
      break;
    } catch (e: any) {
      if (e.code !== "EEXIST") throw e;
      await new Promise(r => setTimeout(r, 25));
    }
  }
  if (!lock) throw new Error("Cadastro ocupado. Tente novamente.");
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    let data: LocalData;
    try {
      data = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      data = { channels: [], flows: [] };
    }
    const result = fn(data);
    await fs.writeFile(temp, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(temp, file);
    return result;
  } finally {
    await fs.rm(temp, { force: true });
    await lock.close();
    await fs.unlink(`${file}.lock`);
  }
}

async function database() {
  const db = await getDb();
  // Never silently switch a configured installation to a separate tenant registry.
  if (!db && process.env.DATABASE_URL)
    throw new Error("Banco de canais indisponível. Verifique a conexão MySQL.");
  if (!db && process.env.NODE_ENV === "production")
    throw new Error("Configure MySQL para os canais em produção.");
  return db;
}

function conflict(): never {
  throw new TRPCError({
    code: "CONFLICT",
    message:
      "Conta já vinculada ou limite de um Instagram/Facebook por empresa atingido. Desconecte o vínculo anterior antes de trocar.",
  });
}

export function resources(
  channel: Pick<StoredChannel, "type" | "externalId" | "pageId">
): string[] {
  return Array.from(
    new Set([
      `${channel.type}:${channel.externalId}`,
      ...(channel.pageId ? [`facebook:${channel.pageId}`] : []),
    ])
  ).sort();
}

export function publicChannel(c: StoredChannel): PublicChannel {
  return {
    id: c.id,
    name: c.name,
    type: c.type as ChannelType,
    identifier: c.identifier,
    externalId: c.externalId,
    status: c.status as ChannelStatus,
    lastVerifiedAt: c.lastVerifiedAt
      ? new Date(c.lastVerifiedAt).toISOString()
      : null,
    lastWebhookAt: c.lastWebhookAt
      ? new Date(c.lastWebhookAt).toISOString()
      : null,
  };
}

export async function listChannels(
  companyId: number
): Promise<StoredChannel[]> {
  const db = await database();
  return db
    ? db
        .select()
        .from(companyChannels)
        .where(eq(companyChannels.companyId, companyId))
    : local(data => data.channels.filter(c => c.companyId === companyId));
}

export async function getChannel(
  companyId: number,
  id: string
): Promise<StoredChannel> {
  const channel = (await listChannels(companyId)).find(c => c.id === id);
  if (!channel)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Canal não encontrado nesta empresa.",
    });
  return channel;
}

export async function findByIdentity(
  type: ChannelType,
  externalId: string
): Promise<StoredChannel | undefined> {
  const db = await database();
  if (!db)
    return local(data =>
      data.channels.find(c => c.type === type && c.externalId === externalId)
    );
  return (
    await db
      .select()
      .from(companyChannels)
      .where(
        and(
          eq(companyChannels.type, type),
          eq(companyChannels.externalId, externalId)
        )
      )
  )[0];
}

export async function saveChannel(channel: StoredChannel): Promise<void> {
  const db = await database();
  if (!db)
    return local(data => {
      const sameId = data.channels.find(c => c.id === channel.id);
      if (
        sameId &&
        (sameId.companyId !== channel.companyId ||
          sameId.externalId !== channel.externalId ||
          sameId.type !== channel.type)
      )
        conflict();
      for (const c of data.channels.filter(c => c.id !== channel.id)) {
        if (c.type === channel.type && c.externalId === channel.externalId)
          conflict();
        if (channel.socialSlot && c.socialSlot === channel.socialSlot)
          conflict();
        if (
          c.companyId !== channel.companyId &&
          resources(c).some(r => resources(channel).includes(r))
        )
          conflict();
      }
      data.channels = [
        ...data.channels.filter(c => c.id !== channel.id),
        channel,
      ];
    });
  try {
    await db.transaction(async tx => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, channel.companyId))
        .for("update");
      const previous = (
        await tx
          .select()
          .from(companyChannels)
          .where(eq(companyChannels.id, channel.id))
          .for("update")
      )[0];
      if (
        previous &&
        (previous.companyId !== channel.companyId ||
          previous.type !== channel.type ||
          previous.externalId !== channel.externalId)
      )
        conflict();
      for (const resource of resources(channel)) {
        // A no-op on duplicate still locks the identity before checking ownership.
        await tx
          .insert(channelResourceClaims)
          .values({ resource, companyId: channel.companyId })
          .onDuplicateKeyUpdate({ set: { resource } });
        const [claim] = await tx
          .select()
          .from(channelResourceClaims)
          .where(eq(channelResourceClaims.resource, resource))
          .for("update");
        if (claim.companyId !== channel.companyId) conflict();
      }
      if (previous)
        await tx
          .update(companyChannels)
          .set(channel)
          .where(
            and(
              eq(companyChannels.id, channel.id),
              eq(companyChannels.companyId, channel.companyId)
            )
          );
      else await tx.insert(companyChannels).values(channel);
    });
  } catch (e: any) {
    if (e.code === "ER_DUP_ENTRY" || e.cause?.code === "ER_DUP_ENTRY")
      conflict();
    throw e;
  }
}

export async function updateChannel(
  companyId: number,
  id: string,
  values: Partial<
    Pick<StoredChannel, "name" | "status" | "lastVerifiedAt" | "lastWebhookAt">
  >
) {
  const db = await database();
  if (!db)
    return local(data => {
      const c = data.channels.find(
        c => c.id === id && c.companyId === companyId
      );
      if (c) Object.assign(c, values);
    });
  await db
    .update(companyChannels)
    .set(values)
    .where(
      and(eq(companyChannels.id, id), eq(companyChannels.companyId, companyId))
    );
}

export async function deleteChannel(companyId: number, id: string) {
  const db = await database();
  if (!db)
    return local(data => {
      data.channels = data.channels.filter(
        c => c.id !== id || c.companyId !== companyId
      );
    });
  await db.transaction(async tx => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, companyId))
      .for("update");
    const [channel] = await tx
      .select()
      .from(companyChannels)
      .where(
        and(
          eq(companyChannels.id, id),
          eq(companyChannels.companyId, companyId)
        )
      )
      .for("update");
    if (!channel) return;
    await tx.delete(companyChannels).where(eq(companyChannels.id, id));
    const remaining = await tx
      .select()
      .from(companyChannels)
      .where(eq(companyChannels.companyId, companyId));
    for (const resource of resources(channel)) {
      if (!remaining.some(c => resources(c).includes(resource))) {
        await tx
          .delete(channelResourceClaims)
          .where(
            and(
              eq(channelResourceClaims.resource, resource),
              eq(channelResourceClaims.companyId, companyId)
            )
          );
      }
    }
  });
}

export async function saveFlow(flow: Flow) {
  const db = await database();
  if (!db)
    return local(data => {
      data.flows = data.flows.filter(
        f => new Date(f.expiresAt).getTime() > Date.now() && f.id !== flow.id
      );
      data.flows.push(flow);
    });
  await db
    .delete(channelAuthFlows)
    .where(lt(channelAuthFlows.expiresAt, new Date()));
  await db.insert(channelAuthFlows).values(flow);
}

export async function readFlow(
  companyId: number,
  id: string,
  consume = false
): Promise<Flow> {
  const db = await database();
  const valid = (flow?: Flow) => {
    if (
      !flow ||
      flow.companyId !== companyId ||
      new Date(flow.expiresAt).getTime() <= Date.now()
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Autorização expirada ou já utilizada. Entre com a Meta novamente.",
      });
    }
    return flow;
  };
  if (!db)
    return local(data => {
      const f = valid(data.flows.find(f => f.id === id));
      if (consume) data.flows = data.flows.filter(f => f.id !== id);
      return f;
    });
  return db.transaction(async tx => {
    const [flow] = await tx
      .select()
      .from(channelAuthFlows)
      .where(
        and(
          eq(channelAuthFlows.id, id),
          eq(channelAuthFlows.companyId, companyId)
        )
      )
      .for("update");
    const f = valid(flow);
    if (consume)
      await tx.delete(channelAuthFlows).where(eq(channelAuthFlows.id, id));
    return f;
  });
}
