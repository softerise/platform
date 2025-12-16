import { z } from 'zod';
import {
  BookingIdSchema,
  CurrencySchema,
  UserIdSchema,
} from '@project/contracts';

// ============================================
// EVENT SCHEMA
// ============================================

export const BOOKING_CREATED_EVENT = 'booking.created' as const;

export const BookingCreatedPayloadSchema = z.object({
  bookingId: BookingIdSchema,
  userId: UserIdSchema,
  totalAmount: z.number().positive(),
  currency: CurrencySchema,
  bookingDate: z.date(),
});

export const BookingCreatedMetadataSchema = z.object({
  correlationId: z.string().uuid(),
  timestamp: z.date(),
  version: z.literal(1),
  source: z.literal('api'),
});

export const BookingCreatedEventSchema = z.object({
  type: z.literal(BOOKING_CREATED_EVENT),
  payload: BookingCreatedPayloadSchema,
  metadata: BookingCreatedMetadataSchema,
});

// ============================================
// TYPES
// ============================================

export type BookingCreatedPayload = z.infer<typeof BookingCreatedPayloadSchema>;
export type BookingCreatedMetadata = z.infer<typeof BookingCreatedMetadataSchema>;
export type BookingCreatedEvent = z.infer<typeof BookingCreatedEventSchema>;

// ============================================
// FACTORY (for testing)
// ============================================

export function createBookingCreatedEvent(
  payload: BookingCreatedPayload,
  correlationId: string,
): BookingCreatedEvent {
  return {
    type: BOOKING_CREATED_EVENT,
    payload,
    metadata: {
      correlationId,
      timestamp: new Date(),
      version: 1,
      source: 'api',
    },
  };
}

