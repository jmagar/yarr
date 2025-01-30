import { ServiceConfig, ErrorCode } from '@media-mcp/shared';

/**
 * Configuration interface for the service
 */
export interface TautulliConfig extends ServiceConfig {
  apiKey: string;
  url: string;
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

// Activity/Session types
export interface Session {
  session_id: string;
  media_type: 'movie' | 'episode' | 'track' | 'photo';
  title: string;
  user: string;
  player: string;
  state: 'playing' | 'paused' | 'buffering' | 'stopped';
  progress: number;
  duration: number;
  quality_profile: string;
  bandwidth: number;
  stream_container: string;
  stream_video_codec: string;
  stream_audio_codec: string;
  stream_resolution: string;
  started: number;
  paused_counter: number;
  buffer_count: number;
  transcode_decision: 'direct play' | 'copy' | 'transcode';
}

// History types
export interface HistoryEntry {
  id: number;
  media_type: 'movie' | 'episode' | 'track' | 'photo';
  title: string;
  grandparent_title?: string; // TV Show title for episodes
  parent_title?: string; // Season title for episodes
  user: string;
  player: string;
  started: number;
  stopped: number;
  duration: number;
  percent_complete: number;
  watched_status: number;
  group_count: number;
  group_ids: string;
  reference_id: number;
}

// Library types
export interface Library {
  section_id: number;
  section_name: string;
  section_type: 'movie' | 'show' | 'artist' | 'photo';
  count: number;
  parent_count?: number; // For TV shows (series count)
  child_count?: number; // For TV shows (episode count)
  content_rating_breakdown: Record<string, number>;
  last_accessed: number;
  last_played: string;
  total_plays: number;
  total_duration: number;
}

// User statistics types
export interface UserStats {
  user_id: number;
  username: string;
  total_plays: number;
  total_duration: number;
  last_played: string;
  last_seen: number;
  player_stats: {
    platform_type: string;
    player_name: string;
    total_plays: number;
  }[];
  media_stats: {
    media_type: string;
    total_plays: number;
    total_duration: number;
  }[];
}

// Recently added types
export interface RecentlyAdded {
  id: number;
  title: string;
  media_type: 'movie' | 'episode' | 'track' | 'photo';
  rating_key: string;
  grandparent_title?: string;
  parent_title?: string;
  thumb: string;
  added_at: number;
  library_name: string;
}

// Server info types
export interface ServerInfo {
  version: string;
  platform: string;
  platform_version: string;
  platform_linux_distro: string;
  os: string;
  cpu_name: string;
  cpu_cores: number;
  total_ram: number;
  plex_version: string;
}

// Error types
export type TautulliErrorCode = 
  | 'AUTHENTICATION_ERROR'
  | 'INVALID_REQUEST'
  | 'RESOURCE_NOT_FOUND'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'SERVICE_OFFLINE';

export interface TautulliError {
  code: TautulliErrorCode;
  message: string;
  response?: unknown;
}

export interface EnrichedSession extends Session {
  progress_percent: number;
  quality_rating: number;
  stream_efficiency: number;
}

export interface EnrichedHistoryEntry extends HistoryEntry {
  duration_formatted: string;
  completion_rate: number;
}

export interface EnrichedLibrary extends Library {
  items_per_type: Record<string, number>;
  usage_frequency: 'high' | 'medium' | 'low';
}

export interface EnrichedRecentlyAdded extends RecentlyAdded {
  added_date: string;
  age_days: number;
} 