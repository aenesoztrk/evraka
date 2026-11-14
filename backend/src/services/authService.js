import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const PASSWORD_PATTERN = /^(?=.*[a-zçğıöşü])(?=.*[A-ZÇĞİÖŞÜ])(?=.*\d).{8,}$/;

export function assertStrongPassword(password) {
  if (!PASSWORD_PATTERN.test(String(password ?? ""))) {
    throw new AppError("Şifre en az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.", 422);
  }
}

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, tokenVersion: user.tokenVersion },
    env.jwtSecret,
  );
}

export async function registerStudent(payload) {
  assertStrongPassword(payload.password);
  if (payload.passwordConfirm !== undefined && payload.password !== payload.passwordConfirm) {
    throw new AppError("Şifre ve şifre tekrarı eşleşmiyor.", 422);
  }
  if (!payload.name || !payload.email || !payload.studentNo || !payload.identityNo) {
    throw new AppError("Ad soyad, e-posta, öğrenci numarası ve kimlik numarası zorunludur.", 422);
  }
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    role: "student",
    name: payload.name,
    email: payload.email,
    passwordHash,
    studentNo: payload.studentNo,
    identityNo: payload.identityNo,
    nationality: payload.nationality || "T.C.",
    birthDate: payload.birthDate,
    address: typeof payload.address === "string" ? { fullText: payload.address } : payload.address,
    department: payload.department,
    academicYear: payload.academicYear,
    previousInternshipDays: payload.previousInternshipDays || 0,
    phone: payload.phone,
    healthStatus: payload.healthStatus,
  });
  return { user, token: signToken(user) };
}

export async function authenticate(identifier, password) {
  const escaped = String(identifier ?? "").trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: escaped }, { studentNo: escaped }] }).select("+passwordHash +identityNo");
  if (!user) throw new AppError("E-posta/öğrenci numarası veya şifre hatalı.", 401);
  if (user.isLocked) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(`Hesap geçici olarak kilitli. ${minutes} dakika sonra tekrar deneyin.`, 423);
  }
  const correct = await bcrypt.compare(String(password ?? ""), user.passwordHash);
  if (!correct) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + env.loginLockMinutes * 60_000);
      user.loginAttempts = 0;
    }
    await user.save();
    throw new AppError("E-posta/öğrenci numarası veya şifre hatalı.", 401, { attemptsRemaining: Math.max(0, 5 - user.loginAttempts) });
  }
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  return { user, token: signToken(user) };
}

export async function ensureBootstrapAdmin() {
  if (!env.adminEmail || !env.adminPassword) return;
  const existing = await User.findOne({ email: env.adminEmail.toLowerCase() });
  if (existing) return;
  assertStrongPassword(env.adminPassword);
  await User.create({
    role: "admin",
    name: "Sistem Yöneticisi",
    email: env.adminEmail,
    passwordHash: await bcrypt.hash(env.adminPassword, 12),
  });
  console.log(`Bootstrap admin oluşturuldu: ${env.adminEmail}`);
}
