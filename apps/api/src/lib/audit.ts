import { prisma } from "@photobooth/db";

export async function logAudit(params: {
  organisationId?: string;
  boothInstanceId?: string;
  actorEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      organisationId: params.organisationId,
      boothInstanceId: params.boothInstanceId,
      actorEmail: params.actorEmail,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? undefined,
    },
  });
}
