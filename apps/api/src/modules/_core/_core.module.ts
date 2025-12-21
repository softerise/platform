import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { QueueService } from './queue/queue.service';
import { FirebaseStrategy } from './strategies/firebase.strategy';

@Global()
@Module({
  providers: [PrismaService, QueueService, FirebaseStrategy],
  exports: [PrismaService, QueueService, FirebaseStrategy],
})
export class CoreModule {}

