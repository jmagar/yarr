import { ServiceError, ErrorCode, ErrorCodes } from '@media-mcp/shared';
import { 
  TautulliConfig,
  Session,
  HistoryEntry,
  Library,
  UserStats,
  RecentlyAdded,
  ServerInfo,
  QueryParams,
  TautulliError,
  TautulliErrorCode
} from './types.js';

export class TautulliApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: TautulliConfig) {
    this.minInterval = 1000 / (config.rateLimitPerSecond ?? this.defaultRateLimit);
  }

  /**
   * Rate limiting implementation
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequest = Date.now();
  }

  /**
   * Base request implementation
   */
  private async request<T>(
    command: string,
    params: Record<string, unknown> = {},
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v2`);
    const searchParams = new URLSearchParams({
      apikey: this.config.apiKey,
      cmd: command,
      ...Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(',') : String(value)
        ])
      )
    });
    url.search = searchParams.toString();

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.json() as TautulliError;
        throw new ServiceError(
          this.mapErrorCode(error.code),
          error.message,
          error.response
        );
      }

      const data = await response.json();
      if (data.response && data.response.result === 'error') {
        throw new ServiceError(
          'API_ERROR',
          data.response.message,
          data.response
        );
      }

      return data.response.data as T;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      if ((error as Error).name === 'AbortError') {
        throw new ServiceError(
          'TIMEOUT',
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { command }
        );
      }

      throw new ServiceError(
        'NETWORK_ERROR',
        'Failed to connect to Tautulli',
        { error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapErrorCode(code: TautulliErrorCode): ErrorCode {
    const mapping: Record<TautulliErrorCode, ErrorCode> = {
      'AUTHENTICATION_ERROR': ErrorCodes.AUTHENTICATION_ERROR,
      'INVALID_REQUEST': ErrorCodes.VALIDATION_ERROR,
      'RESOURCE_NOT_FOUND': ErrorCodes.NOT_FOUND,
      'REQUEST_TIMEOUT': ErrorCodes.TIMEOUT,
      'RATE_LIMIT_EXCEEDED': ErrorCodes.RATE_LIMIT,
      'SERVER_ERROR': ErrorCodes.API_ERROR,
      'SERVICE_OFFLINE': ErrorCodes.API_ERROR
    };
    return mapping[code] || ErrorCodes.UNKNOWN;
  }

  /**
   * Activity Methods
   */
  async getCurrentActivity(): Promise<Session[]> {
    return this.request<Session[]>('get_activity');
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.request<void>('terminate_session', { session_id: sessionId });
  }

  /**
   * History Methods
   */
  async getHistory(params: QueryParams = {}): Promise<HistoryEntry[]> {
    return this.request<HistoryEntry[]>('get_history', {
      page: params.page,
      length: params.pageSize,
      order_column: params.sort,
      order_dir: params.order,
      start_date: params.from,
      end_date: params.to
    });
  }

  async getHistoryByUser(userId: number, params: QueryParams = {}): Promise<HistoryEntry[]> {
    return this.request<HistoryEntry[]>('get_history', {
      user_id: userId,
      ...params
    });
  }

  /**
   * Library Methods
   */
  async getLibraries(): Promise<Library[]> {
    return this.request<Library[]>('get_libraries');
  }

  async getLibraryDetails(sectionId: number): Promise<Library> {
    return this.request<Library>('get_library', { section_id: sectionId });
  }

  async getLibraryWatchStats(sectionId: number): Promise<Record<string, number>> {
    return this.request<Record<string, number>>('get_library_watch_time_stats', {
      section_id: sectionId
    });
  }

  /**
   * User Methods
   */
  async getUserStats(userId: number): Promise<UserStats> {
    return this.request<UserStats>('get_user_player_stats', { user_id: userId });
  }

  async getAllUserStats(): Promise<UserStats[]> {
    return this.request<UserStats[]>('get_user_player_stats');
  }

  /**
   * Recently Added Methods
   */
  async getRecentlyAdded(count = 10): Promise<RecentlyAdded[]> {
    return this.request<RecentlyAdded[]>('get_recently_added', { count });
  }

  async getRecentlyAddedByLibrary(sectionId: number, count = 10): Promise<RecentlyAdded[]> {
    return this.request<RecentlyAdded[]>('get_recently_added', {
      section_id: sectionId,
      count
    });
  }

  /**
   * Server Methods
   */
  async getServerInfo(): Promise<ServerInfo> {
    return this.request<ServerInfo>('get_server_info');
  }

  async getServerIdentity(): Promise<{ machine_identifier: string }> {
    return this.request<{ machine_identifier: string }>('get_server_identity');
  }

  /**
   * Utility Methods
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getServerInfo();
      return true;
    } catch {
      return false;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getServerInfo();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === ErrorCodes.AUTHENTICATION_ERROR) {
        return false;
      }
      if (error instanceof Error) {
        throw new ServiceError(ErrorCodes.AUTHENTICATION_ERROR, error.message, { error });
      }
      throw new ServiceError(ErrorCodes.UNKNOWN, 'Unknown error occurred', { error });
    }
  }
} 