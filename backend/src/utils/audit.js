import { AuditLog } from "../models/AuditLog.js";

export async function writeAudit(request, action, options = {}) {
  try {
    await AuditLog.create({
      actor: options.actor || request.user?._id,
      action,
      entityType: options.entityType,
      entityId: options.entityId,
      success: options.success ?? true,
      ip: request.ip,
      userAgent: request.get("user-agent"),
      metadata: options.metadata,
    });
  } catch (error) {
    console.error("Audit log yazılamadı:", error.message);
  }
}
