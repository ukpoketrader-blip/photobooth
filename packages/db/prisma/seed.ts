import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

async function main() {
  const org = await prisma.organisation.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Events Ltd",
      slug: "demo",
    },
  });

  const boothSecret = "demo-booth-secret-change-me";
  const instance = await prisma.boothInstance.upsert({
    where: { slug: "demo-booth" },
    update: {
      enableQrShare: true,
      enableDownload: false,
      maxPhotoVariants: 3,
    },
    create: {
      organisationId: org.id,
      name: "Demo Photobooth",
      slug: "demo-booth",
      apiSecretHash: hashSecret(boothSecret),
      privacyNoticeHtml:
        "<p>We process your photo to apply AI styling. Photos are deleted after 7 days. See our privacy policy for your rights.</p>",
      paymentEnabled: false,
      paymentAmountMinor: 300,
      frameEnabled: false,
      enableQrShare: true,
      enableDownload: false,
      maxPhotoVariants: 3,
    },
  });

  await prisma.filterPreset.deleteMany({ where: { boothInstanceId: instance.id } });
  await prisma.filterPreset.createMany({
    data: [
      {
        boothInstanceId: instance.id,
        name: "Vintage Flash",
        promptTemplate:
          "Transform this portrait into a 90s disposable camera photo with direct flash, slight film grain, warm tones, keep the person's likeness.",
        sortOrder: 0,
        isDefault: true,
      },
      {
        boothInstanceId: instance.id,
        name: "Cartoon Pop",
        promptTemplate:
          "Stylize this portrait as vibrant cartoon cel-shading with bold outlines, keep facial likeness recognizable.",
        sortOrder: 1,
        isDefault: false,
      },
    ],
  });

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashPassword(adminPassword),
    },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      name: "Admin",
      organisationId: org.id,
    },
  });

  console.log("Seed complete.");
  console.log(`Booth URL slug: demo-booth`);
  console.log(`Booth API secret: ${boothSecret}`);
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
