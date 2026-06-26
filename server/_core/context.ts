import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, Attendant } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  attendant: Attendant | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let attendant: Attendant | null = null;

  // 1. Authenticate regular user/admin via cookie/session
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2. Authenticate attendant via Authorization header or custom header
  try {
    const authHeader = opts.req.headers["authorization"] || opts.req.headers["x-attendant-token"];
    if (authHeader) {
      const token = typeof authHeader === "string" 
        ? authHeader.replace(/^Bearer\s+/i, "").trim() 
        : "";
      if (token) {
        const session = await db.getActiveSessionByToken(token);
        if (session && new Date(session.expiresAt) > new Date()) {
          const att = await db.getAttendantById(session.attendantId);
          if (att && att.isActive && att.sessionToken === token) {
            attendant = att;
          }
        }
      }
    }
  } catch (error) {
    attendant = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    attendant,
  };
}
