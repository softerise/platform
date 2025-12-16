export type FirebaseConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/**
 * Lightweight placeholder. Swap with a real Firebase Admin SDK wrapper when credentials are provided.
 */
export function createNotificationClient(config?: FirebaseConfig) {
  return {
    async send(data: Record<string, unknown>) {
      if (!config) {
        // No credentials provided, run as noop for local dev.
        return { delivered: false, reason: 'firebase-not-configured', data };
      }

      // TODO: integrate firebase-admin when secrets are available.
      return { delivered: true, projectId: config.projectId, data };
    },
  };
}
