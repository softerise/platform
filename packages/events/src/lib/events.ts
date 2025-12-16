import { BookingCreatedEventSchema } from '../booking-created.event.js';
import { NotificationSendEventSchema } from '../notification-send.event.js';

export const EventRegistry = {
  'booking.created': BookingCreatedEventSchema,
  'notification.send': NotificationSendEventSchema,
} as const;

export type EventType = keyof typeof EventRegistry;
