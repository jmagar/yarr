/**
 * Configuration interface for the service
 */
export interface ServiceConfig {
  url: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitPerSecond?: number;
}

/**
 * Common response fields shared across all responses
 */
export interface BaseResponse {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base response interface for resources
 */
export interface ResourceResponse extends BaseResponse {
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Base response interface for commands/operations
 */
export interface CommandResponse extends BaseResponse {
  command: string;
  parameters: Record<string, unknown>;
  progress: number;
  message: string;
  startTime: string;
  endTime?: string;
  error?: string;
}

/**
 * Base response interface for statistics/metrics
 */
export interface StatsResponse {
  totalResources: number;
  activeResources: number;
  lastUpdate: string;
  metrics: {
    requestCount: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resourceStats: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    timestamp: string;
    duration: number;
    metadata?: Record<string, unknown>;
  }>;
  resources: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

/**
 * Common error codes
 */
export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  status?: string[];
  type?: string[];
  tags?: string[];
  search?: string;
  from?: string;
  to?: string;
}

/**
 * Common query parameters
 */
export interface QueryParams extends PaginationParams, FilterParams {
  includeDisabled?: boolean;
  fields?: string[];
}

import { ServiceConfig as TMDBConfig } from '@media-mcp/shared';

export { TMDBConfig };

export interface MovieResponse {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
}

export interface TVShowResponse {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: Array<{
    id: number;
    name: string;
  }>;
}

export interface SearchResponse {
  page: number;
  total_results: number;
  total_pages: number;
  results: Array<MovieResponse | TVShowResponse>;
}

// Movie types
export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date: string;
  status: string;
  vote_average: number;
  vote_count: number;
  runtime?: number;
  budget: number;
  revenue: number;
  genres: Genre[];
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  spoken_languages: SpokenLanguage[];
  imdb_id?: string;
  adult: boolean;
  video: boolean;
  popularity: number;
}

export interface MovieSearchResult {
  page: number;
  results: Movie[];
  total_results: number;
  total_pages: number;
}

// TV Show types
export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date: string;
  last_air_date: string;
  status: string;
  vote_average: number;
  vote_count: number;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  genres: Genre[];
  networks: Network[];
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  spoken_languages: SpokenLanguage[];
  popularity: number;
  type: string;
  in_production: boolean;
}

export interface TVShowSearchResult {
  page: number;
  results: TVShow[];
  total_results: number;
  total_pages: number;
}

// Season types
export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path?: string;
  air_date: string;
  season_number: number;
  episode_count: number;
}

// Episode types
export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path?: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  vote_average: number;
  vote_count: number;
  runtime?: number;
  crew: CrewMember[];
  guest_stars: CastMember[];
}

// Common types
export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path?: string;
  origin_country: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  department: string;
  job: string;
  profile_path?: string;
}

// Configuration types
export interface TMDBConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}

// Error types
export type TMDBErrorCode = 
  | 'AUTHENTICATION_ERROR'
  | 'INVALID_REQUEST'
  | 'RESOURCE_NOT_FOUND'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'SERVICE_OFFLINE';

export interface TMDBError {
  status_message: string;
  status_code: number;
} 