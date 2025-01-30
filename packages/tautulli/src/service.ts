import { ServiceError } from '@media-mcp/shared';
import { TautulliApi } from './api.js';
import {
  TautulliConfig,
  Session,
  HistoryEntry,
  Library,
  UserStats,
  RecentlyAdded,
  ServerInfo,
  QueryParams,
  EnrichedSession,
  EnrichedHistoryEntry,
  EnrichedLibrary,
  EnrichedRecentlyAdded
} from './types.js';

export class TautulliService {
  private readonly api: TautulliApi;

  constructor(config: TautulliConfig) {
    this.api = new TautulliApi(config);
  }

  /**
   * Activity Methods with Enhanced Functionality
   */
  async getCurrentActivity(): Promise<Session[]> {
    const sessions = await this.api.getCurrentActivity();
    return sessions.map(session => this.enrichSessionData(session));
  }

  async getActiveStreams(): Promise<Session[]> {
    const sessions = await this.getCurrentActivity();
    return sessions.filter(session => session.state !== 'stopped');
  }

  async getTranscodingSessions(): Promise<Session[]> {
    const sessions = await this.getCurrentActivity();
    return sessions.filter(session => session.transcode_decision === 'transcode');
  }

  async terminateSession(sessionId: string, reason?: string): Promise<void> {
    if (!sessionId) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        'Session ID is required',
        { sessionId }
      );
    }
    await this.api.terminateSession(sessionId);
  }

  /**
   * History Methods with Enhanced Functionality
   */
  async getHistory(params: QueryParams = {}): Promise<{
    entries: HistoryEntry[];
    stats: {
      totalDuration: number;
      averagePlaytime: number;
      mostWatchedMedia: string;
      uniqueUsers: number;
    };
  }> {
    const entries = await this.api.getHistory(params);
    
    const stats = {
      totalDuration: entries.reduce((sum, entry) => sum + entry.duration, 0),
      averagePlaytime: entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length,
      mostWatchedMedia: this.findMostFrequent(entries.map(e => e.title)),
      uniqueUsers: new Set(entries.map(e => e.user)).size
    };

    return {
      entries: entries.map(entry => this.enrichHistoryEntry(entry)),
      stats
    };
  }

  async getUserHistory(userId: number, params: QueryParams = {}): Promise<{
    entries: HistoryEntry[];
    userStats: {
      totalWatchTime: number;
      averageSessionLength: number;
      favoriteMedia: string;
      mostUsedPlayer: string;
    };
  }> {
    const entries = await this.api.getHistoryByUser(userId, params);
    
    const userStats = {
      totalWatchTime: entries.reduce((sum, entry) => sum + entry.duration, 0),
      averageSessionLength: entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length,
      favoriteMedia: this.findMostFrequent(entries.map(e => e.title)),
      mostUsedPlayer: this.findMostFrequent(entries.map(e => e.player))
    };

    return {
      entries: entries.map(entry => this.enrichHistoryEntry(entry)),
      userStats
    };
  }

  /**
   * Library Methods with Enhanced Functionality
   */
  async getLibraryStats(): Promise<{
    libraries: Library[];
    summary: {
      totalItems: number;
      totalPlayCount: number;
      totalDuration: number;
      mostActiveLibrary: string;
    };
  }> {
    const libraries = await this.api.getLibraries();
    
    const summary = {
      totalItems: libraries.reduce((sum, lib) => sum + lib.count, 0),
      totalPlayCount: libraries.reduce((sum, lib) => sum + lib.total_plays, 0),
      totalDuration: libraries.reduce((sum, lib) => sum + lib.total_duration, 0),
      mostActiveLibrary: libraries.reduce((prev, curr) => 
        prev.total_plays > curr.total_plays ? prev : curr
      ).section_name
    };

    return {
      libraries: libraries.map(lib => this.enrichLibraryData(lib)),
      summary
    };
  }

  async getLibraryDetails(sectionId: number): Promise<Library & {
    watchTimeStats: Record<string, number>;
    activityLevel: 'high' | 'medium' | 'low';
    lastUpdated: string;
  }> {
    const [details, watchStats] = await Promise.all([
      this.api.getLibraryDetails(sectionId),
      this.api.getLibraryWatchStats(sectionId)
    ]);

    return {
      ...this.enrichLibraryData(details),
      watchTimeStats: watchStats,
      activityLevel: this.calculateActivityLevel(details.total_plays),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * User Methods with Enhanced Functionality
   */
  async getUserStats(userId: number): Promise<UserStats & {
    engagementScore: number;
    watchPatterns: {
      preferredMediaType: string;
      preferredTimeOfDay: string;
      averageSessionLength: number;
    };
  }> {
    const stats = await this.api.getUserStats(userId);
    const history = await this.api.getHistoryByUser(userId);

    return {
      ...stats,
      engagementScore: this.calculateEngagementScore(stats),
      watchPatterns: this.analyzeWatchPatterns(history)
    };
  }

  async getAllUserStats(): Promise<{
    users: UserStats[];
    summary: {
      totalUsers: number;
      mostActiveUser: string;
      averageEngagementScore: number;
    };
  }> {
    const users = await this.api.getAllUserStats();
    
    const summary = {
      totalUsers: users.length,
      mostActiveUser: users.reduce((prev, curr) => 
        prev.total_plays > curr.total_plays ? prev : curr
      ).username,
      averageEngagementScore: users.reduce((sum, user) => 
        sum + this.calculateEngagementScore(user), 0
      ) / users.length
    };

    return { users, summary };
  }

  /**
   * Recently Added Methods with Enhanced Functionality
   */
  async getRecentlyAdded(count = 10): Promise<{
    items: RecentlyAdded[];
    stats: {
      addedLastDay: number;
      addedLastWeek: number;
      mostActiveLibrary: string;
    };
  }> {
    const items = await this.api.getRecentlyAdded(count);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const stats = {
      addedLastDay: items.filter(item => (now - item.added_at * 1000) < oneDay).length,
      addedLastWeek: items.filter(item => (now - item.added_at * 1000) < oneWeek).length,
      mostActiveLibrary: this.findMostFrequent(items.map(item => item.library_name))
    };

    return {
      items: items.map(item => this.enrichRecentlyAddedData(item)),
      stats
    };
  }

  /**
   * Server Methods with Enhanced Functionality
   */
  async getServerStatus(): Promise<{
    info: ServerInfo;
    status: {
      health: 'good' | 'warning' | 'critical';
      uptime: number;
      load: number;
      memoryUsage: number;
    };
  }> {
    const info = await this.api.getServerInfo();
    const activity = await this.api.getCurrentActivity();

    return {
      info,
      status: {
        health: this.evaluateServerHealth(info, activity),
        uptime: this.calculateUptime(info),
        load: this.calculateServerLoad(activity),
        memoryUsage: this.calculateMemoryUsage(info)
      }
    };
  }

  /**
   * Helper Methods
   */
  private enrichSessionData(session: Session): EnrichedSession {
    return {
      ...session,
      progress_percent: (session.progress / session.duration) * 100,
      quality_rating: this.calculateQualityRating(session),
      stream_efficiency: this.calculateStreamEfficiency(session)
    };
  }

  private enrichHistoryEntry(entry: HistoryEntry): EnrichedHistoryEntry {
    return {
      ...entry,
      duration_formatted: this.formatDuration(entry.duration),
      completion_rate: entry.percent_complete
    };
  }

  private enrichLibraryData(library: Library): EnrichedLibrary {
    return {
      ...library,
      items_per_type: this.calculateItemsPerType(library),
      usage_frequency: this.calculateUsageFrequency(library)
    };
  }

  private enrichRecentlyAddedData(item: RecentlyAdded): EnrichedRecentlyAdded {
    return {
      ...item,
      added_date: new Date(item.added_at * 1000).toISOString(),
      age_days: Math.floor((Date.now() - item.added_at * 1000) / (24 * 60 * 60 * 1000))
    };
  }

  private findMostFrequent<T>(arr: T[]): T {
    return arr.reduce(
      (a, b, i, arr) =>
        (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b),
      arr[0]
    );
  }

  private calculateQualityRating(session: Session): number {
    // Implementation based on resolution, bitrate, and codec
    return 0;
  }

  private calculateStreamEfficiency(session: Session): number {
    // Implementation based on buffer count and bandwidth usage
    return 0;
  }

  private calculateEngagementScore(stats: UserStats): number {
    // Implementation based on watch time, frequency, and variety
    return 0;
  }

  private analyzeWatchPatterns(history: HistoryEntry[]): {
    preferredMediaType: string;
    preferredTimeOfDay: string;
    averageSessionLength: number;
  } {
    // Implementation to analyze user watch patterns
    return {
      preferredMediaType: '',
      preferredTimeOfDay: '',
      averageSessionLength: 0
    };
  }

  private calculateActivityLevel(plays: number): 'high' | 'medium' | 'low' {
    if (plays > 1000) return 'high';
    if (plays > 100) return 'medium';
    return 'low';
  }

  private evaluateServerHealth(
    info: ServerInfo,
    activity: Session[]
  ): 'good' | 'warning' | 'critical' {
    // Implementation based on system metrics and activity
    return 'good';
  }

  private calculateUptime(info: ServerInfo): number {
    // Implementation to calculate server uptime
    return 0;
  }

  private calculateServerLoad(activity: Session[]): number {
    // Implementation to calculate server load
    return 0;
  }

  private calculateMemoryUsage(info: ServerInfo): number {
    return (info.total_ram - info.total_ram) / info.total_ram * 100;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  private calculateItemsPerType(library: Library): Record<string, number> {
    // Implementation to break down items by type
    return {};
  }

  private calculateUsageFrequency(library: Library): 'high' | 'medium' | 'low' {
    const playsPerItem = library.total_plays / library.count;
    if (playsPerItem > 5) return 'high';
    if (playsPerItem > 1) return 'medium';
    return 'low';
  }
}