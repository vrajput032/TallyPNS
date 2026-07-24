import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { customerRouter } from "../modules/customers/customer.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { gstRouter } from "../modules/gst/gst.routes.js";
import { inventoryRouter } from "../modules/inventory/inventory.routes.js";
import {
  bankRouter,
  cashRouter,
  paymentRouter,
} from "../modules/payments/payment.routes.js";
import { productRouter } from "../modules/products/product.routes.js";
import { purchaseRouter } from "../modules/purchase/purchase.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";
import { salesRouter } from "../modules/sales/sales.routes.js";
import { vendorRouter } from "../modules/vendors/vendor.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/customers", customerRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/vendors", vendorRouter);
apiRouter.use("/sales", salesRouter);
apiRouter.use("/purchase", purchaseRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/gst", gstRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/cash", cashRouter);
apiRouter.use("/bank", bankRouter);
