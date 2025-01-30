import { ServiceConfig } from '@media-mcp/shared';

export interface ProwlarrConfig extends ServiceConfig {
  apiKey: string;
}

export interface SearchResult {
  guid: string;
  title: string;
  size: number;
  downloadUrl: string;
  indexer: string;
  publishDate: string;
}

export interface IndexerResponse {
  id: number;
  name: string;
  fields: Array<{
    name: string;
    value: string;
  }>;
  implementationName: string;
  implementation: string;
  configContract: string;
  infoLink: string;
  message: {
    message: string;
    type: string;
  };
  tags: number[];
  presets: Array<{
    name: string;
    fields: Array<{
      name: string;
      value: string;
    }>;
  }>;
  enabled: boolean;
  protocol: string;
  priority: number;
  downloadClientId: number;
  downloadClient?: string;
  categories: Array<{
    id: number;
    name: string;
    subCategories: Array<{
      id: number;
      name: string;
    }>;
  }>;
}

export interface IndexerStats {
  indexerId: number;
  indexerName: string;
  averageResponseTime: number;
  numberOfQueries: number;
  numberOfGrabs: number;
  numberOfRssQueries: number;
  numberOfAuthQueries: number;
  numberOfFailedQueries: number;
  numberOfFailedGrabs: number;
  numberOfFailedRssQueries: number;
  numberOfFailedAuthQueries: number;
  successRate: number;
} 