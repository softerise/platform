import { Injectable, Logger } from '@nestjs/common';
import { Document, VectorStoreIndex } from 'llamaindex';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  async summarize(text: string) {
    try {
      const doc = new Document({ text });
      const index = await VectorStoreIndex.fromDocuments([doc]);
      const queryEngine = index.asQueryEngine();
      const response = await queryEngine.query({ query: 'Summarize' });
      return String(response);
    } catch (error) {
      this.logger.warn(`LlamaIndex fallback: ${error}`);
      return 'LlamaIndex disabled in local mode.';
    }
  }
}

