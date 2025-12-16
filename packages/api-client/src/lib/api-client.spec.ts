import { describe, expect, it } from 'vitest';
import { getHealth } from './api-client.js';

describe('api-client placeholder', () => {
  it('exposes a health call helper', () => {
    expect(typeof getHealth).toBe('function');
  });
});
