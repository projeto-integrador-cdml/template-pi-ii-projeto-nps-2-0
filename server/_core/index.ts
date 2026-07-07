import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "node:path";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import * as db from "../db";
import { downloadMetaMedia } from "../whatsappService";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for frontend hosting (Vercel)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-trpc-source");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve static uploaded files locally
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Configure body parser with larger size limit for file uploads and rawBody capture
  app.use(express.json({ 
    limit: "50mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Webhook da API Oficial do WhatsApp
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "crm_whatsapp_verify_token";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Webhook verificado com sucesso!");
      return res.status(200).send(challenge);
    }
    console.warn("[WhatsApp Webhook] Falha ao verificar token do Webhook.");
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string;
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      
      if (appSecret && signature) {
        const [algo, hash] = signature.split("=");
        const expectedHash = crypto
          .createHmac("sha256", appSecret)
          .update((req as any).rawBody || "")
          .digest("hex");
        if (hash !== expectedHash) {
          console.warn("[WhatsApp Webhook] Falha na assinatura HMAC SHA256!");
          return res.sendStatus(401);
        }
      }

      const body = req.body;
      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const metadata = value?.metadata;
        const phoneNumberId = metadata?.phone_number_id;

        if (phoneNumberId) {
          // Busca a empresa correspondente pelo Phone Number ID
          const usersList = await db.listUsers();
          const user = usersList.find(u => u.whatsappApiUrl === phoneNumberId);
          
          if (user) {
            // A. Processamento de status de envio (delivered, read, failed)
            if (value.statuses) {
              for (const statusObj of value.statuses) {
                const msgId = statusObj.id;
                const status = statusObj.status;
                console.log(`[WhatsApp Webhook] Atualizando status da mensagem ${msgId} para ${status}`);
                await db.updateWhatsappMessageStatus(msgId, status);
              }
            }

            // B. Processamento de novas mensagens de entrada (inbound)
            if (value.messages) {
              for (const msg of value.messages) {
                const fromNumber = "+" + msg.from;
                const contact = value.contacts?.find((c: any) => c.wa_id === msg.from);
                const name = contact?.profile?.name || "Contato WhatsApp";
                
                let textContent = "";
                let mediaUrl = "";

                if (msg.type === "text" && msg.text?.body) {
                  textContent = msg.text.body;
                } else if (msg.type === "image" && msg.image?.id) {
                  textContent = msg.image.caption || "[Imagem]";
                  console.log(`[WhatsApp Webhook] Baixando imagem ID ${msg.image.id}...`);
                  mediaUrl = await downloadMetaMedia(msg.image.id, user.whatsappApiKey || "", msg.image.mime_type);
                } else if (msg.type === "audio" && msg.audio?.id) {
                  textContent = "[Áudio]";
                  console.log(`[WhatsApp Webhook] Baixando áudio ID ${msg.audio.id}...`);
                  mediaUrl = await downloadMetaMedia(msg.audio.id, user.whatsappApiKey || "", msg.audio.mime_type);
                } else if (msg.type === "document" && msg.document?.id) {
                  textContent = msg.document.filename || "[Documento]";
                  console.log(`[WhatsApp Webhook] Baixando documento ID ${msg.document.id}...`);
                  mediaUrl = await downloadMetaMedia(msg.document.id, user.whatsappApiKey || "", msg.document.mime_type);
                }

                if (textContent || mediaUrl) {
                  console.log(`[WhatsApp Webhook] Mensagem recebida de ${name} (${fromNumber}): ${textContent} | Mídia: ${mediaUrl}`);
                  await db.routeIncomingWhatsappMessage(user.id, fromNumber, name, textContent, mediaUrl);
                }
              }
            }
          } else {
            console.warn(`[WhatsApp Webhook] Nenhuma empresa encontrada com o Phone Number ID: ${phoneNumberId}`);
          }
        }
      }
      return res.sendStatus(200);
    } catch (err) {
      console.error("[WhatsApp Webhook] Erro ao processar payload:", err);
      return res.sendStatus(500);
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Auto-seed test user in background
    db.seedTestUser().catch(err => {
      console.warn("[Seed] Failed to auto-seed test user:", err);
    });
    console.log("[WhatsApp] Webhook pronto para receber eventos da API Oficial.");
  });
}

startServer().catch(console.error);
