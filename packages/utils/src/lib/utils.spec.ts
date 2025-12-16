import { describe, expect, it } from 'vitest';
import { createCorrelationId, pick, sleep } from './utils.js';

describe('utils helpers', () => {
  it('creates a correlation id', () => {
    expect(createCorrelationId()).toHaveLength(36);
  });

  it('picks keys', () => {
    expect(pick({ a: 1, b: 2 }, ['b'])).toEqual({ b: 2 });
  });

  it('sleeps', async () => {
    const start = Date.now();
    await sleep(5);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });
});
