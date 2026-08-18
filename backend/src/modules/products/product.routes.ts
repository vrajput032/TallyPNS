import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { createProductSchema, updateProductSchema } from "./product.schema.js";
import * as productService from "./product.service.js";

export const productRouter = Router();

productRouter.use(requireAuth);

productRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await productService.listProducts();
    res.json(products);
  })
);

productRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await productService.getProduct(req.params.id);
    res.json(product);
  })
);

productRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createProductSchema.parse(req.body);
    const product = await productService.createProduct(data);
    res.status(201).json(product);
  })
);

productRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(req.params.id, data);
    res.json(product);
  })
);

productRouter.delete(
  "/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  })
);
