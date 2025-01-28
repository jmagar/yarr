import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { formatBytes, parseQuality, parseLanguage } from '@media-mcp/shared';
import { z } from "zod";
import { ProwlarrApi } from './api.js';
import { ProwlarrConfig, SearchResult, IndexerResponse, IndexerStats } from './types.js';

interface HealthCheckData {
  name: string;
  status: string;
  protocol: string;
  categories: number[];
  testResult?: string;
}

export class ProwlarrService {
  private api: ProwlarrApi;

  constructor(config: ProwlarrConfig) {
    this.api = new ProwlarrApi(config);
  }

  async searchWithMetadata(query: string, type?: string): Promise<SearchResult[]> {
    return this.api.search(query, type);
  }

  async getIndexers(): Promise<IndexerResponse[]> {
    return this.api.getIndexers();
  }

  async getStats(indexerId?: number): Promise<IndexerStats> {
    return this.api.getStats(indexerId);
  }

  async getHealthStatus(): Promise<IndexerResponse[]> {
    const indexers = await this.api.getIndexers();
    return indexers.map(indexer => ({
      ...indexer,
      status: indexer.enable ? 'Enabled' : 'Disabled'
    }));
  }
} 