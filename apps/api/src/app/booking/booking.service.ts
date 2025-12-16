import { Injectable, Logger } from '@nestjs/common';
import { Booking, BookingCreate, BookingCreateSchema } from '@project/contracts';
import {
  BOOKING_CREATED_EVENT,
  BookingCreatedEvent,
  createBookingCreatedEvent,
} from '@project/events';
import { PrismaService } from '../prisma.service';
import { NotificationQueue } from '../queue.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly fallbackStore: Booking[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueue,
  ) {}

  async list(): Promise<Booking[]> {
    try {
      return await this.prisma.booking.findMany({
        orderBy: { bookingDate: 'desc' },
        take: 20,
      });
    } catch (error) {
      this.logger.warn(
        `Prisma unavailable, returning in-memory bookings: ${error}`,
      );
      return this.fallbackStore;
    }
  }

  async create(input: unknown): Promise<Booking> {
    const payload = BookingCreateSchema.parse(input);
    const baseRecord: Omit<Booking, 'id'> = {
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const created = await this.prisma.booking.create({
        data: {
          id: crypto.randomUUID(),
          ...payload,
        },
      });
      await this.publishEvent(created);
      return created;
    } catch (error) {
      this.logger.warn(
        `Prisma unavailable, persisting booking in memory: ${error}`,
      );
      const fallback: Booking = {
        id: crypto.randomUUID(),
        ...baseRecord,
      };
      this.fallbackStore.unshift(fallback);
      await this.publishEvent(fallback);
      return fallback;
    }
  }

  private async publishEvent(booking: Booking) {
    const event: BookingCreatedEvent = createBookingCreatedEvent(
      {
        bookingId: booking.id,
        userId: booking.userId,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        bookingDate: booking.bookingDate,
      },
      crypto.randomUUID(),
    );

    try {
      await this.queue.publish(BOOKING_CREATED_EVENT, event);
    } catch (error) {
      this.logger.warn(`Queue publish skipped: ${error}`);
    }
  }
}

