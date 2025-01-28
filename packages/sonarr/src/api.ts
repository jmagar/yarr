import { ServiceError } from '@media-mcp/shared';
import { SonarrConfig, Series, Episode, Season, QualityProfile, LanguageProfile, CalendarEvent, QueueItem } from './types.js';

export class SonarrApi {
  constructor(private config: SonarrConfig) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.config.url}/api/v3${endpoint}`, {
        ...options,
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new ServiceError(
          'API_ERROR',
          `Sonarr API error: ${response.statusText}`,
          { status: response.status }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      throw new ServiceError(
        'NETWORK_ERROR',
        'Failed to connect to Sonarr',
        { error }
      );
    }
  }

  // Series management
  async getSeries(): Promise<Series[]> {
    return this.request<Series[]>('/series');
  }

  async getSeriesById(id: number): Promise<Series> {
    return this.request<Series>(`/series/${id}`);
  }

  async searchSeries(term: string): Promise<Series[]> {
    return this.request<Series[]>(`/series/lookup?term=${encodeURIComponent(term)}`);
  }

  async addSeries(series: Partial<Series>): Promise<Series> {
    return this.request<Series>('/series', {
      method: 'POST',
      body: JSON.stringify(series)
    });
  }

  async updateSeries(series: Partial<Series>): Promise<Series> {
    return this.request<Series>(`/series/${series.id}`, {
      method: 'PUT',
      body: JSON.stringify(series)
    });
  }

  async deleteSeries(id: number, deleteFiles: boolean): Promise<void> {
    await this.request(`/series/${id}?deleteFiles=${deleteFiles}`, {
      method: 'DELETE'
    });
  }

  // Episode management
  async getEpisodes(seriesId: number): Promise<Episode[]> {
    return this.request<Episode[]>(`/episode?seriesId=${seriesId}`);
  }

  async getEpisode(episodeId: number): Promise<Episode> {
    return this.request<Episode>(`/episode/${episodeId}`);
  }

  async monitorEpisode(episodeId: number, monitored: boolean): Promise<void> {
    await this.request(`/episode/${episodeId}`, {
      method: 'PUT',
      body: JSON.stringify({ monitored })
    });
  }

  async searchEpisode(episodeId: number): Promise<void> {
    await this.request(`/command`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'EpisodeSearch',
        episodeIds: [episodeId]
      })
    });
  }

  async searchEpisodes(seriesId: number): Promise<void> {
    await this.request(`/command`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'SeriesSearch',
        seriesId
      })
    });
  }

  // Season management
  async getSeasons(seriesId: number): Promise<Season[]> {
    const series = await this.getSeriesById(seriesId);
    return series.seasons;
  }

  async monitorSeason(seriesId: number, seasonNumber: number, monitored: boolean): Promise<void> {
    const series = await this.getSeriesById(seriesId);
    const seasonIndex = series.seasons.findIndex(s => s.seasonNumber === seasonNumber);
    if (seasonIndex === -1) {
      throw new Error(`Season ${seasonNumber} not found for series ${seriesId}`);
    }

    series.seasons[seasonIndex].monitored = monitored;
    await this.updateSeries(series);
  }

  // Profile management
  async getQualityProfiles(): Promise<QualityProfile[]> {
    return this.request<QualityProfile[]>('/qualityprofile');
  }

  async getLanguageProfiles(): Promise<LanguageProfile[]> {
    return this.request<LanguageProfile[]>('/languageprofile');
  }

  // Calendar
  async getCalendar(start?: Date, end?: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toISOString());
    if (end) params.append('end', end.toISOString());

    return this.request<CalendarEvent[]>(`/calendar?${params.toString()}`);
  }

  // Queue management
  async getQueue(): Promise<QueueItem[]> {
    return this.request<QueueItem[]>('/queue');
  }

  async removeFromQueue(id: number, blacklist: boolean = false): Promise<void> {
    await this.request(`/queue/${id}?blacklist=${blacklist}`, {
      method: 'DELETE'
    });
  }
} 