import { createClient } from '@sanity/client';
import { env } from '../config/env';

export const sanityClient = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET,
  apiVersion: '2025-01-01',
  useCdn: true,
  token: env.SANITY_READ_TOKEN,
});

