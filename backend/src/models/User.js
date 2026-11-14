import mongoose from "mongoose";
import { canonicalizePhone } from "../utils/normalization.js";

const addressSchema = new mongoose.Schema({
  neighborhood: { type: String, trim: true },
  street: { type: String, trim: true },
  buildingNo: { type: String, trim: true },
  apartmentNo: { type: String, trim: true },
  district: { type: String, trim: true },
  city: { type: String, trim: true },
  fullText: { type: String, trim: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ["student", "admin"], default: "student", index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  studentNo: { type: String, unique: true, sparse: true, trim: true },
  identityNo: { type: String, trim: true, select: false },
  nationality: { type: String, default: "T.C.", trim: true },
  birthDate: Date,
  address: addressSchema,
  department: { type: String, trim: true },
  academicYear: { type: String, trim: true },
  previousInternshipDays: { type: Number, default: 0, min: 0 },
  phone: { type: String, trim: true },
  healthStatus: { type: Number, min: 1, max: 6 },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  tokenVersion: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.virtual("isLocked").get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

userSchema.pre("validate", function normalizeStoredPhone() {
  if (this.phone) this.phone = canonicalizePhone(this.phone, "90");
});

userSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.identityNo;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.tokenVersion;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
