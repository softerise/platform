import { describe, expect, it } from 'vitest';
import { prismaSchemaPath } from './db-schema.js';

describe('db paths', () => {
  it('exposes prisma schema path', () => {
    expect(prismaSchemaPath.endsWith('prisma/schema.prisma')).toBe(true);
  });
});
