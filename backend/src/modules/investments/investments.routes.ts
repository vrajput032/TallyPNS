import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getInvestments } from "./investments.service.js";

export const investmentsRouter = Router();

investmentsRouter.use(requireAuth);

investmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getInvestments());
  })
);
