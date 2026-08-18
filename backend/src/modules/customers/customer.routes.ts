import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { createCustomerSchema, updateCustomerSchema } from "./customer.schema.js";
import * as customerService from "./customer.service.js";
import { routeParam } from "../../lib/routeParam.js";

export const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const customers = await customerService.listCustomers();
    res.json(customers);
  })
);

customerRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomer(routeParam(req.params.id));
    res.json(customer);
  })
);

customerRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerService.createCustomer(data);
    res.status(201).json(customer);
  })
);

customerRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerService.updateCustomer(routeParam(req.params.id), data);
    res.json(customer);
  })
);

customerRouter.delete(
  "/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await customerService.deleteCustomer(routeParam(req.params.id));
    res.status(204).send();
  })
);
