import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { ClaudeAdapter, OpenAIAdapter } from './llm.repository';

@Module({
  imports: [ConfigModule],
  controllers: [LlmController],
  providers: [LlmService, ClaudeAdapter, OpenAIAdapter],
  exports: [LlmService],
})
export class LlmModule {}

