import { z } from 'zod';

// ============================================================================
// Environment Schema
// ============================================================================

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server
  PORT: z.coerce.number().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:4200,http://localhost:4300,http://localhost:4321'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  
  // Firebase
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be valid email'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),
  
  // Cloudflare R2
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  
  // Sanity
  SANITY_PROJECT_ID: z.string().optional(),
  SANITY_DATASET: z.string().optional(),
  SANITY_READ_TOKEN: z.string().optional(),
});

// ============================================================================
// Configuration Type
// ============================================================================

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigins: string[];
  
  database: {
    url: string;
  };
  
  redis: {
    url?: string;
    host?: string;
    port?: number;
  };
  
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  
  r2: {
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
  };
  
  sanity: {
    projectId?: string;
    dataset?: string;
    readToken?: string;
  };
  
  auth: {
    sessionExpiryDefault: string;
    sessionExpiryRememberMe: string;
    maxSessionsPerUser: number;
    lockoutThreshold1: number;
    lockoutDuration1: string;
    lockoutThreshold2: number;
    lockoutDuration2: string;
    lockoutThreshold3: number;
    guestRetentionDays: number;
  };
}

// ============================================================================
// Configuration Factory
// ============================================================================

export const configuration = (): AppConfig => {
  const env = envSchema.parse(process.env);
  
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: env.CORS_ORIGINS.split(',').map(origin => origin.trim()),
    
    database: {
      url: env.DATABASE_URL,
    },
    
    redis: {
      url: env.REDIS_URL,
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Handle escaped newlines in private key
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    
    r2: {
      endpoint: env.R2_ENDPOINT,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME,
    },
    
    sanity: {
      projectId: env.SANITY_PROJECT_ID,
      dataset: env.SANITY_DATASET,
      readToken: env.SANITY_READ_TOKEN,
    },
    
    auth: {
      sessionExpiryDefault: '24h',
      sessionExpiryRememberMe: '30d',
      maxSessionsPerUser: 5,
      lockoutThreshold1: 5,
      lockoutDuration1: '5m',
      lockoutThreshold2: 10,
      lockoutDuration2: '30m',
      lockoutThreshold3: 15,
      guestRetentionDays: 90,
    },
  };
};

// ============================================================================
// Validation Schema (for NestJS ConfigModule)
// ============================================================================

export const validationSchema = {
  validate: (config: Record<string, unknown>) => {
    const result = envSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    return result.data;
  },
};

// ============================================================================
// Environment File Paths
// ============================================================================

export const envFilePaths = [
  '.env.local',
  '.env',
];

