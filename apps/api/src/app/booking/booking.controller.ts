import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingCreate, BookingSchema } from '@project/contracts';

@Controller('bookings')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  @Get()
  async list() {
    const bookings = await this.service.list();
    return bookings.map((booking) => BookingSchema.parse(booking));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: BookingCreate) {
    return this.service.create(body);
  }
}

