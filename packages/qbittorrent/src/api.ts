import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { 
  QBittorrentConfig, 
  TorrentInfo, 
  TransferInfo, 
  Category, 
  AppPreferences, 
  BuildInfo,
  QueryParams,
  ResourceResponse,
  CommandResponse,
  StatsResponse,
  HealthCheckResponse
} from './types.js';

export class QBittorrentApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: QBittorrentConfig) {
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
   * Retry logic implementation
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const attempts = this.config.retryAttempts ?? this.defaultRetryAttempts;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        const error = err as Error;
        lastError = error;
        if (attempt < attempts) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000))
          );
        }
      }
    }
    throw lastError;
  }

  /**
   * Base request implementation with error handling
   */
  async request<T>(endpoint: string, options: {
    method?: string;
    params?: Record<string, unknown>;
    body?: string | FormData;
  }): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v2${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url.toString(), {
        method: options.method ?? 'GET',
        headers: {
          'Cookie': `SID=${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: options.body,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceError(
          ErrorCodes.API_ERROR,
          `qBittorrent API error: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new ServiceError(
          ErrorCodes.TIMEOUT,
          'qBittorrent API request timed out'
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Resource Management
   */
  
  async getResources(query?: QueryParams): Promise<ResourceResponse[]> {
    return this.withRetry(() => this.request<ResourceResponse[]>('/resources', { 
      params: query as Record<string, unknown> 
    }));
  }

  async getResource(id: number): Promise<ResourceResponse> {
    return this.withRetry(() => this.request<ResourceResponse>(`/resources/${id}`, {}));
  }

  async createResource(data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    return this.withRetry(() => 
      this.request<ResourceResponse>('/resources', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    );
  }

  async updateResource(id: number, data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    return this.withRetry(() =>
      this.request<ResourceResponse>(`/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    );
  }

  async deleteResource(id: number): Promise<void> {
    return this.withRetry(() =>
      this.request<void>(`/resources/${id}`, {
        method: 'DELETE'
      })
    );
  }

  /**
   * Command Operations
   */

  async executeCommand(command: string, params?: Record<string, unknown>): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>('/commands', {
        method: 'POST',
        body: JSON.stringify({ command, ...params })
      })
    );
  }

  async getCommandStatus(id: number): Promise<CommandResponse> {
    return this.withRetry(() =>
      this.request<CommandResponse>(`/commands/${id}`, {})
    );
  }

  /**
   * Statistics & Health
   */

  async getStats(query?: QueryParams): Promise<StatsResponse> {
    return this.withRetry(() =>
      this.request<StatsResponse>('/stats', { 
        params: query as Record<string, unknown> 
      })
    );
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.withRetry(() =>
      this.request<HealthCheckResponse>('/health', {})
    );
  }

  /**
   * Utility Methods
   */

  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      return false;
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'AUTHENTICATION_ERROR') {
        return false;
      }
      throw error;
    }
  }

  // Torrent Management
  async getTorrents(filter?: string): Promise<TorrentInfo[]> {
    return this.request('/torrents/info', {
      params: filter ? { filter } : undefined
    });
  }

  async getTorrent(hash: string): Promise<TorrentInfo> {
    const torrents = await this.request<TorrentInfo[]>('/torrents/info', {
      params: { hashes: hash }
    });
    if (!torrents.length) {
      throw new ServiceError(ErrorCodes.NOT_FOUND, `Torrent not found: ${hash}`);
    }
    return torrents[0];
  }

  async addTorrent(torrent: {
    urls?: string[];
    file?: Blob;
    savepath?: string;
    category?: string;
    tags?: string[];
    skip_checking?: boolean;
    paused?: boolean;
    root_folder?: boolean;
  }): Promise<void> {
    const formData = new FormData();
    
    if (torrent.urls?.length) {
      formData.append('urls', torrent.urls.join('\\n'));
    }
    if (torrent.file) {
      formData.append('torrents', torrent.file);
    }
    if (torrent.savepath) {
      formData.append('savepath', torrent.savepath);
    }
    if (torrent.category) {
      formData.append('category', torrent.category);
    }
    if (torrent.tags?.length) {
      formData.append('tags', torrent.tags.join(','));
    }
    if (torrent.skip_checking !== undefined) {
      formData.append('skip_checking', torrent.skip_checking.toString());
    }
    if (torrent.paused !== undefined) {
      formData.append('paused', torrent.paused.toString());
    }
    if (torrent.root_folder !== undefined) {
      formData.append('root_folder', torrent.root_folder.toString());
    }

    await this.request('/torrents/add', {
      method: 'POST',
      body: formData as any
    });
  }

  async deleteTorrents(hashes: string[], deleteFiles = false): Promise<void> {
    await this.request('/torrents/delete', {
      method: 'POST',
      params: {
        hashes: hashes.join('|'),
        deleteFiles
      }
    });
  }

  // Transfer Info
  async getTransferInfo(): Promise<TransferInfo> {
    return this.request('/transfer/info', {});
  }

  // Categories
  async getCategories(): Promise<Record<string, Category>> {
    return this.request('/torrents/categories', {});
  }

  async createCategory(name: string, savePath: string): Promise<void> {
    await this.request('/torrents/createCategory', {
      method: 'POST',
      params: {
        category: name,
        savePath
      }
    });
  }

  async deleteCategories(categories: string[]): Promise<void> {
    await this.request('/torrents/removeCategories', {
      method: 'POST',
      params: {
        categories: categories.join('\n')
      }
    });
  }

  // Application
  async getAppPreferences(): Promise<AppPreferences> {
    return this.request('/app/preferences', {});
  }

  async getAppVersion(): Promise<string> {
    return this.request('/app/version', {});
  }

  async getApiBuildInfo(): Promise<BuildInfo> {
    return this.request('/app/buildInfo', {});
  }

  // Authentication
  async login(): Promise<void> {
    await this.request('/auth/login', {
      method: 'POST',
      params: {
        username: 'admin',
        password: this.config.apiKey
      }
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST'
    });
  }
} 