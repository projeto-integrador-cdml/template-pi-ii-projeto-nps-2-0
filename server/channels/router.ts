import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import * as repo from "./repository";
import * as meta from "./meta";
import * as service from "./service";
import { encryptSecret, decryptSecret } from "./crypto";

export function channelCompanyId(
  ctx: Pick<TrpcContext, "user" | "attendant">
): number {
  // An attendant session takes precedence when both credentials are present.
  const id = ctx.attendant?.companyId ?? ctx.user?.id;
  if (!id || (ctx.attendant ? !ctx.attendant.isActive : !ctx.user?.isActive))
    throw new TRPCError({ code: "UNAUTHORIZED" });
  return id;
}
const ownerProcedure = protectedProcedure.use(({ ctx, next, type }) => {
  channelCompanyId(ctx);
  if (ctx.attendant || !ctx.user)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Somente o responsável pela empresa pode gerenciar os canais.",
    });
  if (
    type === "mutation" &&
    ctx.req.headers.origin &&
    ctx.req.headers.origin !== meta.publicOrigin()
  )
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Origem da solicitação inválida.",
    });
  return next({ ctx });
});
const idInput = z.object({ id: z.string().uuid() });
const flowInput = z.object({ flow: z.string().regex(/^[a-f0-9]{64}$/) });
export const oauthCookieName = "meta_channel_oauth";

export const channelsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    (await repo.listChannels(channelCompanyId(ctx))).map(repo.publicChannel)
  ),
  configuration: ownerProcedure.query(() => ({
    ready: !!(
      process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_WEBHOOK_VERIFY_TOKEN &&
      /^[a-f0-9]{64}$/i.test(process.env.CHANNEL_ENCRYPTION_KEY || "") &&
      process.env.PUBLIC_APP_URL
    ),
    callbackUrl: meta.callbackUrl(),
    webhookUrl: `${meta.publicOrigin()}/api/meta/webhook`,
  })),
  connectWhatsapp: ownerProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(150),
        phoneNumberId: z
          .string()
          .trim()
          .regex(/^\d{5,32}$/),
        businessAccountId: z
          .string()
          .trim()
          .regex(/^\d{5,32}$/),
        accessToken: z.string().trim().min(20).max(4096),
      })
    )
    .mutation(({ ctx, input }) =>
      service.connectWhatsapp(channelCompanyId(ctx), input)
    ),
  rename: ownerProcedure
    .input(idInput.extend({ name: z.string().trim().min(1).max(150) }))
    .mutation(async ({ ctx, input }) => {
      const companyId = channelCompanyId(ctx);
      await repo.getChannel(companyId, input.id);
      await repo.updateChannel(companyId, input.id, { name: input.name });
      return { success: true };
    }),
  verify: ownerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    await service.verifyChannel(channelCompanyId(ctx), input.id);
    return { success: true };
  }),
  disconnect: ownerProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const companyId = channelCompanyId(ctx);
    await repo.getChannel(companyId, input.id);
    // Remove the local credentials and routing. Do not revoke the entire Meta
    // app grant: it may also authorize the company's other connected platform.
    await repo.deleteChannel(companyId, input.id);
    return { success: true };
  }),
  startSocialLogin: ownerProcedure
    .input(z.object({ type: z.enum(["instagram", "facebook"]) }))
    .mutation(async ({ ctx, input }) => {
      meta.requireMetaConfig();
      const companyId = channelCompanyId(ctx);
      const state = crypto.randomBytes(32).toString("hex");
      const browserNonce = crypto.randomBytes(32).toString("hex");
      await repo.saveFlow({
        id: state,
        companyId,
        expiresAt: new Date(Date.now() + 10 * 60_000),
        payload: encryptSecret(
          JSON.stringify({ phase: "login", type: input.type, browserNonce })
        ),
      });
      ctx.res.cookie(oauthCookieName, browserNonce, {
        httpOnly: true,
        secure: meta.publicOrigin().startsWith("https:"),
        sameSite: "lax",
        path: "/api/meta",
        maxAge: 10 * 60_000,
      });
      const url = new URL(
        `https://www.facebook.com/${meta.graphVersion()}/dialog/oauth`
      );
      const params: Record<string, string> = {
        client_id: process.env.META_APP_ID!,
        redirect_uri: meta.callbackUrl(),
        state,
        response_type: "code",
      };
      const configId = process.env.META_CONFIG_ID;
      if (configId) {
        params.config_id = configId;
      } else {
        params.scope = meta.scopes(input.type).join(",");
        params.auth_type = "rerequest";
      }
      url.search = new URLSearchParams(params).toString();
      return { url: url.toString() };
    }),
  socialChoices: ownerProcedure
    .input(flowInput)
    .query(async ({ ctx, input }) => {
      const flow = await repo.readFlow(channelCompanyId(ctx), input.flow);
      const payload = JSON.parse(decryptSecret(flow.payload));
      if (payload.phase !== "select")
        throw new TRPCError({ code: "BAD_REQUEST" });
      return (payload.candidates as meta.SocialCandidate[]).map(c => ({
        externalId: c.externalId,
        name: c.name,
        identifier: c.identifier,
        type: c.type,
      }));
    }),
  completeSocialLogin: ownerProcedure
    .input(flowInput.extend({ externalId: z.string().regex(/^\d+$/) }))
    .mutation(async ({ ctx, input }) => {
      const companyId = channelCompanyId(ctx);
      const flow = await repo.readFlow(companyId, input.flow, true);
      const payload = JSON.parse(decryptSecret(flow.payload));
      if (payload.phase !== "select")
        throw new TRPCError({ code: "BAD_REQUEST" });
      const candidate = (payload.candidates as meta.SocialCandidate[]).find(
        c => c.externalId === input.externalId
      );
      if (!candidate)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione uma conta autorizada pela Meta.",
        });
      return service.connectSocial(companyId, candidate);
    }),
});
