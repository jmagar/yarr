export interface ProwlarrConfig {
  url: string;
  apiKey: string;
}

export interface IndexerResponse {
  id: number;
  name: string;
  status: string;
  protocol: string;
  categories: number[];
  enable: boolean;
  enableSearch: boolean;
}

export interface SearchResult {
  title: string;
  size: number;
  downloadUrl: string;
  indexer: string;
  category: string;
  publishDate: string;
  seeders?: number;
  leechers?: number;
  magnetUrl?: string;
}

export interface IndexerStats {
  indexerId: number;
  averageResponseTime: number;
  successRate: number;
  totalQueries: number;
} 