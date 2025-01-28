import { ServiceConfig } from '@media-mcp/shared';

export interface SonarrConfig {
  url: string;
  apiKey: string;
}

export interface Series {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  overview: string;
  network: string;
  airTime: string;
  seasons: Season[];
  year: number;
  path: string;
  profileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId: number;
  tvMazeId: number;
  firstAired: string;
  seriesType: string;
  cleanTitle: string;
  imdbId: string;
  titleSlug: string;
  certification: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  qualityProfileId: number;
  languageProfileId: number;
}

export interface Season {
  seasonNumber: number;
  monitored: boolean;
  statistics: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}

export interface Episode {
  id: number;
  seriesId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber: number;
  unverifiedSceneNumbering: boolean;
  ratings: {
    votes: number;
    value: number;
  };
}

export interface QualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: QualityProfileItem[];
}

export interface QualityProfileItem {
  id: number;
  name: string;
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: number;
  };
  allowed: boolean;
}

export interface LanguageProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  languages: LanguageProfileItem[];
}

export interface LanguageProfileItem {
  language: {
    id: number;
    name: string;
  };
  allowed: boolean;
}

export interface CalendarEvent {
  seriesId: number;
  episodeFileId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  hasFile: boolean;
  monitored: boolean;
  series: {
    id: number;
    title: string;
    path: string;
  };
}

export interface QueueItem {
  id: number;
  downloadId: string;
  title: string;
  size: number;
  sizeleft: number;
  status: string;
  trackedDownloadStatus: string;
  statusMessages: string[];
  downloadClient: string;
  protocol: string;
  downloadForced: boolean;
  estimatedCompletionTime: string;
  episode: {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
  };
  series: {
    id: number;
    title: string;
  };
} 