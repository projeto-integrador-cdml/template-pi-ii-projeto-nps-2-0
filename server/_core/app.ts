import express from "express";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerMetaRoutes } from "../channels/routes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { publicOrigin } from "../channels/meta";

export function createApp() {
  const app = express();

  // Enable CORS & Disable Cache Headers (force latest version always)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === publicOrigin()) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-trpc-source"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, max-age=0"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve static uploaded files locally
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Configure body parser with larger size limit for file uploads and rawBody capture
  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  registerMetaRoutes(app);
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", backend: "crm-main", channels: true })
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Global JSON Error Handler (Guarantees valid JSON response for Vercel Serverless)
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error("[Express] Não foi possível processar a solicitação.");
      res
        .status(500)
        .json({ error: "Não foi possível processar a solicitação." });
    }
  );

  return app;
}

export const app = createApp();
