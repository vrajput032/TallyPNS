import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { assertAllowedAttachment, MAX_ATTACHMENT_BYTES } from "../../lib/storage.js";
import { createProductSchema, updateProductSchema } from "./product.schema.js";
import * as productService from "./product.service.js";
import { routeParam } from "../../lib/routeParam.js";

export const productRouter = Router();

productRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const name = file.originalname.toLowerCase();
    const isImage =
      mime.startsWith("image/") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp") ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");
    if (isImage) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are supported"));
  },
});

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
    const product = await productService.getProduct(routeParam(req.params.id));
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
    const product = await productService.updateProduct(routeParam(req.params.id), data);
    res.json(product);
  })
);

productRouter.post(
  "/:id/image",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof Error) {
        next(
          new ApiError(
            400,
            err.message.includes("File too large") ? "File too large (max 10 MB)" : err.message
          )
        );
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      throw new ApiError(400, "Upload an image file");
    }
    assertAllowedAttachment(file);
    const product = await productService.setProductImage(routeParam(req.params.id), file);
    res.json(product);
  })
);

productRouter.delete(
  "/:id/image",
  asyncHandler(async (req, res) => {
    const product = await productService.clearProductImage(routeParam(req.params.id));
    res.json(product);
  })
);

productRouter.delete(
  "/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await productService.deleteProduct(routeParam(req.params.id));
    res.status(204).send();
  })
);
