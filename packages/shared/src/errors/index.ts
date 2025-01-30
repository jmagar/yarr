/**
 * Common error codes across services
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
 * Base service error
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
 * Configuration error
 */
export class ConfigurationError extends ServiceError {
  constructor(message: string, context?: unknown) {
    super('VALIDATION_ERROR', message, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ServiceError {
  constructor(message: string, context?: unknown) {
    super('AUTHENTICATION_ERROR', message, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ServiceError {
  constructor(message: string, context?: unknown) {
    super('RATE_LIMIT', message, context);
    this.name = 'RateLimitError';
  }
} 