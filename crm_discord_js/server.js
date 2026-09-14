import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";

const directory = path.dirname(fileURLToPath(import.meta.url));

export async function loadBackend() {
  process.env.NODE_ENV ||= "production";
  process.chdir(directory);
  if (
    !process.env.DATABASE_URL &&
    process.env.MYSQL_HOST &&
    process.env.MYSQL_USER &&
    process.env.MYSQL_PASSWORD
  ) {
    const url = new URL("mysql://localhost");
    url.hostname = process.env.MYSQL_HOST;
    url.port = process.env.MYSQL_PORT || "3306";
    url.username = process.env.MYSQL_USER;
    url.password = process.env.MYSQL_PASSWORD;
    url.pathname = "/" + (process.env.MYSQL_DATABASE || "defaultdb");
    process.env.DATABASE_URL = url.toString();
  }
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET)
    throw new Error(
      "Configure DATABASE_URL e preserve o JWT_SECRET no ambiente do bot."
    );
  if (!fs.existsSync(path.join(directory, "backend.cjs")))
    throw new Error(
      "Backend não empacotado. Execute npm run build:discord na raiz do projeto e envie backend.cjs junto com o bot."
    );
  const backend = await import("./backend.cjs");
  return backend.default || backend;
}

export async function createApiServer() {
  const backend = await loadBackend();
  return backend.createApp();
}

export async function startApiServer() {
  const app = await createApiServer();
  const port = Number(process.env.PORT || 26653);
  const certPath =
    process.env.SSL_CERT_PATH || path.join(directory, "certs", "cert.pem");
  const keyPath =
    process.env.SSL_KEY_PATH || path.join(directory, "certs", "key.pem");
  const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
  if (
    !useHttps &&
    process.env.NODE_ENV === "production" &&
    process.env.API_TRUSTED_TLS_PROXY !== "true"
  ) {
    throw new Error(
      "Configure certs/cert.pem e certs/key.pem para HTTPS. Consulte README-HOSPEDAGEM.md."
    );
  }
  const server = useHttps
    ? createHttpsServer(
        { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
        app
      )
    : createHttpServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", resolve);
  });
  console.log(
    "[CRM API] Backend principal com canais reais ativo na porta " +
      port +
      " (" +
      (useHttps ? "HTTPS" : "HTTP atrás de proxy TLS") +
      ")."
  );
  return server;
}
