import { timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "./env.js";

const boothSecret = new TextEncoder().encode(env.boothJwtSecret);

export function isBoothAccessGateEnabled(): boolean {
  return env.boothAccessPassword.length > 0;
}

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyBoothAccessPassword(password: string): boolean {
  if (!isBoothAccessGateEnabled()) return true;
  return safeEqualString(password, env.boothAccessPassword);
}

export function getBoothAccessTokenFromRequest(
  getHeader: (name: string) => string | undefined
): string | null {
  const dedicated = getHeader("x-booth-access-token");
  if (dedicated) return dedicated;
  return null;
}

export async function hasValidBoothAccess(
  getHeader: (name: string) => string | undefined
): Promise<boolean> {
  if (!isBoothAccessGateEnabled()) return true;

  const token = getBoothAccessTokenFromRequest(getHeader);
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, boothSecret);
    return payload.typ === "booth_access";
  } catch {
    return false;
  }
}

export async function createBoothAccessToken(): Promise<string> {
  return new SignJWT({ typ: "booth_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("booth-access")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(boothSecret);
}
