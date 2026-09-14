import "dotenv/config";
import { app } from "./app";
export { app, createApp } from "./app";

import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import net from "net";
import path from "node:path";




import * as db from "../db";



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
  // Check certs/ in both root and crm_discord_python/ (where bot generates them on Blaze Host)
  const possibleCertDirs = [
    path.join(process.cwd(), "certs"),
    path.join(process.cwd(), "crm_discord_python", "certs"),
  ];

  let certPath = "";
  let keyPath = "";
  for (const dir of possibleCertDirs) {
    const c = path.join(dir, "cert.pem");
    const k = path.join(dir, "key.pem");
    if (fs.existsSync(c) && fs.existsSync(k)) {
      certPath = c;
      keyPath = k;
      break;
    }
  }
  const useHttps = !!certPath;

  const server = useHttps
    ? createHttpsServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
    : createHttpServer(app);

  if (useHttps) {
    console.log(`[Server] 🔒 HTTPS mode enabled using certificates from ${path.dirname(certPath)}`);
  } else {
    console.log("[Server] ⚠️  HTTP mode (run bot.py to auto-generate SSL cert)");
  }

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
    db.seedTestUser().catch(err => {
      console.warn("[Seed] Failed to auto-seed test user:", err);
    });
    console.log("[WhatsApp] Webhook pronto para receber eventos da API Oficial.");
  });
}

// Start server if executed directly (node / tsx)
if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
