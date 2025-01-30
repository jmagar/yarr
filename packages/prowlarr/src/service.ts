import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { ProwlarrApi } from './api.js';
import type { ProwlarrConfig, IndexerResponse, SearchResult } from './types.js';

export class ProwlarrService {
  private readonly api: ProwlarrApi;

  constructor(config: ProwlarrConfig) {
    this.api = new ProwlarrApi(config);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.api.getServerInfo();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === ErrorCodes.AUTHENTICATION_ERROR) {
        return false;
      }
      if (error instanceof Error) {
        throw new ServiceError(ErrorCodes.AUTHENTICATION_ERROR, error.message, { error });
      }
      throw new ServiceError(ErrorCodes.UNKNOWN, 'Unknown error occurred', { error });
    }
  }

  async searchWithMetadata(query: string, type?: string): Promise<SearchResult[]> {
    const results = await this.api.search(query, type);
    return results.map(result => ({
      guid: result.guid,
      title: result.title,
      size: result.size,
      downloadUrl: result.downloadUrl,
      indexer: result.indexer,
      publishDate: result.publishDate
    }));
  }

  async getIndexers(): Promise<IndexerResponse[]> {
    return this.api.getIndexers();
  }

  async getIndexer(id: number): Promise<IndexerResponse> {
    return this.api.getIndexer(id);
  }

  async testIndexer(id: number): Promise<void> {
    await this.api.testIndexer(id);
  }

  async getHealthStatus(): Promise<IndexerResponse[]> {
    const indexers = await this.api.getIndexers();
    return indexers.map(indexer => ({
      ...indexer,
      status: indexer.enabled ? 'Enabled' : 'Disabled'
    }));
  }

  async getStats(): Promise<{
    indexerCount: number;
    enabledIndexerCount: number;
    averageResponseTime: number;
    numberOfQueries: number;
    numberOfGrabs: number;
    numberOfFailedQueries: number;
    numberOfFailedGrabs: number;
    successRate: number;
  }> {
    return this.api.getStats();
  }
} 