import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  deviceName: z.string().max(80).optional(),
});

export const pushEndpointSchema = z.object({
  endpoint: z.string().url().max(2000),
});
