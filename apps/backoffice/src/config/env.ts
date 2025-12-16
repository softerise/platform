import { z } from 'zod';

const envSchema = z
  .object({
    VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  })
  .passthrough();

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('; ');
  throw new Error(
    `Invalid environment variables for Backoffice app. ${message}. Check your root .env.`,
  );
}

export type BackofficeEnv = z.infer<typeof envSchema>;

export const env: BackofficeEnv = parsed.data;

