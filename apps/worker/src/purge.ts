import "dotenv/config";
import { prisma } from "@photobooth/db";
import { deleteObject } from "@photobooth/services";

async function purgeExpiredSessions() {
  const now = new Date();
  const expired = await prisma.session.findMany({
    where: { expiresAt: { lt: now } },
    include: {
      captures: { include: { aiJob: true } },
    },
    take: 500,
  });

  let deleted = 0;
  for (const session of expired) {
    for (const cap of session.captures) {
      await deleteObject(cap.originalObjectKey).catch(() => {});
      if (cap.aiJob?.styledObjectKey) {
        await deleteObject(cap.aiJob.styledObjectKey).catch(() => {});
      }
      if (cap.aiJob?.outputObjectKey) {
        await deleteObject(cap.aiJob.outputObjectKey).catch(() => {});
      }
    }
    await prisma.session.delete({ where: { id: session.id } });
    deleted++;
  }

  console.log(`Purged ${deleted} expired sessions`);
}

purgeExpiredSessions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
