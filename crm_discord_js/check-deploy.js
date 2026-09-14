import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { X509Certificate, createPrivateKey } from "node:crypto";
import dotenv from "dotenv";

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(directory, ".env"), quiet: true });
const missing = [];
if (Number(process.versions.node.split(".")[0]) < 22) missing.push("Atualizar Node.js para 22 ou superior.");
for (const key of ["DATABASE_URL", "JWT_SECRET", "PUBLIC_APP_URL", "META_APP_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "CHANNEL_ENCRYPTION_KEY"]) {
  if (!process.env[key]?.trim()) missing.push(`Preencher ${key} no ambiente do backend.`);
}
if (process.env.CHANNEL_ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(process.env.CHANNEL_ENCRYPTION_KEY)) missing.push("CHANNEL_ENCRYPTION_KEY deve ter 64 caracteres hexadecimais.");
if (process.env.CHANNEL_ENCRYPTION_KEY && process.env.CHANNEL_ENCRYPTION_KEY === process.env.META_WEBHOOK_VERIFY_TOKEN) missing.push("Use chaves diferentes para criptografia e verificação de webhook.");
if (process.env.PUBLIC_APP_URL && !process.env.PUBLIC_APP_URL.startsWith("https://")) missing.push("PUBLIC_APP_URL deve usar HTTPS.");
if (!fs.existsSync(path.join(directory, "backend.cjs"))) missing.push("Gerar backend.cjs com npm run build:discord na raiz do projeto.");
try {
  const cert = new X509Certificate(fs.readFileSync(process.env.SSL_CERT_PATH || path.join(directory, "certs/cert.pem")));
  const privateKey = createPrivateKey(fs.readFileSync(process.env.SSL_KEY_PATH || path.join(directory, "certs/key.pem")));
  const host = new URL(process.env.CRM_BACKEND_URL || "https://sd-us1.blazebr.com:26653").hostname;
  if (!cert.checkHost(host)) missing.push("O certificado não corresponde ao nome do servidor do backend.");
  if (!cert.checkPrivateKey(privateKey)) missing.push("O certificado e a chave privada não correspondem.");
  if (Date.parse(cert.validTo) <= Date.now() || Date.parse(cert.validFrom) > Date.now()) missing.push("O certificado está fora do prazo de validade.");
  console.log("Certificado HTTPS:", cert.checkHost(host) ? "nome verificado" : "nome incompatível", "| validade:", cert.validTo);
} catch { missing.push("Disponibilizar um certificado e uma chave válidos em certs/."); }

if (missing.length) {
  console.log("Configuração local ainda incompleta:");
  for (const item of missing) console.log("- " + item);
  process.exitCode = 1;
} else {
  console.log("Arquivos e variáveis locais conferidos. Ainda é necessário confirmar migração, publicação, configuração da Vercel e autorização real da Meta.");
}
console.log("Esta verificação não iniciou o bot, não consultou o banco e não enviou mensagens.");
