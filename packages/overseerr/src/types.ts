// Configuration
export interface OverseerrConfig {
  url: string;
  apiKey: string;
}

// Error Types
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTH_ERROR = 'AUTH_ERROR'
}

// Media Types
export interface MediaRequest {
  id: number;
  status: RequestStatus;
  media: Media;
  requestedBy: User;
  modifiedBy?: User;
  createdAt: string;
  updatedAt: string;
  type: 'movie' | 'tv';
}

export type RequestStatus = 
  | 'pending'
  | 'approved'
  | 'declined'
  | 'available';

export interface Media {
  id: number;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  tvdbId?: number;
  status?: number;
  status4k?: number;
  createdAt: string;
  updatedAt: string;
  lastSeasonChange?: string;
  mediaAddedAt?: string;
  serviceId?: number;
  serviceId4k?: number;
  externalServiceId?: number;
  externalServiceId4k?: number;
  externalServiceSlug?: string;
  externalServiceSlug4k?: string;
  ratingKey?: string;
  ratingKey4k?: string;
}

export interface User {
  id: number;
  email: string;
  username?: string;
  plexUsername?: string;
  userType: number;
  permissions: number;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  requestCount: number;
  settings?: UserSettings;
}

export interface UserSettings {
  notificationTypes?: {
    discord?: boolean;
    email?: boolean;
    pushbullet?: boolean;
    pushover?: boolean;
    telegram?: boolean;
    webpush?: boolean;
  };
  discordId?: string;
  telegramChatId?: string;
  locale?: string;
  region?: string;
  originalLanguage?: string;
  pushbulletAccessToken?: string;
  pushoverApplicationToken?: string;
  pushoverUserKey?: string;
  telegramSendSilently?: boolean;
}

// Search Types
export interface SearchResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: (MovieResult | TvResult)[];
}

export interface MovieResult {
  id: number;
  mediaType: 'movie';
  title: string;
  originalTitle: string;
  releaseDate: string;
  originalLanguage: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  mediaInfo?: Media;
}

export interface TvResult {
  id: number;
  mediaType: 'tv';
  name: string;
  originalName: string;
  firstAirDate: string;
  originalLanguage: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  mediaInfo?: Media;
}

// Stats Types
export interface Stats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  declinedRequests: number;
  availableRequests: number;
  processingRequests: number;
  totalMediaItems: number;
  totalMovies: number;
  totalSeries: number;
  totalSeasons: number;
  totalEpisodes: number;
  recentlyAdded: Media[];
} 