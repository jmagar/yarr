import { ServiceError } from '@media-mcp/shared';
import { ServiceConfig, Resource, Command, Stats, ApiResponse } from './types.js';

export class ServiceApi {
  constructor(private config: ServiceConfig) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.config.url}/api/v1${endpoint}`, {
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
          `API error: ${response.statusText}`,
          { status: response.status }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      throw new ServiceError(
        'NETWORK_ERROR',
        'Failed to connect to service',
        { error }
      );
    }
  }

  // Resource Management
  async getResources(): Promise<ApiResponse<Resource[]>> {
    return this.request<ApiResponse<Resource[]>>('/resources');
  }

  async getResource(id: number): Promise<ApiResponse<Resource>> {
    return this.request<ApiResponse<Resource>>(`/resources/${id}`);
  }

  async createResource(data: Partial<Resource>): Promise<ApiResponse<Resource>> {
    return this.request<ApiResponse<Resource>>('/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateResource(id: number, data: Partial<Resource>): Promise<ApiResponse<Resource>> {
    return this.request<ApiResponse<Resource>>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteResource(id: number): Promise<void> {
    await this.request(`/resources/${id}`, {
      method: 'DELETE'
    });
  }

  // Command Management
  async executeCommand(command: Partial<Command>): Promise<ApiResponse<Command>> {
    return this.request<ApiResponse<Command>>('/commands', {
      method: 'POST',
      body: JSON.stringify(command)
    });
  }

  async getCommandStatus(id: number): Promise<ApiResponse<Command>> {
    return this.request<ApiResponse<Command>>(`/commands/${id}`);
  }

  // Statistics
  async getStats(): Promise<ApiResponse<Stats>> {
    return this.request<ApiResponse<Stats>>('/stats');
  }
} 