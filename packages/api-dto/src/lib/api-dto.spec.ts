import { describe, expect, it } from 'vitest';
import { BookingCreateSchema } from '@project/contracts';
import { BookingCreateRequest } from './api-dto.js';

describe('api-dto placeholders', () => {
  it('mirrors contracts booking create', () => {
    const dto: BookingCreateRequest = BookingCreateSchema.parse({
      userId: crypto.randomUUID(),
      totalAmount: 100,
      currency: 'TRY',
      bookingDate: new Date(),
    });

    expect(dto.totalAmount).toBe(100);
  });
});
