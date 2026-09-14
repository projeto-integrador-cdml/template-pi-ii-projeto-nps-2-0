import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "crm_discord_js", "certs");
const host = new URL(
  process.env.CRM_BACKEND_URL || "https://sd-us1.blazebr.com:26653"
).hostname;
if (!/^[a-zA-Z0-9.-]+$/.test(host))
  throw new Error("Use um nome DNS válido para o backend.");
if (
  fs.existsSync(path.join(directory, "cert.pem")) ||
  fs.existsSync(path.join(directory, "key.pem"))
) {
  throw new Error(
    "Já existe certificado ou chave em crm_discord_js/certs. Preserve o certificado existente ou faça a rotação conscientemente."
  );
}
fs.mkdirSync(directory, { recursive: true });
const candidates = [
  process.env.OPENSSL_BIN,
  "C:/Program Files/Git/usr/bin/openssl.exe",
  "C:/Program Files/Git/mingw64/bin/openssl.exe",
].filter(Boolean);
const executable =
  candidates.find(candidate => fs.existsSync(candidate)) || "openssl";
const result = spawnSync(
  executable,
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-sha256",
    "-days",
    "365",
    "-nodes",
    "-keyout",
    path.join(directory, "key.pem"),
    "-out",
    path.join(directory, "cert.pem"),
    "-subj",
    `/CN=${host}`,
    "-addext",
    `subjectAltName=DNS:${host}`,
    "-addext",
    "basicConstraints=critical,CA:TRUE",
  ],
  { stdio: "pipe", windowsHide: true }
);
if (result.status !== 0)
  throw new Error(
    "Não foi possível gerar o certificado. Instale OpenSSL ou defina OPENSSL_BIN. " +
      (result.error?.message || result.stderr?.toString() || "")
  );
try {
  fs.chmodSync(path.join(directory, "key.pem"), 0o600);
} catch {}
console.log(
  "Certificado gerado para " +
    host +
    ". Envie certs/ ao bot e copie somente cert.pem para CRM_BACKEND_CA_PEM na Vercel. Validade: 365 dias."
);
