import { GotifyApi } from './api.js';
import { GotifyConfig, Message, PagedMessages, Application, Client, Health, Stats, Version } from './types.js';

export class GotifyService {
  private api: GotifyApi;

  constructor(config: GotifyConfig) {
    this.api = new GotifyApi(config);
  }

  // Message Management
  async getMessages(limit?: number, since?: number): Promise<PagedMessages> {
    return this.api.getMessages(limit, since);
  }

  async sendMessage(message: string, options: {
    title?: string;
    priority?: number;
    extras?: Record<string, unknown>;
  } = {}): Promise<Message> {
    return this.api.createMessage(
      message,
      options.title,
      options.priority,
      options.extras
    );
  }

  async deleteMessage(id: number): Promise<void> {
    await this.api.deleteMessage(id);
  }

  async deleteAllMessages(): Promise<void> {
    await this.api.deleteAllMessages();
  }

  // Application Management
  async getApplications(): Promise<Application[]> {
    return this.api.getApplications();
  }

  async createApplication(name: string, description: string): Promise<Application> {
    return this.api.createApplication(name, description);
  }

  async updateApplication(id: number, name: string, description: string): Promise<Application> {
    return this.api.updateApplication(id, name, description);
  }

  async deleteApplication(id: number): Promise<void> {
    await this.api.deleteApplication(id);
  }

  async setApplicationImage(id: number, imageUrl: string): Promise<void> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await this.api.uploadApplicationImage(id, blob);
  }

  // Client Management
  async getClients(): Promise<Client[]> {
    return this.api.getClients();
  }

  async createClient(name: string): Promise<Client> {
    return this.api.createClient(name);
  }

  async updateClient(id: number, name: string): Promise<Client> {
    return this.api.updateClient(id, name);
  }

  async deleteClient(id: number): Promise<void> {
    await this.api.deleteClient(id);
  }

  // Health & Version
  async getHealth(): Promise<Health> {
    return this.api.getHealth();
  }

  async getVersion(): Promise<Version> {
    return this.api.getVersion();
  }

  // Statistics
  async getStats(): Promise<Stats> {
    return this.api.getStats();
  }

  // Enhanced Operations
  async sendBatchMessages(messages: Array<{
    message: string;
    title?: string;
    priority?: number;
    extras?: Record<string, unknown>;
  }>): Promise<Message[]> {
    return Promise.all(
      messages.map(msg => this.sendMessage(msg.message, {
        title: msg.title,
        priority: msg.priority,
        extras: msg.extras
      }))
    );
  }

  async createApplicationWithImage(
    name: string,
    description: string,
    imageUrl: string
  ): Promise<Application> {
    const app = await this.createApplication(name, description);
    await this.setApplicationImage(app.id, imageUrl);
    return app;
  }

  async cleanupOldMessages(olderThanDays: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    
    const messages = await this.getMessages();
    const oldMessages = messages.messages.filter(
      msg => new Date(msg.date) < cutoff
    );
    
    await Promise.all(
      oldMessages.map(msg => this.deleteMessage(msg.id))
    );
  }
} 