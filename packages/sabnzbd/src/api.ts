import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { 
  ServiceConfig, 
  ResourceResponse, 
  CommandResponse, 
  StatsResponse, 
  HealthCheckResponse,
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
          if (error.code === ErrorCodes.RATE_LIMIT) {
            const context = error.context as { retryAfter?: string } | undefined;
            const retryAfter = parseInt(context?.retryAfter ?? '1');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          if ([ErrorCodes.AUTHENTICATION_ERROR, ErrorCodes.VALIDATION_ERROR].includes(error.code)) {
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
          ErrorCodes.RATE_LIMIT,
          `Rate limited. Please wait ${retryAfter ?? '60'} seconds`,
          { retryAfter: retryAfter ?? '60' }
        );
      }

      if (response.status === 404) {
        throw new ServiceError(
          ErrorCodes.NOT_FOUND,
          `Resource not found: ${endpoint}`,
          { url: url.toString() }
        );
      }

      if (response.status === 401) {
        throw new ServiceError(
          ErrorCodes.AUTHENTICATION_ERROR,
          'Invalid API key'
        );
      }

      if (!response.ok) {
        throw new ServiceError(
          ErrorCodes.API_ERROR,
          `API error: ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      if ((error as { name?: string })?.name === 'AbortError') {
        throw new ServiceError(
          ErrorCodes.TIMEOUT,
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { endpoint }
        );
      }
      
      throw new ServiceError(
        ErrorCodes.NETWORK_ERROR,
        'Failed to connect to service',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Resource Management
   */
  
  async getResources(query?: QueryParams): Promise<ResourceResponse[]> {
    return this.withRetry(() => this.request<ResourceResponse[]>('/resources', {}, query));
  }

  async getResource(id: number): Promise<ResourceResponse> {
    return this.withRetry(() => this.request<ResourceResponse>(`/resources/${id}`));
  }

  async createResource(data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    return this.withRetry(() => 
      this.request<ResourceResponse>('/resources', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    );
  }

  async updateResource(id: number, data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    return this.withRetry(() =>
      this.request<ResourceResponse>(`/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    );
  }

  async deleteResource(id: number): Promise<void> {
    return this.withRetry(() =>
      this.request<void>(`/resources/${id}`, {
        method: 'DELETE'
      })
    );
  }

  /**
   * Command Operations
   */

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>('/commands', {
        method: 'POST',
        body: JSON.stringify({ command, ...params })
      })
    );
  }

  async getCommandStatus(id: number): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>(`/commands/${id}`)
    );
  }

  /**
   * Statistics & Health
   */

  async getStats(query?: QueryParams): Promise<StatsResponse> {
    return this.withRetry(() =>
      this.request<StatsResponse>('/stats', {}, query)
    );
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.withRetry(() =>
      this.request<HealthCheckResponse>('/health')
    );
  }

  /**
   * Utility Methods
   */

  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'AUTHENTICATION_ERROR') {
        return false;
      }
      throw error;
    }
  }
} 