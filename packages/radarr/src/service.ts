import { ServiceError } from '@media-mcp/shared';
import { ServiceApi } from './api.js';
import { 
  ServiceConfig, 
  ResourceResponse, 
  CommandResponse, 
  StatsResponse, 
  HealthCheckResponse,
  QueryParams,
  ErrorCode,
  MovieResponse,
  MovieCreateParams,
  QualityProfileResponse,
  movieSchema
} from './types.js';

export class Service {
  private api: ServiceApi;

  constructor(config: ServiceConfig) {
    this.api = new ServiceApi(config);
  }

  /**
   * Movie Management
   */

  async getMovies(options: { 
    includeUnmonitored?: boolean;
    sortBy?: string;
    sortOrder?: 'ascending' | 'descending';
  } = {}): Promise<MovieResponse[]> {
    const query = {
      sortKey: options.sortBy,
      sortDirection: options.sortOrder,
      filter: options.includeUnmonitored ? undefined : 'monitored=true'
    };
    return this.api.getMovies(query);
  }

  async getMovie(id: number): Promise<MovieResponse> {
    return this.api.getMovie(id);
  }

  async addMovie(params: MovieCreateParams): Promise<MovieResponse> {
    try {
      // Validate parameters
      movieSchema.parse(params);

      // Search for movie to get full details
      const [movieDetails] = await this.api.lookupMovie({ tmdbId: params.tmdbId });
      if (!movieDetails) {
        throw new ServiceError('NOT_FOUND', `Movie with TMDB ID ${params.tmdbId} not found`);
      }

      // Merge provided params with movie details
      const movieData = {
        ...movieDetails,
        ...params,
        addOptions: {
          searchForMovie: true,
          monitor: 'movieOnly',
          ...params.addOptions
        }
      };

      return this.api.addMovie(movieData);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError('VALIDATION_ERROR', 'Invalid movie parameters');
    }
  }

  async updateMovie(id: number, params: Partial<MovieCreateParams>): Promise<MovieResponse> {
    try {
      // Get existing movie
      const existingMovie = await this.api.getMovie(id);
      if (!existingMovie) {
        throw new ServiceError('NOT_FOUND', `Movie with ID ${id} not found`);
      }

      // Merge existing data with updates
      const updatedData = {
        ...existingMovie,
        ...params
      };

      // Validate the merged data
      movieSchema.partial().parse(params);

      return this.api.updateMovie(id, updatedData);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError('VALIDATION_ERROR', 'Invalid movie parameters');
    }
  }

  async deleteMovie(id: number, deleteFiles = false): Promise<void> {
    return this.api.deleteMovie(id, deleteFiles);
  }

  /**
   * Movie Search & Discovery
   */

  async searchMovieByTitle(title: string): Promise<MovieResponse[]> {
    return this.api.lookupMovie({ term: title });
  }

  async searchMovieByTmdbId(tmdbId: number): Promise<MovieResponse[]> {
    return this.api.lookupMovie({ tmdbId });
  }

  async searchMovieByImdbId(imdbId: string): Promise<MovieResponse[]> {
    return this.api.lookupMovie({ imdbId });
  }

  async triggerMovieSearch(id: number): Promise<CommandResponse> {
    return this.api.searchMovie(id);
  }

  /**
   * Quality Profiles
   */

  async getQualityProfiles(): Promise<QualityProfileResponse[]> {
    return this.api.getQualityProfiles();
  }

  async getQualityProfile(id: number): Promise<QualityProfileResponse> {
    return this.api.getQualityProfile(id);
  }

  /**
   * Queue Management
   */

