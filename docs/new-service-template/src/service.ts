import { ServiceApi } from './api.js';
import { ServiceConfig, Resource, Command, Stats, ApiResponse } from './types.js';

export class Service {
  private api: ServiceApi;

  constructor(config: ServiceConfig) {
    this.api = new ServiceApi(config);
  }

  // Resource Management
  async getResources(): Promise<Resource[]> {
    const response = await this.api.getResources();
    return response.data;
  }

  async getResource(id: number): Promise<Resource> {
    const response = await this.api.getResource(id);
    return response.data;
  }

  async createResource(data: Partial<Resource>): Promise<Resource> {
    const response = await this.api.createResource(data);
    return response.data;
  }

  async updateResource(id: number, data: Partial<Resource>): Promise<Resource> {
    const response = await this.api.updateResource(id, data);
    return response.data;
  }

  async deleteResource(id: number): Promise<void> {
    await this.api.deleteResource(id);
  }

  // Command Management
  async executeCommand(command: Partial<Command>): Promise<Command> {
    const response = await this.api.executeCommand(command);
    return response.data;
  }

  async getCommandStatus(id: number): Promise<Command> {
    const response = await this.api.getCommandStatus(id);
    return response.data;
  }

  // Statistics
  async getStats(): Promise<Stats> {
    const response = await this.api.getStats();
    return response.data;
  }

  // Enhanced Operations
  async enhancedOperation(resourceId: number): Promise<void> {
    // Get resource
    const resource = await this.getResource(resourceId);

    // Execute command
    const command = await this.executeCommand({
      name: 'enhance',
      // Add command parameters
    });

    // Wait for completion
    while (true) {
      const status = await this.getCommandStatus(command.id);
      if (status.status === 'completed') break;
      if (status.status === 'failed') {
        throw new Error('Command failed');
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Update resource
    await this.updateResource(resourceId, {
      // Update with results
    });
  }
} 