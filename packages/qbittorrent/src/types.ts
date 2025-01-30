import { ServiceConfig } from '@media-mcp/shared';

export interface QBittorrentConfig extends ServiceConfig {
  apiKey: string;
}

export interface TorrentInfo {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  priority: number;
  num_seeds: number;
  num_complete: number;
  num_leechs: number;
  num_incomplete: number;
  ratio: number;
  eta: number;
  state: string;
  seq_dl: boolean;
  f_l_piece_prio: boolean;
  completion_on: number;
  tracker: string;
  dl_limit: number;
  up_limit: number;
  downloaded: number;
  uploaded: number;
  downloaded_session: number;
  uploaded_session: number;
  amount_left: number;
  save_path: string;
  completed: number;
  max_ratio: number;
  max_seeding_time: number;
  auto_tmm: boolean;
  category: string;
  tags: string;
  super_seeding: boolean;
  force_start: boolean;
}

export interface TransferInfo {
  dl_info_speed: number;
  dl_info_data: number;
  up_info_speed: number;
  up_info_data: number;
  dl_rate_limit: number;
  up_rate_limit: number;
  dht_nodes: number;
  connection_status: string;
}

export interface Category {
  name: string;
  savePath: string;
}

export interface AppPreferences {
  locale: string;
  create_subfolder_enabled: boolean;
  start_paused_enabled: boolean;
  auto_delete_mode: number;
  preallocate_all: boolean;
  incomplete_files_ext: boolean;
  auto_tmm_enabled: boolean;
  torrent_changed_tmm_enabled: boolean;
  save_path_changed_tmm_enabled: boolean;
  category_changed_tmm_enabled: boolean;
  save_path: string;
  temp_path_enabled: boolean;
  temp_path: string;
  export_dir: string;
  export_dir_fin: string;
  scan_dirs: Record<string, string>;
  mail_notification_enabled: boolean;
  mail_notification_sender: string;
  mail_notification_email: string;
  mail_notification_smtp: string;
  mail_notification_ssl_enabled: boolean;
  mail_notification_auth_enabled: boolean;
  mail_notification_username: string;
  mail_notification_password: string;
  autorun_enabled: boolean;
  autorun_program: string;
  listen_port: number;
  upnp: boolean;
  max_connec: number;
  max_connec_per_torrent: number;
  max_uploads: number;
  max_uploads_per_torrent: number;
  proxy_type: number;
  proxy_ip: string;
  proxy_port: number;
  proxy_peer_connections: boolean;
  proxy_auth_enabled: boolean;
  proxy_username: string;
  proxy_password: string;
}

export interface BuildInfo {
  qt: string;
  libtorrent: string;
  boost: string;
  openssl: string;
  zlib: string;
  bitness: number;
}

/**
 * Common response fields shared across all responses
 */
export interface BaseResponse {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  status?: string[];
  type?: string[];
  tags?: string[];
  search?: string;
  from?: string;
  to?: string;
}

/**
 * Common query parameters
 */
export interface QueryParams extends PaginationParams, FilterParams {
  includeDisabled?: boolean;
  fields?: string[];
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
 * Base response interface for commands/operations
 */
export interface CommandResponse extends BaseResponse {
  command: string;
  parameters: Record<string, unknown>;
  progress: number;
  message: string;
  startTime: string;
  endTime?: string;
  error?: string;
}

/**
 * Base response interface for statistics/metrics
 */
export interface StatsResponse {
  totalResources: number;
  activeResources: number;
  lastUpdate: string;
  metrics: {
    requestCount: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resourceStats: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    timestamp: string;
    duration: number;
    metadata?: Record<string, unknown>;
  }>;
  resources: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

/**
 * Common error codes
 */
export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN'; 