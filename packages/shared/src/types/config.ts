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
 * Download client configuration
 */
export interface DownloadClientConfig extends ServiceConfig {
  category?: string;
  directory?: string;
}

/**
 * Notification service configuration
 */
export interface NotificationConfig extends ServiceConfig {
  priority?: number;
  tags?: string[];
}

/**
 * Media server configuration
 */
export interface MediaServerConfig extends ServiceConfig {
  libraries?: string[];
  transcodeDirectory?: string;
}

/**
 * TMDB configuration
 */
export interface TMDBConfig extends ServiceConfig {
  language?: string;
  region?: string;
  includeAdult?: boolean;
} 