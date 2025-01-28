export interface ServiceConfig {
  url: string;
  apiKey: string;
}

export interface DownloadClientConfig extends ServiceConfig {
  username?: string;
  password?: string;
}

export interface NotificationConfig extends ServiceConfig {
  priority?: number;
  tags?: string[];
}

export interface MediaServerConfig extends ServiceConfig {
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TMDBConfig {
  apiKey: string;
  language?: string;
  region?: string;
} 