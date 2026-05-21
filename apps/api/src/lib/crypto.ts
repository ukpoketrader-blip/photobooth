import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifySecret(secret: string, hash: string): boolean {
  const computed = hashSecret(secret);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const computed = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT ?? "photobooth"))
    .digest("hex")
    .slice(0, 32);
}

export function generateApiSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}
