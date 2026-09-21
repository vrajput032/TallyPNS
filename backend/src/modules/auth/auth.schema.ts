import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, underscores, and hyphens")
  .transform((value) => value.toLowerCase());

const deviceNameSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6),
  deviceName: deviceNameSchema,
});

export const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).max(80),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  deviceName: deviceNameSchema,
});
