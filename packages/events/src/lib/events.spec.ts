import { describe, expect, it } from 'vitest';
import { createBookingCreatedEvent } from '../booking-created.event.js';
import { EventRegistry } from './events.js';

describe('events', () => {
  it('builds a booking created event', () => {
    const event = createBookingCreatedEvent(
      {
        bookingId: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        totalAmount: 200,
        currency: 'USD',
        bookingDate: new Date(),
      },
      crypto.randomUUID(),
    );

    const schema = EventRegistry['booking.created'];
    expect(schema.parse(event).type).toBe('booking.created');
  });
});
