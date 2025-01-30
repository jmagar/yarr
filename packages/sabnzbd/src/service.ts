import { ServiceError } from '@media-mcp/shared';
import { ServiceApi } from './api.js';
import { 
  ServiceConfig, 
  ResourceResponse, 
  CommandResponse, 
  StatsResponse, 
  HealthCheckResponse,
  QueryParams,
  ErrorCode
} from './types.js';

export class Service {
  protected readonly api: ServiceApi;
  protected readonly config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      rateLimitPerSecond: 2,
      ...config
    };
    this.api = new ServiceApi(this.config);
  }

  /**
   * Resource Management with Enhanced Functionality
   */

  async getResourcesWithMetadata(query?: QueryParams): Promise<ResourceResponse[]> {
    const resources = await this.api.getResources(query);
    return resources.map(resource => this.enrichResourceData(resource));
  }

  async getResourceDetails(id: number): Promise<ResourceResponse & { metadata: Record<string, unknown> }> {
    this.validateId(id);
    const resource = await this.api.getResource(id);
    return this.enrichResourceData(resource);
  }

  async createResourceWithValidation(data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    this.validateResourceData(data);
    const resource = await this.api.createResource(data);
    return this.enrichResourceData(resource);
  }

  async updateResourceWithValidation(id: number, data: Partial<ResourceResponse>): Promise<ResourceResponse> {
    this.validateId(id);
    this.validateResourceData(data);
    
    const existing = await this.api.getResource(id);
    if (!existing) {
      throw new ServiceError(
        'NOT_FOUND',
        'Resource not found',
        { id }
      );
    }

    const resource = await this.api.updateResource(id, data);
    return this.enrichResourceData(resource);
  }

  async deleteResourceWithValidation(id: number): Promise<void> {
    this.validateId(id);
    const existing = await this.api.getResource(id);
    if (!existing) {
      throw new ServiceError(
        'NOT_FOUND',
        'Resource not found',
        { id }
      );
    }
    await this.api.deleteResource(id);
  }

  /**
   * Command Operations with Enhanced Functionality
   */

  async executeCommandWithValidation(
    command: string, 
    params?: Record<string, unknown>
  ): Promise<CommandResponse> {
    this.validateCommand(command);
    if (params) {
      this.validateCommandParams(params);
    }

    const result = await this.api.executeCommand(command, params);
    return {
      ...result,
      progress: this.calculateProgress(result)
    };
  }

  async monitorCommandProgress(id: number): Promise<CommandResponse & { progress: number }> {
    this.validateId(id);
    const status = await this.api.getCommandStatus(id);
    return {
      ...status,
      progress: this.calculateProgress(status)
    };
  }

  /**
   * Statistics & Health with Enhanced Functionality
   */

  async getEnhancedStats(query?: QueryParams): Promise<StatsResponse & { computed: Record<string, unknown> }> {
    const [stats, health] = await Promise.all([
      this.api.getStats(query),
      this.api.getHealth()
    ]);

    return {
      ...stats,
      computed: {
        healthStatus: health.status,
        uptime: health.uptime,
        resourceUtilization: this.calculateResourceUtilization(stats),
        errorRate: this.calculateErrorRate(stats),
        performance: this.calculatePerformanceMetrics(stats)
      }
    };
  }

  async getFullHealthCheck(): Promise<HealthCheckResponse & { details: Record<string, unknown> }> {
    const [health, stats] = await Promise.all([
      this.api.getHealth(),
      this.api.getStats()
    ]);

    return {
      ...health,
      details: {
        resourceStats: stats,
        lastChecked: new Date().toISOString(),
        systemMetrics: await this.getSystemMetrics(),
        serviceStatus: this.interpretHealthStatus(health)
      }
    };
  }

  /**
   * Validation Methods
   */

  protected validateId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        'Invalid ID provided',
        { id }
      );
    }
  }

  protected validateResourceData(data: Partial<ResourceResponse>): void {
    if (!data.name || data.name.length < 2) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        'Resource name must be at least 2 characters',
        { name: data.name }
      );
    }

    if (data.name.length > 100) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        'Resource name must not exceed 100 characters',
        { name: data.name }
      );
    }

    // Add more validation as needed
  }

  protected validateCommand(command: string): void {
    if (!command || command.trim().length === 0) {
      throw new ServiceError(
        'VALIDATION_ERROR',
        'Command cannot be empty',
        { command }
      );
    }
  }

  protected validateCommandParams(params: Record<string, unknown>): void {
    // Add command parameter validation logic
  }

  /**
   * Helper Methods
   */

  protected enrichResourceData(resource: ResourceResponse): ResourceResponse & { metadata: Record<string, unknown> } {
    return {
      ...resource,
      metadata: {
        lastChecked: new Date().toISOString(),
        status: resource.status,
        isActive: resource.status === 'active',
        healthScore: this.calculateHealthScore(resource),
        tags: resource.tags || [],
        customFields: this.extractCustomFields(resource)
      }
    };
  }

  protected calculateProgress(status: CommandResponse): number {
    switch (status.status.toLowerCase()) {
      case 'completed':
        return 100;
      case 'failed':
        return -1;
      case 'running':
        return this.estimateProgress(status);
      case 'queued':
        return 0;
      default:
        return -1;
    }
  }

  protected calculateResourceUtilization(stats: StatsResponse): number {
    return (stats.activeResources / stats.totalResources) * 100;
  }

  protected calculateErrorRate(stats: StatsResponse): number {
    return stats.metrics.errorRate;
  }

  protected calculatePerformanceMetrics(stats: StatsResponse): Record<string, number> {
    return {
      averageResponseTime: stats.metrics.averageResponseTime,
      requestsPerMinute: (stats.metrics.requestCount / 60),
      errorRate: this.calculateErrorRate(stats),
      successRate: stats.metrics.successRate * 100
    };
  }

  protected async getSystemMetrics(): Promise<Record<string, number>> {
    // Implement system metrics collection
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0
    };
  }

  protected calculateHealthScore(resource: ResourceResponse): number {
    // Implement health score calculation
    return 100;
  }

  protected extractCustomFields(resource: ResourceResponse): Record<string, unknown> {
    // Extract and process custom fields
    return {};
  }

  protected estimateProgress(status: CommandResponse): number {
    // Implement progress estimation logic
    return 50;
  }

  protected interpretHealthStatus(health: HealthCheckResponse): string {
    const failedChecks = health.checks.filter(check => check.status === 'fail').length;
    const warnChecks = health.checks.filter(check => check.status === 'warn').length;

    if (failedChecks > 0) return 'critical';
    if (warnChecks > 0) return 'degraded';
    return 'healthy';
  }
} 