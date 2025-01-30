import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { OverseerrApi } from './api.js';
import { OverseerrConfig, MediaRequest, Media, User, SearchResult, Stats, MovieResult, TvResult, RequestStatus, PageInfo } from './types.js';

export class OverseerrService {
  private readonly api: OverseerrApi;

  constructor(config: OverseerrConfig) {
    this.api = new OverseerrApi(config);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.api.getServerInfo();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === ErrorCodes.AUTHENTICATION_ERROR) {
        return false;
      }
      if (error instanceof Error) {
        throw new ServiceError(ErrorCodes.AUTHENTICATION_ERROR, error.message, { error });
      }
      throw new ServiceError(ErrorCodes.UNKNOWN, 'Unknown error occurred', { error });
    }
  }

  async getRequests(params: {
    take?: number;
    skip?: number;
    filter?: RequestStatus;
    sort?: string;
    requestedBy?: number;
  } = {}): Promise<PageInfo<MediaRequest>> {
    type ApiResponse = {
      pageInfo: { pages: number; results: number; page: number; pageSize: number };
      results: Array<Omit<MediaRequest, 'status'> & { status: string }>;
    };
    
    const response = await this.api.request<ApiResponse>('/request', { params });
    return {
      pageInfo: response.pageInfo,
      results: response.results.map(result => ({
        ...result,
        status: result.status as RequestStatus
      }))
    };
  }

  async getRequest(requestId: number): Promise<MediaRequest> {
    type ApiResponse = Omit<MediaRequest, 'status'> & { status: string };
    
    const response = await this.api.request<ApiResponse>(`/request/${requestId}`);
    return {
      ...response,
      status: response.status as RequestStatus
    };
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
    seasons?: number[];
  }): Promise<MediaRequest> {
    const response = await this.api.createRequest(data);
    const mediaResponse = response.media as {
      id: number;
      mediaType: 'movie' | 'tv';
      tmdbId: number;
      tvdbId?: number;
      imdbId?: string;
      status: string;
      status4k: string;
      lastSeasonChange?: string;
      mediaInfo?: Record<string, unknown>;
    };

    return {
      ...response,
      status: response.status as RequestStatus,
      media: {
        id: mediaResponse.id,
        mediaType: mediaResponse.mediaType,
        tmdbId: mediaResponse.tmdbId,
        tvdbId: mediaResponse.tvdbId,
        status: parseInt(mediaResponse.status, 10),
        status4k: parseInt(mediaResponse.status4k, 10),
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        lastSeasonChange: mediaResponse.lastSeasonChange,
        mediaInfo: mediaResponse.mediaInfo
      }
    };
  }

  async updateRequest(id: number, data: {
    status?: RequestStatus;
    is4k?: boolean;
    serverId?: number;
    profileId?: number;
    rootFolder?: string;
    languageProfileId?: number;
    tags?: string[];
  }): Promise<void> {
    await this.api.updateRequest(id, data);
  }

  async updateRequestStatus(requestId: number, status: RequestStatus): Promise<MediaRequest> {
    return this.api.request(`/request/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async deleteRequest(requestId: number): Promise<void> {
    return this.api.request(`/request/${requestId}`, {
      method: 'DELETE'
    });
  }

  async getMedia(mediaId: number): Promise<Media> {
    return this.api.getMedia(mediaId);
  }

  async getMediaByTmdbId(tmdbId: number, type: 'movie' | 'tv'): Promise<Media> {
    return this.api.getMediaByTmdbId(tmdbId, type);
  }

  async getCurrentUser(): Promise<User> {
    return this.api.getCurrentUser();
  }

  async getUsers(take: number = 10, skip: number = 0): Promise<{
    pageInfo: {
      pages: number;
      results: number;
    };
    results: User[];
  }> {
    return this.api.getUsers(take, skip);
  }

  async getUser(userId: number): Promise<User> {
    return this.api.getUser(userId);
  }

  async getUserRequests(userId: number, params: {
    take?: number;
    skip?: number;
    filter?: RequestStatus;
  } = {}): Promise<{
    pageInfo: {
      pages: number;
      results: number;
    };
    results: MediaRequest[];
  }> {
    return this.api.getUserRequests(userId, params);
  }

  async updateUserSettings(userId: number, settings: Partial<User['settings']>): Promise<User> {
    return this.api.updateUserSettings(userId, settings);
  }

  async getStats(): Promise<Stats> {
    return this.api.getStats();
  }

  async getServerInfo(): Promise<{
    version: string;
    commitTag: string;
    updateAvailable: boolean;
    platform: string;
  }> {
    return this.api.getServerInfo();
  }

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
    return this.api.getSettings();
  }

  async getTrending(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.api.getTrending(mediaType, page);
  }

  async getPopular(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.api.getPopular(mediaType, page);
  }

  async getUpcoming(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    return this.api.getUpcoming(mediaType, page);
  }

  async getNowPlaying(page: number = 1): Promise<SearchResult> {
    return this.api.getNowPlaying(page);
  }

  async getAiringTv(page: number = 1): Promise<SearchResult> {
    return this.api.getAiringTv(page);
  }

  async getRecommendations(mediaType: 'movie' | 'tv', tmdbId: number, page: number = 1): Promise<SearchResult> {
    return this.api.getRecommendations(mediaType, tmdbId, page);
  }

  async getSimilar(mediaType: 'movie' | 'tv', tmdbId: number, page: number = 1): Promise<SearchResult> {
    return this.api.getSimilar(mediaType, tmdbId, page);
  }

  // Enhanced Search Operations
  async searchAll(query: string, options: {
    page?: number;
    includeMedia?: boolean;
  } = {}): Promise<{
    movies: MovieResult[];
    tvShows: TvResult[];
  }> {
    const results = await this.api.search(query, options.page);
    
    return {
      movies: results.results.filter((r: any): r is MovieResult => r.mediaType === 'movie'),
      tvShows: results.results.filter((r: any): r is TvResult => r.mediaType === 'tv')
    };
  }

  async findAndRequest(params: {
    query: string;
    mediaType: 'movie' | 'tv';
    autoApprove?: boolean;
    seasons?: number[];
  }): Promise<MediaRequest> {
    // Search for the media
    const searchResults = params.mediaType === 'movie' 
      ? await this.api.searchMovies(params.query)
      : await this.api.searchTv(params.query);

    if (searchResults.results.length === 0) {
      throw new Error(`No ${params.mediaType} found matching "${params.query}"`);
    }

    // Get the first result
    const media = searchResults.results[0];

    // Create the request
    const request = await this.createRequest({
      mediaType: params.mediaType,
      mediaId: media.id,
      seasons: params.seasons
    });

    // Auto-approve if requested
    if (params.autoApprove) {
      await this.updateRequest(request.id, { status: 'approved' });
      return this.getRequest(request.id);
    }

    return request;
  }

  // Enhanced Request Management
  async getRequestsByStatus(status: RequestStatus): Promise<PageInfo<MediaRequest>> {
    return this.getRequests({ filter: status });
  }

  async getPendingRequests(): Promise<PageInfo<MediaRequest>> {
    return this.getRequestsByStatus('pending');
  }

  async getApprovedRequests(): Promise<PageInfo<MediaRequest>> {
    return this.getRequestsByStatus('approved');
  }

  async getAvailableRequests(): Promise<PageInfo<MediaRequest>> {
    return this.getRequestsByStatus('available');
  }

  async getDeclinedRequests(): Promise<PageInfo<MediaRequest>> {
    return this.getRequestsByStatus('declined');
  }

  async batchUpdateRequests(requestIds: number[], status: RequestStatus): Promise<MediaRequest[]> {
    return Promise.all(
      requestIds.map(id => this.updateRequestStatus(id, status))
    );
  }

  // Enhanced Media Management
  async isMediaAvailable(mediaType: 'movie' | 'tv', tmdbId: number): Promise<boolean> {
    try {
      const media = await this.api.getMediaByTmdbId(tmdbId, mediaType);
      return media.status === 5; // 5 = Available
    } catch {
      return false;
    }
  }

  // Enhanced User Management
  async getUserActivity(userId: number): Promise<{
    pendingRequests: MediaRequest[];
    approvedRequests: MediaRequest[];
    availableRequests: MediaRequest[];
  }> {
    const [pending, approved, available] = await Promise.all([
      this.api.getUserRequests(userId, { filter: 'pending' }),
      this.api.getUserRequests(userId, { filter: 'approved' }),
      this.api.getUserRequests(userId, { filter: 'available' })
    ]);

    return {
      pendingRequests: pending.results,
      approvedRequests: approved.results,
      availableRequests: available.results
    };
  }

  // Enhanced Discovery
  async getPopularAvailable(mediaType: 'movie' | 'tv', page: number = 1): Promise<SearchResult> {
    const popular = await this.api.getPopular(mediaType, page);
    
    // Filter to only show available content
    const availabilityChecks = await Promise.all(
      popular.results.map((result: MovieResult | TvResult) => 
        this.isMediaAvailable(mediaType, result.id)
      )
    );

    return {
      ...popular,
      results: popular.results.filter((_, index: number) => availabilityChecks[index])
    };
  }

  async getTrendingWithRecommendations(mediaType: 'movie' | 'tv', page: number = 1): Promise<{
    trending: SearchResult;
    recommendations: SearchResult[];
  }> {
    const trending = await this.api.getTrending(mediaType, page);
    
    // Get recommendations for each trending item
    const recommendations = await Promise.all(
      trending.results.slice(0, 3).map((result: MovieResult | TvResult) =>
        this.api.getRecommendations(mediaType, result.id)
      )
    );

    return {
      trending,
      recommendations
    };
  }

  // Status & Health
  async getSystemStatus(): Promise<{
    version: string;
    healthy: boolean;
    pendingRequestCount: number;
    availableMovies: number;
    availableSeries: number;
  }> {
    const [serverInfo, stats] = await Promise.all([
      this.api.getServerInfo(),
      this.api.getStats()
    ]);

    return {
      version: serverInfo.version,
      healthy: !serverInfo.updateAvailable,
      pendingRequestCount: stats.pendingRequests,
      availableMovies: stats.totalMovies,
      availableSeries: stats.totalSeries
    };
  }

  // Direct API Access
  getApi(): OverseerrApi {
    return this.api;
  }
} 