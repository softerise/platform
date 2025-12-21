import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  environment: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

