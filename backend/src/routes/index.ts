import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { customerRouter } from "../modules/customers/customer.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { productRouter } from "../modules/products/product.routes.js";
import { purchaseRouter } from "../modules/purchase/purchase.routes.js";
import { salesRouter } from "../modules/sales/sales.routes.js";
import { createStubRouter } from "../modules/stubRouter.js";
import { vendorRouter } from "../modules/vendors/vendor.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/customers", customerRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/vendors", vendorRouter);
apiRouter.use("/sales", salesRouter);
apiRouter.use("/purchase", purchaseRouter);

apiRouter.use("/inventory", createStubRouter("Inventory"));
apiRouter.use("/cash", createStubRouter("Cash"));
apiRouter.use("/bank", createStubRouter("Bank"));
apiRouter.use("/gst", createStubRouter("GST"));
apiRouter.use("/reports", createStubRouter("Reports"));
