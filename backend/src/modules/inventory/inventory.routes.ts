import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createAdjustmentSchema } from "./inventory.schema.js";
import * as inventoryService from "./inventory.service.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get(
  "/stock",
  asyncHandler(async (_req, res) => {
    const stock = await inventoryService.listStock();
    res.json(stock);
  })
);

inventoryRouter.get(
  "/movements",
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const movements = await inventoryService.listStockMovements(productId);
    res.json(movements);
  })
);

inventoryRouter.post(
  "/adjustments",
  asyncHandler(async (req, res) => {
    const data = createAdjustmentSchema.parse(req.body);
    const movement = await inventoryService.createAdjustment(data);
    res.status(201).json(movement);
  })
);
