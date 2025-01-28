import { SonarrApi } from './api.js';
import { SonarrConfig, Series, Episode, Season, QualityProfile, LanguageProfile, CalendarEvent, QueueItem } from './types.js';
import { MediaResult } from '@media-mcp/shared';

export class SonarrService {
  private api: SonarrApi;

  constructor(config: SonarrConfig) {
    this.api = new SonarrApi(config);
  }

  async search(query: string): Promise<Series[]> {
    return this.api.searchSeries(query);
  }

  async getAllSeries(): Promise<Series[]> {
    return this.api.getSeries();
  }

  async getEpisodes(seriesId: number): Promise<Episode[]> {
    return this.api.getEpisodes(seriesId);
  }

  async getEpisode(episodeId: number): Promise<Episode> {
    return this.api.getEpisode(episodeId);
  }

  async monitorEpisode(episodeId: number, monitored: boolean): Promise<void> {
    await this.api.monitorEpisode(episodeId, monitored);
  }

  async searchEpisode(episodeId: number): Promise<void> {
    await this.api.searchEpisode(episodeId);
  }

  async getSeriesDetails(id: number): Promise<{
    series: Series;
    episodes: Episode[];
  }> {
    const [series, episodes] = await Promise.all([
      this.api.getSeriesById(id),
      this.api.getEpisodes(id)
    ]);

    return { series, episodes };
  }

  async addSeries(
    id: number,
    options: {
      path: string;
      qualityProfileId: number;
      languageProfileId: number;
      seasonFolder?: boolean;
      monitored?: boolean;
      searchForMissingEpisodes?: boolean;
    }
  ): Promise<Series> {
    const results = await this.api.searchSeries(id.toString());
    const seriesInfo = results.find((s: Series) => s.tvdbId === id);
    
    if (!seriesInfo) {
      throw new Error(`Series with ID ${id} not found`);
    }

    const series = await this.api.addSeries({
      ...seriesInfo,
      path: options.path,
      qualityProfileId: options.qualityProfileId,
      languageProfileId: options.languageProfileId,
      seasonFolder: options.seasonFolder ?? true,
      monitored: options.monitored ?? true
    });

    if (options.searchForMissingEpisodes) {
      await this.api.searchEpisodes(series.id);
    }

    return series;
  }

  async updateSeriesMonitored(id: number, monitored: boolean): Promise<Series> {
    const series = await this.api.getSeriesById(id);
    return this.api.updateSeries({
      ...series,
      monitored
    });
  }

  async deleteSeries(id: number, deleteFiles: boolean): Promise<void> {
    return this.api.deleteSeries(id, deleteFiles);
  }

  async getSeasons(seriesId: number): Promise<Season[]> {
    return this.api.getSeasons(seriesId);
  }

  async monitorSeason(seriesId: number, seasonNumber: number, monitored: boolean): Promise<void> {
    await this.api.monitorSeason(seriesId, seasonNumber, monitored);
  }

  async getQualityProfiles(): Promise<QualityProfile[]> {
    return this.api.getQualityProfiles();
  }

  async getLanguageProfiles(): Promise<LanguageProfile[]> {
    return this.api.getLanguageProfiles();
  }

  async getUpcomingEpisodes(days: number = 7): Promise<CalendarEvent[]> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);
    return this.api.getCalendar(start, end);
  }

  async getCalendar(start?: Date, end?: Date): Promise<CalendarEvent[]> {
    return this.api.getCalendar(start, end);
  }

  async getQueue(): Promise<QueueItem[]> {
    return this.api.getQueue();
  }

  async removeFromQueue(id: number, blacklist: boolean = false): Promise<void> {
    await this.api.removeFromQueue(id, blacklist);
  }
} 