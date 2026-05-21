/**
 * Set or update admin login (email + password) in the database.
 *
 * Loads repo root `.env` then `packages/db/.env` (same as Prisma CLI).
 * Or set vars in the shell before running.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const repoRoot = resolve(__dirname, "..");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, "packages/db/.env") });
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const oldEmail = process.env.ADMIN_OLD_EMAIL?.trim();

  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL (your Neon connection string).");
  }
  if (!email) {
    throw new Error("Set ADMIN_EMAIL to the login email you want.");
  }
  if (!password || password.length < 8) {
    throw new Error("Set ADMIN_PASSWORD (min 8 characters).");
  }

  const prisma = new PrismaClient();

  const existing = oldEmail
    ? await prisma.user.findUnique({ where: { email: oldEmail } })
    : await prisma.user.findUnique({ where: { email } });

  if (!existing && !oldEmail) {
    const org = await prisma.organisation.upsert({
      where: { slug: "demo" },
      update: {},
      create: { name: "Demo Events Ltd", slug: "demo" },
    });
    await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name: "Admin",
        organisationId: org.id,
      },
    });
    console.log(`Created admin user: ${email}`);
  } else if (!existing) {
    throw new Error(`No user with email ${oldEmail}`);
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        passwordHash: hashPassword(password),
      },
    });
    console.log(
      oldEmail && oldEmail !== email
        ? `Updated login: ${oldEmail} → ${email}, password changed.`
        : `Updated password for ${email}.`
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
