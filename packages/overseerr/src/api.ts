import { ServiceError } from '@media-mcp/shared';
import { OverseerrConfig, MediaRequest, Media, User, SearchResult, Stats, ErrorCode } from './types.js';

export class OverseerrApi {
  constructor(private config: OverseerrConfig) {
    if (!config.url || !config.apiKey) {
      throw new Error('Overseerr URL and API key are required');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      // Ensure URL ends with /api/v1
      const baseUrl = this.config.url.endsWith('/') ? this.config.url.slice(0, -1) : this.config.url;
      const apiUrl = `${baseUrl}/api/v1${endpoint}`;

      console.error('Making request to:', apiUrl); // Debug logging

      const response = await fetch(apiUrl, {
        ...options,
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Version': '1',
          ...options.headers
        }
      });

      if (!response.ok) {
        // Debug logging
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: await response.text()
        });

        throw new ServiceError(
          response.status === 401 ? ErrorCode.AUTH_ERROR : ErrorCode.API_ERROR,
          `API error: ${response.statusText}`,
          { status: response.status }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      throw new ServiceError(
        ErrorCode.NETWORK_ERROR,
        'Failed to connect to Overseerr',
        { error }
      );
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
  async getRequests(params: {
    take?: number;
    skip?: number;
    filter?: 'all' | 'pending' | 'approved' | 'declined' | 'processing' | 'available';
    sort?: 'added' | 'modified';
    requestedBy?: number;
  } = {}): Promise<{ pageInfo: { pages: number; results: number }; results: MediaRequest[] }> {
    const searchParams = new URLSearchParams();
    if (params.take) searchParams.append('take', params.take.toString());
    if (params.skip) searchParams.append('skip', params.skip.toString());
    if (params.filter) searchParams.append('filter', params.filter);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.requestedBy) searchParams.append('requestedBy', params.requestedBy.toString());

    return this.request(`/request?${searchParams.toString()}`);
  }

  async getRequest(requestId: number): Promise<MediaRequest> {
    return this.request<MediaRequest>(`/request/${requestId}`);
  }

  async createRequest(params: {
    mediaType: 'movie' | 'tv';
    mediaId: number;
    tvdbId?: number;
    seasons?: number[];
  }): Promise<MediaRequest> {
    return this.request<MediaRequest>('/request', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async updateRequest(requestId: number, status: 'pending' | 'approved' | 'declined'): Promise<MediaRequest> {
    return this.request<MediaRequest>(`/request/${requestId}/${status}`, {
      method: 'POST'
    });
  }

  async deleteRequest(requestId: number): Promise<void> {
    await this.request(`/request/${requestId}`, {
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
  async getStatus(): Promise<{
    version: string;
    commitTag: string;
    updateAvailable: boolean;
    commitsBehind: number;
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