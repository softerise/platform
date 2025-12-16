import { z } from 'zod';

const envSchema = z
  .object({
    SANITY_PROJECT_ID: z.string().min(1, 'SANITY_PROJECT_ID is required'),
    SANITY_DATASET: z.string().min(1, 'SANITY_DATASET is required'),
    PUBLIC_API_URL: z.string().url('PUBLIC_API_URL must be a valid URL'),
    SANITY_READ_TOKEN: z.string().optional(),
  })
  .passthrough();

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('; ');
  throw new Error(
    `Invalid environment variables for Web app. ${message}. Check your root .env.`,
  );
}

export type WebEnv = z.infer<typeof envSchema>;

export const env: WebEnv = parsed.data;

