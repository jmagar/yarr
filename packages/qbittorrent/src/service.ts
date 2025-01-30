import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { QBittorrentApi } from './api.js';
import { 
  QBittorrentConfig, 
  TorrentInfo, 
  TransferInfo, 
  Category, 
  AppPreferences, 
  BuildInfo,
  ResourceResponse,
  CommandResponse,
  StatsResponse,
  HealthCheckResponse
} from './types.js';

export class Service {
  private readonly api: QBittorrentApi;

  constructor(config: QBittorrentConfig) {
    this.api = new QBittorrentApi(config);
  }

  // Torrent Management
  async getTorrents(filter?: string): Promise<TorrentInfo[]> {
    return this.api.getTorrents(filter);
  }

  async getTorrent(hash: string): Promise<TorrentInfo> {
    return this.api.getTorrent(hash);
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
    await this.api.addTorrent(torrent);
  }

  async deleteTorrents(hashes: string[], deleteFiles = false): Promise<void> {
    await this.api.deleteTorrents(hashes, deleteFiles);
  }

  // Transfer Info
  async getTransferInfo(): Promise<TransferInfo> {
    return this.api.getTransferInfo();
  }

  // Categories
  async getCategories(): Promise<Record<string, Category>> {
    return this.api.getCategories();
  }

  async createCategory(name: string, savePath: string): Promise<void> {
    await this.api.createCategory(name, savePath);
  }

  async deleteCategories(categories: string[]): Promise<void> {
    await this.api.deleteCategories(categories);
  }

  // Application
  async getAppPreferences(): Promise<AppPreferences> {
    return this.api.getAppPreferences();
  }

  async getAppVersion(): Promise<string> {
    return this.api.getAppVersion();
  }

  async getApiBuildInfo(): Promise<BuildInfo> {
    return this.api.getApiBuildInfo();
  }

  // Authentication
  async login(): Promise<void> {
    await this.api.login();
  }

  async logout(): Promise<void> {
    await this.api.logout();
  }

  // Enhanced Operations
  async addTorrentFromMagnet(magnetUrl: string, options: {
    savepath?: string;
    category?: string;
    tags?: string[];
    paused?: boolean;
  } = {}): Promise<void> {
    await this.api.addTorrent({
      urls: [magnetUrl],
      ...options
    });
  }

  async addTorrentFromFile(file: Blob, options: {
    savepath?: string;
    category?: string;
    tags?: string[];
    paused?: boolean;
  } = {}): Promise<void> {
    await this.api.addTorrent({
      file,
      ...options
    });
  }

  async getTorrentsByStatus(status: string): Promise<TorrentInfo[]> {
    return this.api.getTorrents(status);
  }

  async pauseTorrents(hashes: string[]): Promise<void> {
    await this.api.request('/torrents/pause', {
      method: 'POST',
      params: { hashes: hashes.join('|') }
    });
  }

  async resumeTorrents(hashes: string[]): Promise<void> {
    await this.api.request('/torrents/resume', {
      method: 'POST',
      params: { hashes: hashes.join('|') }
    });
  }

  async recheckTorrents(hashes: string[]): Promise<void> {
    await this.api.request('/torrents/recheck', {
      method: 'POST',
      params: { hashes: hashes.join('|') }
    });
  }

  async setTorrentPriority(hash: string, priority: number): Promise<void> {
    await this.api.request('/torrents/topPrio', {
      method: 'POST',
      params: { hashes: hash, priority }
    });
  }

  async setTorrentCategory(hashes: string[], category: string): Promise<void> {
    await this.api.request('/torrents/setCategory', {
      method: 'POST',
      params: { hashes: hashes.join('|'), category }
    });
  }

  async addTorrentTags(hashes: string[], tags: string[]): Promise<void> {
    await this.api.request('/torrents/addTags', {
      method: 'POST',
      params: { hashes: hashes.join('|'), tags: tags.join(',') }
    });
  }

  async removeTorrentTags(hashes: string[], tags: string[]): Promise<void> {
    await this.api.request('/torrents/removeTags', {
      method: 'POST',
      params: { hashes: hashes.join('|'), tags: tags.join(',') }
    });
  }

  async setTorrentLocation(hashes: string[], location: string): Promise<void> {
    await this.api.request('/torrents/setLocation', {
      method: 'POST',
      params: { hashes: hashes.join('|'), location }
    });
  }

