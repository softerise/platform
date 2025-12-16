import { describe, expect, it } from 'vitest';
import { BookingCreateSchema, EmailSchema, UserSchema } from './contracts.js';

describe('contracts', () => {
  it('parses a valid user', () => {
    const result = UserSchema.safeParse({
      id: crypto.randomUUID(),
      email: 'user@example.com',
      role: 'user',
      firstName: 'Ada',
      lastName: 'Lovelace',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = EmailSchema.safeParse('not-an-email');
    expect(result.success).toBe(false);
  });

  it('builds booking payload', () => {
    const result = BookingCreateSchema.parse({
      userId: crypto.randomUUID(),
      totalAmount: 1200,
      currency: 'USD',
      bookingDate: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(result.totalAmount).toBe(1200);
  });
});
