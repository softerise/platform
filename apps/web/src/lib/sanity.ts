import { createClient } from '@sanity/client';
import { env, hasSanityEnv } from '../config/env';

export const sanityClient = hasSanityEnv
  ? createClient({
      projectId: env.SANITY_PROJECT_ID ?? '',
      dataset: env.SANITY_DATASET ?? '',
      apiVersion: '2025-01-01',
      useCdn: true,
      token: env.SANITY_READ_TOKEN,
    })
  : null;

export async function fetchLatestArticles<T extends Record<string, unknown>>() {
  if (!sanityClient) {
    console.warn('Sanity env not set; skipping remote content fetch.');
    return [] as T[];
  }

  try {
    return sanityClient.fetch<T[]>(
      `*[_type == "post"] | order(_createdAt desc)[0...3]{ _id, title, slug }`,
    );
  } catch (error) {
    console.error('Sanity fetch failed', error);
    return [] as T[];
  }
}

