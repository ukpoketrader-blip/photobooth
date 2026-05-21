import { createMiddleware } from "hono/factory";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../lib/env.js";
import { prisma } from "@photobooth/db";
import { verifyPassword } from "../lib/crypto.js";

const adminSecret = new TextEncoder().encode(env.authSecret);
const boothSecret = new TextEncoder().encode(env.boothJwtSecret);

export type AdminUser = {
  id: string;
  email: string;
  organisationId: string;
};

export const adminAuth = createMiddleware<{
  Variables: { user: AdminUser };
}>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const { payload } = await jwtVerify(auth.slice(7), adminSecret);
    c.set("user", {
      id: payload.sub as string,
      email: payload.email as string,
      organisationId: payload.organisationId as string,
    });
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export async function createAdminToken(user: AdminUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    organisationId: user.organisationId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(adminSecret);
}

export async function createBoothToken(
  sessionId: string,
  boothInstanceId: string
): Promise<string> {
  return new SignJWT({ boothInstanceId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sessionId)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(boothSecret);
}

export const boothAuth = createMiddleware<{
  Variables: { sessionId: string; boothInstanceId: string };
}>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const { payload } = await jwtVerify(auth.slice(7), boothSecret);
    c.set("sessionId", payload.sub as string);
    c.set("boothInstanceId", payload.boothInstanceId as string);
    await next();
  } catch {
    return c.json({ error: "Invalid session token" }, 401);
  }
});

export async function loginAdmin(
  email: string,
  password: string
): Promise<AdminUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id,
    email: user.email,
    organisationId: user.organisationId,
  };
}
