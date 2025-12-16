import { describe, expect, it } from 'vitest';
import { createNotificationClient } from './infra-firebase.js';

describe('infra-firebase stub', () => {
  it('noops when config missing', async () => {
    const client = createNotificationClient();
    const result = await client.send({ hello: 'world' });
    expect(result.delivered).toBe(false);
  });
});
