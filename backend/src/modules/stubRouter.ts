import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export function createStubRouter(moduleName: string) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", (_req, res) => {
    res.status(501).json({ message: `${moduleName} module not implemented yet` });
  });

  return router;
}
