import * as Joi from 'joi';
import * as path from 'node:path';
import { ConfigType } from '@nestjs/config';

const workspaceEnv = path.resolve(process.cwd(), '.env');
const relativeEnv = path.resolve(__dirname, '../../../../.env');

export const envFilePaths = [
  // Use workspace root as the single source for local development.
  workspaceEnv,
  // Fallback for ts-node/dev tooling that resolves from the source folder.
  relativeEnv,
];

const parseCorsOrigins = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? '',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? '',
  },
  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS),
  },
});

export type AppConfig = ConfigType<typeof configuration>;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  R2_ENDPOINT: Joi.string().uri().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  CORS_ORIGINS: Joi.string().required(),
});

