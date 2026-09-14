import https from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";

// Keep bytes unchanged: Meta verifies a signature over the original request body.
export const config = { api: { bodyParser: false } };

export default function proxy(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse
) {
  const incoming = new URL(req.url || "/", "https://frontend.invalid");
  const route = req.query?.route ?? incoming.searchParams.get("route");
  if (
    typeof route !== "string" ||
    !/^(api|uploads)\/[a-zA-Z0-9_.~,%/+-]+$/.test(route) ||
    route.split("/").includes("..") ||
    /%2e|%2f|%5c/i.test(route)
  ) {
    res.statusCode = 400;
    res.end("Invalid route");
    return;
  }
  let target: URL;
  try {
    target = new URL(
      process.env.CRM_BACKEND_URL || "https://sd-us1.blazebr.com:26653"
    );
    if (target.protocol !== "https:" || target.username || target.password)
      throw new Error("HTTPS required");
  } catch {
    res.statusCode = 503;
    res.end("Configure an HTTPS backend");
    return;
  }
  target.pathname = `/${route}`;
  incoming.searchParams.delete("route");
  target.search = incoming.searchParams.toString();
  const headers = {
    ...req.headers,
    host: target.host,
    "x-forwarded-proto": "https",
  };
  delete headers.connection;
  delete headers["transfer-encoding"];
  const ca = process.env.CRM_BACKEND_CA_PEM?.replace(/\\n/g, "\n");
  return new Promise<void>(resolve => {
    const upstream = https.request(
      target,
      {
        method: req.method,
        headers,
        ...(ca ? { ca } : {}),
        rejectUnauthorized: true,
        timeout: 55000,
      },
      response => {
        res.statusCode = response.statusCode || 502;
        for (const [key, value] of Object.entries(response.headers)) {
          if (
            value !== undefined &&
            !["connection", "transfer-encoding", "keep-alive"].includes(key)
          )
            res.setHeader(key, value);
        }
        response.pipe(res);
        response.on("end", resolve);
        response.on("error", () => {
          res.destroy();
          resolve();
        });
      }
    );
    upstream.on("timeout", () =>
      upstream.destroy(new Error("Backend timeout"))
    );
    upstream.on("error", () => {
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Backend indisponível. Confira a hospedagem e o certificado HTTPS.",
          })
        );
      } else res.destroy();
      resolve();
    });
    req.on("aborted", () => upstream.destroy());
    req.on("error", () => upstream.destroy());
    req.pipe(upstream);
  });
}