  async getTorrentContents(hash: string): Promise<Array<{
    name: string;
    size: number;
    progress: number;
    priority: number;
    is_seed: boolean;
    piece_range: [number, number];
    availability: number;
  }>> {
    return this.api.request(`/torrents/files`, {
      params: { hash }
    });
  }

  async getTorrentTrackers(hash: string): Promise<Array<{
    url: string;
    status: number;
    tier: number;
    num_peers: number;
    num_seeds: number;
    num_leeches: number;
    num_downloaded: number;
    msg: string;
  }>> {
    return this.api.request(`/torrents/trackers`, {
      params: { hash }
    });
  }

  async getTorrentPieceStates(hash: string): Promise<number[]> {
    return this.api.request(`/torrents/pieceStates`, {
      params: { hash }
    });
  }

  async getTorrentPieceHashes(hash: string): Promise<string[]> {
    return this.api.request(`/torrents/pieceHashes`, {
      params: { hash }
    });
  }

  async setTorrentSpeedLimits(hash: string, downloadLimit: number, uploadLimit: number): Promise<void> {
    await this.api.request('/torrents/setSpeedLimits', {
      method: 'POST',
      params: {
        hashes: hash,
        dl_limit: downloadLimit,
        up_limit: uploadLimit
      }
    });
  }

  async getTorrentProperties(hash: string): Promise<{
    save_path: string;
    creation_date: number;
    piece_size: number;
    comment: string;
    total_wasted: number;
    total_uploaded: number;
    total_downloaded: number;
    ratio: number;
    time_elapsed: number;
    seeding_time: number;
    nb_connections: number;
    share_ratio: number;
  }> {
    return this.api.request(`/torrents/properties`, {
      params: { hash }
    });
  }

  /**
   * Resource Management
   */
  async getResourcesWithMetadata(options: {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: string;
    status?: string[];
    type?: string[];
    tags?: string[];
  } = {}): Promise<ResourceResponse[]> {
    const torrents = await this.api.getTorrents();
    return torrents.map(torrent => ({
      id: parseInt(torrent.hash, 16),
      name: torrent.name,
      type: 'torrent',
      status: torrent.state,
      enabled: !torrent.paused,
      createdAt: new Date(torrent.completion_on * 1000).toISOString(),
      updatedAt: new Date(torrent.completion_on * 1000).toISOString(),
      settings: {
        savePath: torrent.save_path,
        category: torrent.category,
        tags: torrent.tags
      },
      tags: torrent.tags.split(',').filter(Boolean),
      metadata: {
        size: torrent.size,
        progress: torrent.progress,
        downloadSpeed: torrent.dlspeed,
        uploadSpeed: torrent.upspeed,
        ratio: torrent.ratio
      }
    }));
  }

  async getResourceDetails(id: number): Promise<ResourceResponse> {
    const hash = id.toString(16);
    const torrent = await this.api.getTorrent(hash);
    return {
      id: parseInt(torrent.hash, 16),
      name: torrent.name,
      type: 'torrent',
      status: torrent.state,
      enabled: !torrent.paused,
      createdAt: new Date(torrent.completion_on * 1000).toISOString(),
      updatedAt: new Date(torrent.completion_on * 1000).toISOString(),
      settings: {
        savePath: torrent.save_path,
        category: torrent.category,
        tags: torrent.tags
      },
      tags: torrent.tags.split(',').filter(Boolean),
      metadata: {
        size: torrent.size,
        progress: torrent.progress,
        downloadSpeed: torrent.dlspeed,
        uploadSpeed: torrent.upspeed,
        ratio: torrent.ratio
      }
    };
  }

  async createResourceWithValidation(data: {
    name: string;
    type: string;
    status?: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    tags?: string[];
  }): Promise<ResourceResponse> {
    if (data.type !== 'torrent') {
      throw new ServiceError('VALIDATION_ERROR', 'Only torrent resources are supported');
    }

    await this.api.addTorrent({
      urls: [data.name],
      savepath: data.settings?.savePath as string,
      category: data.settings?.category as string,
      tags: data.tags,
      paused: !data.enabled
    });

    // Since we don't get the hash back from addTorrent, we need to find it
    const torrents = await this.api.getTorrents();
    const torrent = torrents.find(t => t.name === data.name);
    if (!torrent) {
      throw new ServiceError('API_ERROR', 'Failed to find newly added torrent');
    }

    return this.getResourceDetails(parseInt(torrent.hash, 16));
  }

