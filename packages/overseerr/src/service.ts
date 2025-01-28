import { OverseerrApi } from './api.js';
import { OverseerrConfig, MediaRequest, Media, User, SearchResult, Stats, MovieResult, TvResult } from './types.js';

export class OverseerrService {
  private api: OverseerrApi;

  constructor(config: OverseerrConfig) {
    this.api = new OverseerrApi(config);
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
      movies: results.results.filter((r): r is MovieResult => r.mediaType === 'movie'),
      tvShows: results.results.filter((r): r is TvResult => r.mediaType === 'tv')
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
    const request = await this.api.createRequest({
      mediaType: params.mediaType,
      mediaId: media.id,
      seasons: params.seasons
    });

    // Auto-approve if requested
    if (params.autoApprove) {
      await this.api.updateRequest(request.id, 'approved');
      return this.api.getRequest(request.id);
    }

    return request;
  }

  // Enhanced Request Management
  async getPendingRequests(options: {
    take?: number;
    skip?: number;
    sort?: 'added' | 'modified';
  } = {}): Promise<MediaRequest[]> {
    const response = await this.api.getRequests({
      ...options,
      filter: 'pending'
    });
    return response.results;
  }

  async getRequestsByStatus(status: 'pending' | 'approved' | 'declined' | 'available', options: {
    take?: number;
    skip?: number;
    sort?: 'added' | 'modified';
  } = {}): Promise<MediaRequest[]> {
    const response = await this.api.getRequests({
      ...options,
      filter: status
    });
    return response.results;
  }

  async batchUpdateRequests(requestIds: number[], status: 'approved' | 'declined'): Promise<MediaRequest[]> {
    return Promise.all(
      requestIds.map(id => this.api.updateRequest(id, status))
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
      popular.results.map(result => 
        this.isMediaAvailable(mediaType, result.id)
      )
    );

    return {
      ...popular,
      results: popular.results.filter((_, index) => availabilityChecks[index])
    };
  }

  async getTrendingWithRecommendations(mediaType: 'movie' | 'tv', page: number = 1): Promise<{
    trending: SearchResult;
    recommendations: SearchResult[];
  }> {
    const trending = await this.api.getTrending(mediaType, page);
    
    // Get recommendations for each trending item
    const recommendations = await Promise.all(
      trending.results.slice(0, 3).map(result =>
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
    const [status, stats] = await Promise.all([
      this.api.getStatus(),
      this.api.getStats()
    ]);

    return {
      version: status.version,
      healthy: !status.updateAvailable || status.commitsBehind === 0,
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