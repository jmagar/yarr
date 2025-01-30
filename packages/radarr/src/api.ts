import { ServiceError } from '@media-mcp/shared';
import { 
  ServiceConfig, 
  MovieResponse,
  MovieLookupParams,
  CommandResponse, 
  StatsResponse, 
  HealthCheckResponse,
  QualityProfileResponse,
  QueryParams,
  ErrorCode
} from './types.js';

export class ServiceApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: ServiceConfig) {
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
   * Retry logic implementation
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const attempts = this.config.retryAttempts ?? this.defaultRetryAttempts;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof ServiceError) {
          if (error.code === 'RATE_LIMIT') {
            const retryAfter = parseInt((error.context as { retryAfter?: string })?.retryAfter ?? '1');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          if (['AUTHENTICATION_ERROR', 'VALIDATION_ERROR'].includes(error.code)) {
            throw error; // Don't retry these errors
          }
        }
        if (attempt < attempts) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000))
          );
        }
      }
    }
    throw lastError;
  }

  /**
   * Base request implementation with error handling
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    query?: QueryParams
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v1${endpoint}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v.toString()));
          } else {
            url.searchParams.set(key, value.toString());
          }
        }
      });
    }

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

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new ServiceError(
          'RATE_LIMIT',
          `Rate limited. Please wait ${retryAfter} seconds`,
          { retryAfter }
        );
      }

      if (response.status === 404) {
        throw new ServiceError(
          'NOT_FOUND',
          `Resource not found: ${endpoint}`,
          { url: url.toString() }
        );
      }

      if (response.status === 401) {
        throw new ServiceError(
          'AUTHENTICATION_ERROR',
          'Invalid API key or unauthorized access',
          { endpoint }
        );
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new ServiceError(
          'API_ERROR',
          `API error: ${response.statusText}`,
          { 
            status: response.status,
            endpoint,
            error: errorBody 
          }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      if ((error as { name?: string }).name === 'AbortError') {
        throw new ServiceError(
          'TIMEOUT',
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { endpoint }
        );
      }
      
      throw new ServiceError(
        'NETWORK_ERROR',
        'Failed to connect to service',
        { error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Movie Operations
   */
  
  async getMovies(query?: QueryParams): Promise<MovieResponse[]> {
    return this.withRetry(() => this.request<MovieResponse[]>('/movie', {}, query));
  }

  async getMovie(id: number): Promise<MovieResponse> {
    return this.withRetry(() => this.request<MovieResponse>(`/movie/${id}`));
  }

  async addMovie(data: Partial<MovieResponse>): Promise<MovieResponse> {
    return this.withRetry(() => 
      this.request<MovieResponse>('/movie', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    );
  }

  async updateMovie(id: number, data: Partial<MovieResponse>): Promise<MovieResponse> {
    return this.withRetry(() =>
      this.request<MovieResponse>(`/movie/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    );
  }

  async deleteMovie(id: number, deleteFiles = false): Promise<void> {
    return this.withRetry(() =>
      this.request<void>(`/movie/${id}?deleteFiles=${deleteFiles}`, {
        method: 'DELETE'
      })
    );
  }

  /**
   * Movie Lookup & Search
   */

  async lookupMovie(params: MovieLookupParams): Promise<MovieResponse[]> {
    const queryParams = new URLSearchParams();
    if (params.term) queryParams.set('term', params.term);
    if (params.tmdbId) queryParams.set('tmdbId', params.tmdbId.toString());
    if (params.imdbId) queryParams.set('imdbId', params.imdbId);

    return this.withRetry(() =>
      this.request<MovieResponse[]>(`/movie/lookup?${queryParams.toString()}`)
    );
  }

  async searchMovie(id: number): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>('/command', {
        method: 'POST',
        body: JSON.stringify({
          name: 'MoviesSearch',
          movieIds: [id]
        })
      })
    );
  }

  /**
   * Quality Profiles
   */

  async getQualityProfiles(): Promise<QualityProfileResponse[]> {
    return this.withRetry(() =>
      this.request<QualityProfileResponse[]>('/qualityprofile')
    );
  }

  async getQualityProfile(id: number): Promise<QualityProfileResponse> {
    return this.withRetry(() =>
      this.request<QualityProfileResponse>(`/qualityprofile/${id}`)
    );
  }

  /**
   * Command Operations
   */

  async executeCommand(name: string, body?: Record<string, unknown>): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>('/command', {
        method: 'POST',
        body: JSON.stringify({
          name,
          ...body
        })
      })
    );
  }

  async getCommand(id: number): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>(`/command/${id}`)
    );
  }

  /**
   * System Operations
   */

  async getSystemStatus(): Promise<HealthCheckResponse> {
    return this.withRetry(() =>
      this.request<HealthCheckResponse>('/system/status')
    );
  }

  async getSystemHealth(): Promise<HealthCheckResponse> {
    return this.withRetry(() =>
      this.request<HealthCheckResponse>('/health')
    );
  }

  async getStats(): Promise<StatsResponse> {
    return this.withRetry(() =>
      this.request<StatsResponse>('/system/status')
    );
  }

  /**
   * Queue Operations
   */

  async getQueue(query?: QueryParams): Promise<{
    page: number;
    pageSize: number;
    sortKey: string;
    sortDirection: string;
    totalRecords: number;
    records: Array<{
      movieId: number;
      title: string;
      status: string;
      trackedDownloadStatus: string;
      trackedDownloadState: string;
      statusMessages: Array<{
        title: string;
        messages: string[];
      }>;
      errorMessage?: string;
      downloadId?: string;
      protocol: string;
      downloadClient?: string;
      indexer?: string;
      outputPath?: string;
      quality: {
        quality: {
          id: number;
          name: string;
          source: string;
          resolution: number;
        };
        revision: {
          version: number;
          real: number;
        };
      };
    }>;
  }> {
    return this.withRetry(() =>
      this.request('/queue', {}, query)
    );
  }

  async removeFromQueue(id: number, blacklist = false): Promise<void> {
    return this.withRetry(() =>
      this.request(`/queue/${id}?blacklist=${blacklist}`, {
        method: 'DELETE'
      })
    );
  }

  /**
   * Utility Methods
   */

  async testConnection(): Promise<boolean> {
    try {
      await this.getSystemStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getSystemStatus();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'AUTHENTICATION_ERROR') {
        return false;
      }
      throw error;
    }
  }
} 