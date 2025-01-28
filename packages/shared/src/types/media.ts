import { z } from 'zod';

export const MediaType = z.enum(['movie', 'tv', 'music', 'book']);
export type MediaType = z.infer<typeof MediaType>;

export const Quality = z.enum(['2160p', '1080p', '720p', 'SD', 'unknown']);
export type Quality = z.infer<typeof Quality>;

export const Language = z.enum(['eng', 'fre', 'multi', 'unknown']);
export type Language = z.infer<typeof Language>;

export interface MediaResult {
  id: number;
  title: string;
  year?: number;
  type: MediaType;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
}

export interface SearchResult {
  title: string;
  size: number;
  seeders?: number;
  leechers?: number;
  quality: Quality;
  language: Language;
  downloadUrl: string;
  magnetUrl?: string;
  indexer: string;
  publishDate: string;
} 