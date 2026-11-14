import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true, index: true },
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  success: { type: Boolean, default: true },
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
