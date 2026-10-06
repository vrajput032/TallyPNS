import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { revokedSessionValue, sessionIsRevoked } from "../../lib/sessionRevocation.js";
import type { AuthPayload } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.js";

function signTokens(payload: AuthPayload) {
  const iat = Math.floor(Date.now() / 1000);
  const accessToken = jwt.sign({ ...payload, iat }, process.env.JWT_SECRET!, { expiresIn: "12h" });
  const refreshToken = jwt.sign({ ...payload, iat }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "30d",
  });
  return { accessToken, refreshToken };
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function toPayload(user: User, deviceName?: string): AuthPayload {
  const payload: AuthPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  if (deviceName) {
    payload.deviceName = deviceName;
  }
  return payload;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });
  return users.map(toPublicUser);
}

export async function createUser(input: {
  username: string;
  password: string;
  name: string;
  role: User["role"];
}) {
  const username = input.username.toLowerCase();
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new ApiError(409, "Username already registered");
  }

  let email = `${username}@pnsenterprises.com`;
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    email = `${username}.${Date.now()}@pnsenterprises.com`;
  }

  switch (input.role) {
    case "ADMIN":
    case "STAFF":
      break;
    default: {
      const _exhaustive: never = input.role;
      throw new ApiError(400, `Unhandled role: ${_exhaustive}`);
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      name: input.name,
      role: input.role,
    },
  });

  return toPublicUser(user);
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot delete the last admin");
    }
  }

  await prisma.user.delete({ where: { id } });
}

/** Admin sets a new password; clears stored refresh token so other sessions must sign in again. */
export async function resetUserPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, refreshToken: revokedSessionValue() },
  });

  return toPublicUser({ ...user, passwordHash, refreshToken: null });
}

/** Signed-in user changes their own password. Other devices on the account stay signed in. */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(400, "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the current one");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function register(username: string, email: string, password: string, name: string) {
  const normalized = username.toLowerCase();
  const existingUsername = await prisma.user.findUnique({ where: { username: normalized } });
  if (existingUsername) {
    throw new ApiError(409, "Username already registered");
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username: normalized, email, passwordHash, name },
  });

  const tokens = signTokens(toPayload(user));
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

  return { user: toPublicUser(user), ...tokens };
}

export async function login(username: string, password: string, deviceName?: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) {
    throw new ApiError(401, "Invalid username or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid username or password");
  }

  const tokens = signTokens(toPayload(user, deviceName));
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

  recordActivity({
    user: {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      deviceName,
    },
    actorName: user.username,
    deviceName: deviceName ?? null,
    module: "AUTH",
    action: "LOGGED_IN",
    entityId: user.id,
    entityNo: user.username,
    summary: deviceName ? `Logged in from ${deviceName}` : "Logged in",
  });

  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(refreshToken: string, deviceName?: string) {
  let payload: AuthPayload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as AuthPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || sessionIsRevoked(user.refreshToken, payload.iat)) {
    throw new ApiError(401, "Refresh token revoked");
  }

  const nextDevice = deviceName || payload.deviceName;
  return signTokens(toPayload(user, nextDevice));
}
