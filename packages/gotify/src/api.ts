import { ServiceError, ErrorCodes } from '@media-mcp/shared';
import { GotifyConfig, Message, PagedMessages, Application, Client, Health, Stats, Version } from './types.js';

export class GotifyApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: GotifyConfig) {
    if (!config.url || !config.applicationToken) {
      throw new Error('Gotify URL and application token (GOTIFY_APP_TOKEN) are required. Client token (GOTIFY_CLIENT_TOKEN) is optional for receiving messages.');
    }
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
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v1${endpoint}`);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'X-Gotify-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ServiceError(ErrorCodes.AUTHENTICATION_ERROR, 'Invalid API key');
        }
        if (response.status === 404) {
          throw new ServiceError(ErrorCodes.NOT_FOUND, `Resource not found: ${endpoint}`);
        }
        throw new ServiceError(ErrorCodes.API_ERROR, `API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      if ((error as Error).name === 'AbortError') {
        throw new ServiceError(
          ErrorCodes.TIMEOUT,
          `Request timed out after ${this.config.timeout ?? this.defaultTimeout}ms`,
          { endpoint }
        );
      }

      throw new ServiceError(
        ErrorCodes.NETWORK_ERROR,
        'Failed to connect to Gotify',
        { error }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Message Methods
   */
  async sendMessage(
    title: string,
    message: string,
    priority = 5,
    extras?: Record<string, unknown>
  ): Promise<{
    id: number;
    appid: string;
    message: string;
    title: string;
    priority: number;
    extras?: Record<string, unknown>;
    date: string;
  }> {
    return this.request('/message', {
      method: 'POST',
      body: JSON.stringify({
        title,
        message,
        priority,
        extras
      })
    });
  }

  /**
   * Application Methods
   */
  async getApplications(): Promise<Array<{
    id: number;
    name: string;
    description: string;
    internal: boolean;
    token: string;
    image: string;
  }>> {
    return this.request('/application');
  }

  async createApplication(data: {
    name: string;
    description: string;
  }): Promise<Application> {
    return this.request('/application', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteApplication(id: number): Promise<void> {
    await this.request(`/application/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Client Methods
   */
  async getClients(): Promise<Array<{
    id: number;
    name: string;
    token: string;
  }>> {
    return this.request('/client');
  }

  async createClient(
    name: string
  ): Promise<{
    id: number;
    name: string;
    token: string;
  }> {
    return this.request('/client', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async deleteClient(id: number): Promise<void> {
    await this.request(`/client/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Health Methods
   */
  async getHealth(): Promise<{
    health: 'green' | 'yellow' | 'red';
    database: 'green' | 'yellow' | 'red';
  }> {
    return this.request('/health');
  }

  /**
   * Version Methods
   */
  async getVersion(): Promise<{
    version: string;
    buildDate: string;
    commit: string;
  }> {
    return this.request('/version');
  }

  // Message Management (requires client token for reading, app token for sending)
  async getMessages(limit?: number, since?: number): Promise<PagedMessages> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for reading messages');
    }
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (since) params.append('since', since.toString());
    return this.request<PagedMessages>(`/message?${params.toString()}`, {});
  }

  async uploadApplicationImage(id: number, image: Blob): Promise<void> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing applications');
    }
    const formData = new FormData();
    formData.append('file', image);

    await fetch(`${this.config.url}/application/${id}/image`, {
      method: 'POST',
      headers: {
        'X-Gotify-Key': this.config.clientToken
      },
      body: formData
    });
  }

  // Stats (requires client token)
  async getStats(): Promise<{
    appCount: number;
    clientCount: number;
    messageCount: number;
  }> {
    return this.request('/stats');
  }

  // WebSocket connection (requires client token)
  async connectWebSocket(onMessage: (msg: Message) => void): Promise<WebSocket> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for WebSocket connections');
    }

    const ws = new WebSocket(`${this.config.url.replace('http', 'ws')}/stream?token=${this.config.clientToken}`);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  async deleteMessage(id: number): Promise<void> {
    await this.request(`/message/${id}`, {
      method: 'DELETE'
    });
  }

  async deleteAllMessages(): Promise<void> {
    await this.request('/message', {
      method: 'DELETE'
    });
  }

  async updateApplication(id: number, data: {
    name?: string;
    description?: string;
    image?: string;
  }): Promise<Application> {
    return this.request(`/application/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateClient(id: number, data: {
    name?: string;
  }): Promise<Client> {
    return this.request(`/client/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

export class ServiceApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: GotifyConfig) {
    this.minInterval = 1000 / (config.rateLimitPerSecond ?? this.defaultRateLimit);
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequest = Date.now();
  }

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

  async request<T>(endpoint: string, options: {
    method?: string;
    params?: Record<string, unknown>;
    body?: string;
  } = {}): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}${endpoint}`);
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
          'X-Gotify-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: options.body,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Gotify API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new Error('Gotify API request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
} 