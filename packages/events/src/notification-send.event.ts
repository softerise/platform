import { z } from 'zod';
import { UserIdSchema } from '@project/contracts';

// ============================================
// NOTIFICATION EVENT SCHEMA
// ============================================

export const NOTIFICATION_SEND_EVENT = 'notification.send' as const;

export const NotificationChannelSchema = z.enum(['fcm', 'email', 'sms']);

export const NotificationSendPayloadSchema = z.object({
  userId: UserIdSchema,
  channel: NotificationChannelSchema,
  template: z.string(),
  data: z.record(z.string(), z.unknown()),
  // channel-specific
  fcmToken: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const NotificationSendEventSchema = z.object({
  type: z.literal(NOTIFICATION_SEND_EVENT),
  payload: NotificationSendPayloadSchema,
  metadata: z.object({
    correlationId: z.string().uuid(),
    timestamp: z.date(),
    version: z.literal(1),
    source: z.enum(['api', 'worker']),
  }),
});

export type NotificationSendEvent = z.infer<typeof NotificationSendEventSchema>;

