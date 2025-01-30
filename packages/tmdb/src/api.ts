import { TMDBConfig } from './types.js';

interface ErrorContext {
  retryAfter?: string;
}

interface ApiError extends Error {
  context?: ErrorContext;
}

export class TMDBApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: TMDBConfig) {
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
      } catch (err) {
        const error = err as ApiError;
        lastError = error;
        if (error.context?.retryAfter) {
          const retryAfter = parseInt(error.context.retryAfter ?? '1');
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.rateLimit();

    const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.searchParams.set('api_key', this.config.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const error = new Error(`TMDB API error: ${response.status} ${response.statusText}`) as ApiError;
        error.context = {
          retryAfter: response.headers.get('retry-after') ?? undefined
        };
        throw error;
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new Error('TMDB API request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // API Methods
  async searchMovies(query: string): Promise<any> {
    return this.request('/search/movie', {
      method: 'GET',
      params: { query }
    });
  }

  async searchTVShows(query: string): Promise<any> {
    return this.request('/search/tv', {
      method: 'GET',
      params: { query }
    });
  }

  async getMovie(id: number): Promise<any> {
    return this.request(`/movie/${id}`);
  }

  async getTVShow(id: number): Promise<any> {
    return this.request(`/tv/${id}`);
  }
} 