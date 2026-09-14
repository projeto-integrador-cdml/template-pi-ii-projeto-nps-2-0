import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassThrough, Readable, Writable } from "node:stream";
import https from "node:https";
import proxy from "../../api/proxy";

vi.mock("node:https", () => ({ default: { request: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("CRM_BACKEND_URL", "https://sd-us1.blazebr.com:26653"); });
afterEach(() => vi.unstubAllEnvs());

function exchange(route: string) {
  const req = Object.assign(new PassThrough(), { url: `/api/proxy?route=${route}&batch=1`, method: "POST", headers: { cookie: "app_session_id=test", "x-hub-signature-256": "sha256=test", "content-type": "application/json" } });
  const chunks: Buffer[] = [];
  const res = Object.assign(new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } }), { setHeader: vi.fn(), statusCode: 200, headersSent: false });
  return { req, res, chunks };
}

describe("proxy Vercel para o bot", () => {
  it("preserva corpo bruto, cookies e assinatura e verifica o certificado do backend", async () => {
    vi.stubEnv("CRM_BACKEND_CA_PEM", "PUBLIC CERTIFICATE");
    const captured: Buffer[] = [];
    vi.mocked(https.request).mockImplementation(((url: any, options: any, respond: any) => {
      const upstream = new PassThrough();
      upstream.on("data", chunk => captured.push(Buffer.from(chunk)));
      upstream.on("finish", () => {
        const response = Object.assign(Readable.from(["response"]), { statusCode: 200, headers: { "set-cookie": ["meta_channel_oauth=nonce; HttpOnly; Secure"] } });
        respond(response);
      });
      return upstream;
    }) as any);
    const { req, res, chunks } = exchange("api/meta/webhook");
    const pending = proxy(req as any, res as any);
    const original = '{ "entry": [ ], "text": "ação" }\n';
    req.end(original);
    await pending;
    const [target, options] = vi.mocked(https.request).mock.calls[0] as any;
    expect(target.href).toBe("https://sd-us1.blazebr.com:26653/api/meta/webhook?batch=1");
    expect(options).toMatchObject({ ca: "PUBLIC CERTIFICATE", rejectUnauthorized: true, headers: { cookie: "app_session_id=test", "x-hub-signature-256": "sha256=test", "x-forwarded-proto": "https" } });
    expect(Buffer.concat(captured).toString()).toBe(original);
    expect(Buffer.concat(chunks).toString()).toBe("response");
    expect(res.setHeader).toHaveBeenCalledWith("set-cookie", ["meta_channel_oauth=nonce; HttpOnly; Secure"]);
  });

  it("recusa backend HTTP e caminhos que escapam da API", async () => {
    vi.stubEnv("CRM_BACKEND_URL", "http://sd-us1.blazebr.com:26653");
    const first = exchange("api/trpc/auth.me");
    await proxy(first.req as any, first.res as any);
    expect(first.res.statusCode).toBe(503);
    vi.stubEnv("CRM_BACKEND_URL", "https://sd-us1.blazebr.com:26653");
    const second = exchange("api/../private");
    await proxy(second.req as any, second.res as any);
    expect(second.res.statusCode).toBe(400);
    expect(https.request).not.toHaveBeenCalled();
  });
});
