import { ServiceError } from '@media-mcp/shared';
import { ProwlarrConfig, IndexerResponse, SearchResult, IndexerStats } from './types.js';

export class ProwlarrApi {
  constructor(private config: ProwlarrConfig) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.config.url}/api/v1${endpoint}`, {
        ...options,
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new ServiceError(
          'RATE_LIMIT',
          `Rate limited. Please wait ${retryAfter} seconds`,
          { retryAfter }
        );
      }

      if (!response.ok) {
        throw new ServiceError(
          'API_ERROR',
          `Prowlarr API error: ${response.statusText}`,
          { status: response.status }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      throw new ServiceError(
        'NETWORK_ERROR',
        'Failed to connect to Prowlarr',
        { error }
      );
    }
  }

  async getIndexers(): Promise<IndexerResponse[]> {
    return this.request<IndexerResponse[]>('/indexer');
  }

  async search(query: string, type?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query });
    if (type) params.append('type', type);
    
    return this.request<SearchResult[]>(`/search?${params.toString()}`);
  }

  async getStats(indexerId?: number): Promise<IndexerStats> {
    const endpoint = indexerId ? `/indexerstats/${indexerId}` : '/indexerstats';
    return this.request<IndexerStats>(endpoint);
  }

  async testIndexer(indexerId: number): Promise<void> {
    return this.request(`/indexer/${indexerId}/test`, { method: 'POST' });
  }
} 