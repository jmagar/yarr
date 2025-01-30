import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { OverseerrConfig, MediaRequest, Media, User, SearchResult, Stats, ErrorCode } from './types.js';

export class OverseerrApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: OverseerrConfig) {
    if (!config.url || !config.apiKey) {
      throw new Error('Overseerr URL and API key are required');
    }
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

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const attempts = this.config.retryAttempts ?? this.defaultRetryAttempts;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        const error = err as Error;
        lastError = error;
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
   * Base request implementation
   */
  async request<T>(endpoint: string, options: {
    method?: string;
    params?: Record<string, unknown>;
    body?: string;
  } = {}): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v1${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
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
        method: options.method ?? 'GET',
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: options.body,
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
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new ServiceError(
          ErrorCodes.TIMEOUT,
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { endpoint }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Search
  async search(query: string, page: number = 1): Promise<SearchResult> {
    return this.request<SearchResult>(`/search?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async searchMovies(query: string, page: number = 1): Promise<SearchResult> {
    return this.request<SearchResult>(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`);
  }

  async searchTv(query: string, page: number = 1): Promise<SearchResult> {
    return this.request<SearchResult>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
  }

  // Media Requests
  async getRequests(status?: string, take = 10, skip = 0): Promise<{
    pageInfo: {
      results: number;
      pages: number;
      page: number;
      pageSize: number;
    };
    results: Array<{
      id: number;
      status: string;
      createdAt: string;
      updatedAt: string;
      type: 'movie' | 'tv';
      is4k: boolean;
      serverId: number;
      profileId: number;
      rootFolder: string;
      languageProfileId?: number;
      tags: string[];
      media: {
        id: number;
        mediaType: 'movie' | 'tv';
        tmdbId: number;
        tvdbId?: number;
        imdbId?: string;
        status: string;
        status4k: string;
      };
      requestedBy: {
        id: number;
        email: string;
        username?: string;
        displayName?: string;
        avatar?: string;
      };
      modifiedBy?: {
        id: number;
        email: string;
        username?: string;
        displayName?: string;
        avatar?: string;
      };
    }>;
  }> {
    const params = new URLSearchParams({
      take: take.toString(),
      skip: skip.toString()
    });
    if (status) params.append('status', status);
    return this.request(`/request?${params.toString()}`);
  }

  async getRequest(id: number): Promise<{
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    type: 'movie' | 'tv';
    is4k: boolean;
    serverId: number;
    profileId: number;
    rootFolder: string;
    languageProfileId?: number;
    tags: string[];
    media: {
      id: number;
      mediaType: 'movie' | 'tv';
      tmdbId: number;
      tvdbId?: number;
      imdbId?: string;
      status: string;
      status4k: string;
    };
    requestedBy: {
      id: number;
      email: string;
      username?: string;
      displayName?: string;
      avatar?: string;
    };
    modifiedBy?: {
      id: number;
      email: string;
      username?: string;
      displayName?: string;
      avatar?: string;
    };
  }> {
    return this.request(`/request/${id}`);
  }

  async createRequest(data: {
    mediaType: 'movie' | 'tv';
    mediaId: number;
    is4k?: boolean;
    serverId?: number;
    profileId?: number;
    rootFolder?: string;
    languageProfileId?: number;
    tags?: string[];
  }): Promise<{
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    type: 'movie' | 'tv';
    is4k: boolean;
    serverId: number;
    profileId: number;
    rootFolder: string;
    languageProfileId?: number;
    tags: string[];
    media: {
      id: number;
      mediaType: 'movie' | 'tv';
      tmdbId: number;
      tvdbId?: number;
      imdbId?: string;
      status: string;
      status4k: string;
    };
    requestedBy: {
      id: number;
      email: string;
      username?: string;
      displayName?: string;
      avatar?: string;
    };
  }> {
    return this.request('/request', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRequest(id: number, data: {
    status?: string;
    is4k?: boolean;
    serverId?: number;
    profileId?: number;
    rootFolder?: string;
    languageProfileId?: number;
    tags?: string[];
  }): Promise<void> {
    await this.request(`/request/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRequest(id: number): Promise<void> {
    await this.request(`/request/${id}`, {
      method: 'DELETE'
    });
  }

  // Media Management
  async getMedia(mediaId: number): Promise<Media> {
    return this.request<Media>(`/media/${mediaId}`);
  }

  async getMediaByTmdbId(tmdbId: number, type: 'movie' | 'tv'): Promise<Media> {
    return this.request<Media>(`/media/${type}/${tmdbId}`);
  }

  // User Management
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getUsers(take: number = 10, skip: number = 0): Promise<{ pageInfo: { pages: number; results: number }; results: User[] }> {
    return this.request(`/user?take=${take}&skip=${skip}`);
  }

  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/user/${userId}`);
  }

  async getUserRequests(userId: number, params: {
    take?: number;
    skip?: number;
    filter?: 'all' | 'pending' | 'approved' | 'declined' | 'processing' | 'available';
  } = {}): Promise<{ pageInfo: { pages: number; results: number }; results: MediaRequest[] }> {
    const searchParams = new URLSearchParams();
    if (params.take) searchParams.append('take', params.take.toString());
    if (params.skip) searchParams.append('skip', params.skip.toString());
    if (params.filter) searchParams.append('filter', params.filter);

    return this.request(`/user/${userId}/requests?${searchParams.toString()}`);
  }

  async updateUserSettings(userId: number, settings: Partial<User['settings']>): Promise<User> {
    return this.request<User>(`/user/${userId}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  // Statistics
  async getStats(): Promise<Stats> {
    return this.request<Stats>('/stats');
  }

  // Status
  async getServerInfo(): Promise<{
    version: string;
    commitTag: string;
    updateAvailable: boolean;
    platform: string;
  }> {
    return this.request('/status');
  }

  // Settings
  async getSettings(): Promise<{
    apiKey: string;
    applicationTitle: string;
    applicationUrl: string;
    trustProxy: boolean;
    csrfProtection: boolean;
    hideAvailable: boolean;
    partialRequestsEnabled: boolean;
    localLogin: boolean;
    newPlexLogin: boolean;
    defaultPermissions: number;
    movie4kEnabled: boolean;
    series4kEnabled: boolean;
  }> {
    return this.request('/settings/public');
  }

  // Discover
  async getTrending(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/${mediaType}/trending?page=${page}`);
  }

  async getPopular(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/${mediaType}/popular?page=${page}`);
  }

  async getUpcoming(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/${mediaType}/upcoming?page=${page}`);
  }

  async getNowPlaying(page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/movie/now-playing?page=${page}`);
  }

  async getAiringTv(page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/tv/airing?page=${page}`);
  }

  // Recommendations
  async getRecommendations(mediaType: 'movie' | 'tv', tmdbId: number, page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/${mediaType}/${tmdbId}/recommendations?page=${page}`);
  }

  async getSimilar(mediaType: 'movie' | 'tv', tmdbId: number, page: number = 1): Promise<SearchResult> {
    return this.request(`/discover/${mediaType}/${tmdbId}/similar?page=${page}`);
  }
} 