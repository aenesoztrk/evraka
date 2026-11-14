import { authenticate, registerStudent, signToken } from "../services/authService.js";
import { writeAudit } from "../utils/audit.js";

export async function register(request, response) {
  const result = await registerStudent(request.body);
  await writeAudit(request, "AUTH_REGISTER", { actor: result.user._id, entityType: "User", entityId: result.user._id });
  response.status(201).json({ success: true, data: result });
}

export async function login(request, response) {
  try {
    const result = await authenticate(request.body.identifier, request.body.password);
    await writeAudit(request, "AUTH_LOGIN", { actor: result.user._id, entityType: "User", entityId: result.user._id });
    response.json({ success: true, data: result });
  } catch (error) {
    await writeAudit(request, "AUTH_LOGIN_FAILED", { success: false, metadata: { identifier: request.body.identifier } });
    throw error;
  }
}

export async function me(request, response) {
  response.json({ success: true, data: { user: request.user, token: signToken(request.user) } });
}

export async function logout(request, response) {
  request.user.tokenVersion += 1;
  await request.user.save();
  await writeAudit(request, "AUTH_LOGOUT", { entityType: "User", entityId: request.user._id });
  response.json({ success: true, message: "Oturum kapatıldı." });
}
