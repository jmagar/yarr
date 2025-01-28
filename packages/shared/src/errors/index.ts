export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ConfigurationError extends Error {
  constructor(service: string, message: string) {
    super(`${service} configuration error: ${message}`);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends Error {
  constructor(service: string, message: string) {
    super(`${service} authentication error: ${message}`);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    service: string,
    public retryAfter?: number
  ) {
    super(`${service} rate limit exceeded${retryAfter ? `. Retry after ${retryAfter} seconds` : ''}`);
    this.name = 'RateLimitError';
  }
} 