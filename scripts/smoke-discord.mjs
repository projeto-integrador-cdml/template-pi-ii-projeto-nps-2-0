import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

// Load the standalone API without loading .env or connecting a Discord client.
const root = path.resolve(import.meta.dirname, "..");
process.env.NODE_ENV = "production";
process.env.PORT = "0";
process.env.DATABASE_URL = "mysql://unused:unused@127.0.0.1:1/unused";
process.env.JWT_SECRET = "local-smoke-test-only";
process.env.META_APP_SECRET = "local-webhook-test-only";
process.env.PUBLIC_APP_URL = "https://template-pi-ii-projeto-nps-2-0.vercel.app";
const { startApiServer } = await import(pathToFileURL(path.join(root, "crm_discord_js/server.js")).href);
const server = await startApiServer();
const port = server.address().port;
const ca = fs.readFileSync(path.join(root, "crm_discord_js/certs/cert.pem"));
const agent = new https.Agent({ ca, servername: "sd-us1.blazebr.com", rejectUnauthorized: true, keepAlive: false });
async function request(endpoint, method = "GET", body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: "127.0.0.1", port, path: endpoint, method, agent, headers, timeout: 5000 }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout no teste local")));
    req.end(body);
  });
}
try {
  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.text), { status: "ok", backend: "crm-main", channels: true });
  const unsigned = await request("/api/meta/webhook", "POST", '{"entry":[]}', { "content-type": "application/json" });
  assert.equal(unsigned.status, 401);
  const body = '{ "object": "whatsapp_business_account", "entry": [] }';
  const signature = crypto.createHmac("sha256", process.env.META_APP_SECRET).update(body).digest("hex");
  const signed = await request("/api/meta/webhook", "POST", body, { "content-type": "application/json", "x-hub-signature-256": `sha256=${signature}` });
  assert.equal(signed.status, 200);
  const unauthorized = await request("/api/trpc/channels.list");
  assert.equal(unauthorized.status, 401);
  console.log("Smoke test aprovado: backend independente, HTTPS com certificado verificado, webhook assinado e canais protegidos. Nenhum banco real ou bot Discord foi acessado.");
} finally {
  agent.destroy();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
