/**
 * Base configuration interface for all services
 */
export interface ServiceConfig {
  url: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitPerSecond?: number;
}

/**
 * Common error codes across services
 */
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Service error class
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Common query parameters
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  filter?: Record<string, unknown>;
  includeDisabled?: boolean;
  fields?: string[];
  from?: string;
  to?: string;
} 