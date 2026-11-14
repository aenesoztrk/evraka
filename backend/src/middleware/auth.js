import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (request, _response, next) => {
  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AppError("Oturum açmanız gerekiyor.", 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError("Oturum süresi dolmuş veya token geçersiz.", 401);
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || payload.tokenVersion !== user.tokenVersion) {
    throw new AppError("Oturum geçersiz.", 401);
  }
  request.user = user;
  next();
});

export const requireRole = (...roles) => (request, _response, next) => {
  if (!request.user || !roles.includes(request.user.role)) return next(new AppError("Bu işlem için yetkiniz yok.", 403));
  next();
};
