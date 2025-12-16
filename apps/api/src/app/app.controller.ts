import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { SearchService } from './search.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    // Explicit assignment to avoid issues with reflection in test runners.
    this.appService =
      appService ?? new AppService(new PrismaService(), new SearchService());
    Logger.log(`AppService injected: ${!!this.appService}`, 'AppController');
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Post('llama/summarize')
  summarize(@Body('text') text: string) {
    return this.appService.summarize(text ?? 'Hello from LlamaIndex');
  }
}
