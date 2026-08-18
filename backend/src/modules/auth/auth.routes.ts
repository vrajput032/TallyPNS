import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { authRateLimit } from "../../middleware/authRateLimit.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { createUserSchema, loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";
import { routeParam } from "../../lib/routeParam.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { username, email, password, name } = registerSchema.parse(req.body);
    const result = await authService.register(username, email, password, name);
    res.status(201).json(result);
  })
);

authRouter.get(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await authService.listUsers();
    res.json(users);
  })
);

authRouter.post(
  "/users",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const user = await authService.createUser(data);
    res.status(201).json(user);
  })
);

authRouter.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new ApiError(401, "Missing access token");
    }
    await authService.deleteUser(routeParam(req.params.id), req.user.sub);
    res.status(204).send();
  })
);

authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
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