  async updateResourceWithValidation(id: number, data: {
    name?: string;
    status?: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    tags?: string[];
  }): Promise<ResourceResponse> {
    const hash = id.toString(16);
    const torrent = await this.api.getTorrent(hash);

    if (data.enabled !== undefined) {
      if (data.enabled && torrent.paused) {
        await this.api.request('/torrents/resume', {
          method: 'POST',
          params: { hashes: hash }
        });
      } else if (!data.enabled && !torrent.paused) {
        await this.api.request('/torrents/pause', {
          method: 'POST',
          params: { hashes: hash }
        });
      }
    }

    if (data.settings?.category) {
      await this.api.request('/torrents/setCategory', {
        method: 'POST',
        params: {
          hashes: hash,
          category: data.settings.category as string
        }
      });
    }

    if (data.tags) {
      await this.api.request('/torrents/addTags', {
        method: 'POST',
        params: {
          hashes: hash,
          tags: data.tags.join(',')
        }
      });
    }

    return this.getResourceDetails(id);
  }

  async deleteResourceWithValidation(id: number): Promise<void> {
    const hash = id.toString(16);
    await this.api.deleteTorrents([hash]);
  }

  async executeCommandWithValidation(name: string, params?: Record<string, unknown>): Promise<CommandResponse> {
    const now = new Date().toISOString();
    const command: CommandResponse = {
      id: Date.now(),
      name: 'qBittorrent Command',
      command: name,
      parameters: params ?? {},
      progress: 0,
      message: 'Starting command...',
      startTime: now,
      status: 'queued',
      createdAt: now,
      updatedAt: now
    };

    try {
      switch (name) {
        case 'pause':
          await this.api.request('/torrents/pause', {
            method: 'POST',
            params: { hashes: params?.hashes }
          });
          break;
        case 'resume':
          await this.api.request('/torrents/resume', {
            method: 'POST',
            params: { hashes: params?.hashes }
          });
          break;
        case 'recheck':
          await this.api.request('/torrents/recheck', {
            method: 'POST',
            params: { hashes: params?.hashes }
          });
          break;
        default:
          throw new ServiceError('VALIDATION_ERROR', `Unknown command: ${name}`);
      }

      return {
        ...command,
        progress: 100,
        message: 'Command completed successfully',
        status: 'completed',
        endTime: new Date().toISOString()
      };
    } catch (error) {
      return {
        ...command,
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
        endTime: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async monitorCommandProgress(id: number): Promise<CommandResponse> {
    // qBittorrent doesn't have a command monitoring system, so we fake it
    return {
      id,
      name: 'qBittorrent Command',
      command: 'unknown',
      parameters: {},
      progress: 100,
      message: 'Command completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getEnhancedStats(options: {
    from?: string;
    sort?: string;
    order?: string;
  } = {}): Promise<StatsResponse & { computed: Record<string, unknown> }> {
    const [torrents, transferInfo] = await Promise.all([
      this.api.getTorrents(),
      this.api.getTransferInfo()
    ]);

    const totalSize = torrents.reduce((sum, t) => sum + t.size, 0);
    const completedSize = torrents.reduce((sum, t) => sum + (t.progress === 1 ? t.size : 0), 0);

    return {
      totalResources: torrents.length,
      activeResources: torrents.filter(t => t.state !== 'paused').length,
      lastUpdate: new Date().toISOString(),
      metrics: {
        requestCount: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0
      },
      resourceStats: {
        byType: { torrent: torrents.length },
        byStatus: torrents.reduce((acc, t) => {
          acc[t.state] = (acc[t.state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      computed: {
        totalSize,
        completedSize,
        completionRatio: totalSize > 0 ? completedSize / totalSize : 0,
        downloadSpeed: transferInfo.dl_info_speed,
        uploadSpeed: transferInfo.up_info_speed,
        ratio: torrents.reduce((sum, t) => sum + t.ratio, 0) / torrents.length
      }
    };
  }

  async getFullHealthCheck(): Promise<HealthCheckResponse> {
    const [version, transferInfo] = await Promise.all([
      this.api.getAppVersion(),
      this.api.getTransferInfo()
    ]);

    return {
      version,
      buildTime: new Date().toISOString(),
      isDebug: false,
      isProduction: true,
      isAdmin: true,
      isUserInteractive: false,
      startupPath: '',
      appData: '',
      osName: '',
      osVersion: '',
      isMonoRuntime: false,
      isMono: false,
      isLinux: false,
      isOsx: false,
      isWindows: true,
      branch: 'master',
      authentication: 'cookie',
      sqliteVersion: '',
      urlBase: '',
      runtimeVersion: '',
      runtimeName: ''
    };
  }
} 