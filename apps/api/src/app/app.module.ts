import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BookingController } from './booking/booking.controller';
import { BookingService } from './booking/booking.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { NotificationQueue } from './queue.service';
import { SearchService } from './search.service';
import { configuration, envFilePaths, validationSchema } from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePaths,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
  ],
  controllers: [AppController, BookingController],
  providers: [
    AppService,
    BookingService,
    PrismaService,
    NotificationQueue,
    SearchService,
  ],
})
export class AppModule {}
