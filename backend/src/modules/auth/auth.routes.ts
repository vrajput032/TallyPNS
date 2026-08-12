import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/authRateLimit.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);
    const result = await authService.register(email, password, name);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  })
);
