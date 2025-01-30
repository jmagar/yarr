/**
 * Media types
 */
export type MediaType = 'movie' | 'tv' | 'person';

/**
 * Quality profiles
 */
export type Quality = 
  | 'SD'
  | 'HD-720p'
  | 'HD-1080p'
  | '4K'
  | 'ANY';

/**
 * Language codes
 */
export type Language = string;

/**
 * Media result interface
 */
export interface MediaResult {
  id: number;
  title: string;
  type: MediaType;
  year?: number;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  popularity?: number;
  voteAverage?: number;
  voteCount?: number;
}

/**
 * Search result interface
 */
export interface SearchResult<T = MediaResult> {
  results: T[];
  page: number;
  totalPages: number;
  totalResults: number;
} 