import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import type { ProwlarrConfig, IndexerResponse, SearchResult } from './types.js';

export class ProwlarrApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: ProwlarrConfig) {
    this.minInterval = 1000 / (config.rateLimitPerSecond ?? this.defaultRateLimit);
  }

  /**
   * Rate limiting implementation
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequest = Date.now();
  }

  /**
   * Base request implementation
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v1${endpoint}`);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ServiceError(ErrorCodes.AUTHENTICATION_ERROR, 'Invalid API key');
        }
        if (response.status === 404) {
          throw new ServiceError(ErrorCodes.NOT_FOUND, `Resource not found: ${endpoint}`);
        }
        throw new ServiceError(ErrorCodes.API_ERROR, `API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      if ((error as Error).name === 'AbortError') {
        throw new ServiceError(
          ErrorCodes.TIMEOUT,
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { endpoint }
        );
      }

      throw new ServiceError(
        ErrorCodes.NETWORK_ERROR,
        'Failed to connect to Prowlarr',
        { error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Search Methods
   */
  async search(query: string, type?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query });
    if (type) params.append('type', type);
    return this.request(`/search?${params.toString()}`);
  }

  /**
   * Indexer Methods
   */
  async getIndexers(): Promise<IndexerResponse[]> {
    return this.request('/indexer');
  }

  async getIndexer(id: number): Promise<IndexerResponse> {
    return this.request(`/indexer/${id}`);
  }

  async testIndexer(id: number): Promise<void> {
    await this.request(`/indexer/${id}/test`, { method: 'POST' });
  }

  /**
   * Server Methods
   */
  async getServerInfo(): Promise<{
    version: string;
    buildTime: string;
    isDebug: boolean;
    isProduction: boolean;
    isAdmin: boolean;
    isUserInteractive: boolean;
    startupPath: string;
    appData: string;
    osVersion: string;
    isMonoRuntime: boolean;
    isMono: boolean;
    isLinux: boolean;
    isOsx: boolean;
    isWindows: boolean;
    branch: string;
    authentication: string;
    sqliteVersion: string;
    urlBase: string;
    runtimeVersion: string;
    runtimeName: string;
  }> {
    return this.request('/system/status');
  }

  /**
   * Stats Methods
   */
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
    return this.request('/system/stats');
  }
} 