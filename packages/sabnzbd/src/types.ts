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