  async getQueue(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ascending' | 'descending';
  } = {}): Promise<{
    items: Array<{
      movieId: number;
      title: string;
      status: string;
      quality: {
        quality: {
          name: string;
          resolution: number;
        };
      };
    }>;
    totalRecords: number;
    page: number;
    pageSize: number;
  }> {
    const response = await this.api.getQueue({
      page: options.page,
      pageSize: options.pageSize,
      sortKey: options.sortBy,
      sortDirection: options.sortOrder
    });

    return {
      items: response.records,
      totalRecords: response.totalRecords,
      page: response.page,
      pageSize: response.pageSize
    };
  }

  async removeFromQueue(id: number, blacklist = false): Promise<void> {
    return this.api.removeFromQueue(id, blacklist);
  }

  /**
   * System Information
   */

  async getStats(): Promise<StatsResponse> {
    return this.api.getStats();
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.api.getSystemHealth();
  }

  async getSystemStatus(): Promise<HealthCheckResponse> {
    return this.api.getSystemStatus();
  }

  /**
   * Utility Methods
   */

  async validateConnection(): Promise<boolean> {
    return this.api.testConnection();
  }

  async validateApiKey(): Promise<boolean> {
    return this.api.validateApiKey();
  }

  async executeCommand(name: string, params?: Record<string, unknown>): Promise<CommandResponse> {
    return this.api.executeCommand(name, params);
  }

  async getCommandStatus(id: number): Promise<CommandResponse> {
    return this.api.getCommand(id);
  }

  /**
   * Resource Management
   */
  async getResourcesWithMetadata(options: {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: string;
    status?: string[];
    type?: string[];
    tags?: string[];
  } = {}): Promise<ResourceResponse[]> {
    const movies = await this.api.getMovies({
      page: options.page,
      pageSize: options.pageSize,
      sortKey: options.sort,
      sortDirection: options.order as 'ascending' | 'descending'
    });

    return movies.map(movie => ({
      id: movie.id,
      name: movie.title,
      type: 'movie',
      status: movie.status,
      enabled: movie.monitored,
      createdAt: movie.added,
      updatedAt: movie.added,
      settings: {
        qualityProfileId: movie.qualityProfileId,
        minimumAvailability: movie.minimumAvailability,
        path: movie.path
      },
      tags: movie.tags.map(String),
      metadata: {
        tmdbId: movie.tmdbId,
        imdbId: movie.imdbId,
        year: movie.year,
        runtime: movie.runtime,
        genres: movie.genres
      }
    }));
  }

  async getResourceDetails(id: number): Promise<ResourceResponse> {
    const movie = await this.api.getMovie(id);
    return {
      id: movie.id,
      name: movie.title,
      type: 'movie',
      status: movie.status,
      enabled: movie.monitored,
      createdAt: movie.added,
      updatedAt: movie.added,
      settings: {
        qualityProfileId: movie.qualityProfileId,
        minimumAvailability: movie.minimumAvailability,
        path: movie.path
      },
      tags: movie.tags.map(String),
      metadata: {
        tmdbId: movie.tmdbId,
        imdbId: movie.imdbId,
        year: movie.year,
        runtime: movie.runtime,
        genres: movie.genres,
        images: movie.images,
        ratings: movie.ratings
      }
    };
  }

  async createResourceWithValidation(data: {
    name: string;
    type: string;
    status?: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    tags?: string[];
  }): Promise<ResourceResponse> {
    if (data.type !== 'movie') {
      throw new ServiceError('VALIDATION_ERROR', 'Only movie resources are supported');
    }

    const movieData = {
      title: data.name,
      monitored: data.enabled ?? true,
      qualityProfileId: (data.settings?.qualityProfileId as number) ?? 1,
      minimumAvailability: (data.settings?.minimumAvailability as string) ?? 'released',
      path: (data.settings?.path as string) ?? '',
      tags: data.tags?.map(Number) ?? []
    };

    const movie = await this.api.addMovie(movieData);
    return this.getResourceDetails(movie.id);
  }

  async updateResourceWithValidation(id: number, data: {
    name?: string;
    status?: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    tags?: string[];
  }): Promise<ResourceResponse> {
    const movie = await this.api.getMovie(id);
    const updatedData = {
      ...movie,
      title: data.name ?? movie.title,
      monitored: data.enabled ?? movie.monitored,
      qualityProfileId: (data.settings?.qualityProfileId as number) ?? movie.qualityProfileId,
      minimumAvailability: (data.settings?.minimumAvailability as string) ?? movie.minimumAvailability,
      path: (data.settings?.path as string) ?? movie.path,
      tags: data.tags?.map(Number) ?? movie.tags
    };

    await this.api.updateMovie(id, updatedData);
    return this.getResourceDetails(id);
  }

  async deleteResourceWithValidation(id: number): Promise<void> {
    await this.api.deleteMovie(id);
  }

  async executeCommandWithValidation(name: string, params?: Record<string, unknown>): Promise<CommandResponse> {
    return this.api.executeCommand(name, params);
  }

  async monitorCommandProgress(id: number): Promise<CommandResponse> {
    return this.api.getCommand(id);
  }

  async getEnhancedStats(options: {
    from?: string;
    sort?: string;
    order?: string;
  } = {}): Promise<StatsResponse & { computed: Record<string, unknown> }> {
    const stats = await this.api.getStats();
    return {
      ...stats,
      computed: {
        totalSize: stats.sizeOnDisk,
        availabilityRatio: stats.availableMovieCount / stats.movieCount,
        healthScore: (stats.movieFileCount - stats.movieFileBrokenCount - stats.movieFileMissingCount) / stats.movieFileCount
      }
    };
  }

  async getFullHealthCheck(): Promise<HealthCheckResponse> {
    return this.api.getSystemHealth();
  }
} 