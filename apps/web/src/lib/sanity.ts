import { createClient } from '@sanity/client';

const projectId = import.meta.env.SANITY_PROJECT_ID ?? 'demo';
const dataset = import.meta.env.SANITY_DATASET ?? 'production';
const token = import.meta.env.SANITY_READ_TOKEN;

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  useCdn: true,
  token,
});

