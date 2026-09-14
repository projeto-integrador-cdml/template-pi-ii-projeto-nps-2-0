import crypto from "node:crypto";

function key() {
  const value = process.env.CHANNEL_ENCRYPTION_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(
      "Configure CHANNEL_ENCRYPTION_KEY com uma chave hexadecimal de 32 bytes no servidor."
    );
  }
  return Buffer.from(value, "hex");
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string): string {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data)
    throw new Error("Credencial inválida. Reconecte o canal.");
  const cipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url")
  );
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(data, "base64url")),
    cipher.final(),
  ]).toString("utf8");
}
