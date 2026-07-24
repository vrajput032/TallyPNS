import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getGstSummary } from "./gst.service.js";

export const gstRouter = Router();

gstRouter.use(requireAuth);

gstRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
    const summary = await getGstSummary(from, to);
    res.json(summary);
  })
);
