import { z } from 'zod';

/**
 * Configuration interface for Radarr
 */
export interface ServiceConfig {
  url: string;
  apiKey: string;
  rateLimitPerSecond?: number;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Common response fields
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
 * Movie response interface
 */
export interface MovieResponse {
  id: number;
  title: string;
  originalTitle: string;
  sortTitle: string;
  sizeOnDisk: number;
  status: string;
  overview: string;
  inCinemas: string;
  physicalRelease: string;
  digitalRelease: string;
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl: string;
  }>;
  website: string;
  year: number;
  hasFile: boolean;
  youTubeTrailerId: string;
  studio: string;
  path: string;
  qualityProfileId: number;
  monitored: boolean;
  minimumAvailability: string;
  isAvailable: boolean;
  folderName: string;
  runtime: number;
  cleanTitle: string;
  imdbId: string;
  tmdbId: number;
  titleSlug: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  movieFile?: MovieFileResponse;
  collection?: {
    name: string;
    tmdbId: number;
    images: Array<{
      coverType: string;
      url: string;
    }>;
  };
}

/**
 * Movie file response interface
 */
export interface MovieFileResponse {
  movieId: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  sceneName: string;
  indexerFlags: number;
  quality: QualityResponse;
  mediaInfo: MediaInfoResponse;
  originalFilePath: string;
  qualityCutoffNotMet: boolean;
  languages: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * Quality response interface
 */
export interface QualityResponse {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: number;
  };
  revision: {
    version: number;
    real: number;
  };
}

/**
 * Media info response interface
 */
export interface MediaInfoResponse {
  audioChannels: number;
  audioCodec: string;
  audioLanguages: string;
  height: number;
  width: number;
  subtitles: string;
  scanType: string;
  videoCodec: string;
  videoDynamicRange: string;
  videoDynamicRangeType: string;
}

/**
 * Quality profile response interface
 */
export interface QualityProfileResponse {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    id: number;
    name: string;
    quality?: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    items?: Array<{
      id: number;
      name: string;
      quality: {
        id: number;
        name: string;
        source: string;
        resolution: number;
      };
      allowed: boolean;
    }>;
    allowed: boolean;
  }>;
}

/**
 * Command response interface
 */
export interface CommandResponse {
  id: number;
  name: string;
  commandName: string;
  message: string;
  priority: 'normal' | 'high' | 'low';
  status: 'queued' | 'started' | 'completed' | 'failed' | 'aborted';
  queued: string;
  started: string;
  ended: string;
  duration: string;
  trigger: string;
  stateChangeTime: string;
  sendUpdatesToClient: boolean;
  updateScheduledTask: boolean;
  lastExecutionTime: string;
}

/**
 * Statistics response interface
 */
export interface StatsResponse {
  movieCount: number;
  movieFileCount: number;
  availableMovieCount: number;
  monitoredMovieCount: number;
  unmonitoredMovieCount: number;
  movieFileUnmonitoredCount: number;
  movieFileTrashCount: number;
  movieFileBrokenCount: number;
  movieFileMissingCount: number;
  movieFileUpgradeCount: number;
  sizeOnDisk: number;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  urlBase: string;
  runtimeVersion: string;
  runtimeName: string;
}

/**
 * Common query parameters
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortKey?: string;
  sortDirection?: 'ascending' | 'descending';
  filter?: string;
}

/**
 * Movie lookup parameters
 */
export interface MovieLookupParams {
  term?: string;
  tmdbId?: number;
  imdbId?: string;
}

/**
 * Error codes
 */
export type ErrorCode = 
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export const movieSchema = z.object({
  title: z.string(),
  qualityProfileId: z.number(),
  tmdbId: z.number(),
  year: z.number(),
  monitored: z.boolean().optional(),
  minimumAvailability: z.enum(['announced', 'inCinemas', 'released', 'preDB']).optional(),
  rootFolderPath: z.string().optional(),
  tags: z.array(z.number()).optional(),
  addOptions: z.object({
    searchForMovie: z.boolean(),
    monitor: z.enum(['movieOnly', 'movieAndCollection', 'none']),
  }).optional(),
});

export type MovieCreateParams = z.infer<typeof movieSchema>; 