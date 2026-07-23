import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createVendorSchema, updateVendorSchema } from "./vendor.schema.js";
import * as vendorService from "./vendor.service.js";

export const vendorRouter = Router();

vendorRouter.use(requireAuth);

vendorRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const vendors = await vendorService.listVendors();
    res.json(vendors);
  })
);

vendorRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vendor = await vendorService.getVendor(req.params.id);
    res.json(vendor);
  })
);

vendorRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createVendorSchema.parse(req.body);
    const vendor = await vendorService.createVendor(data);
    res.status(201).json(vendor);
  })
);

vendorRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateVendorSchema.parse(req.body);
    const vendor = await vendorService.updateVendor(req.params.id, data);
    res.json(vendor);
  })
);

vendorRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await vendorService.deleteVendor(req.params.id);
    res.status(204).send();
  })
);
