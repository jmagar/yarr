import { ServiceError } from '@media-mcp/shared';
import { GotifyConfig, Message, PagedMessages, Application, Client, Health, Stats, ErrorCode, Version } from './types.js';

export class GotifyApi {
  constructor(private config: GotifyConfig) {
    if (!config.url || !config.applicationToken) {
      throw new Error('Gotify URL and application token (GOTIFY_APP_TOKEN) are required. Client token (GOTIFY_CLIENT_TOKEN) is optional for receiving messages.');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, useClientToken: boolean = false): Promise<T> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Gotify-Key': useClientToken ? this.config.clientToken! : this.config.applicationToken,
        ...options.headers
      };

      const response = await fetch(`${this.config.url}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new ServiceError(
          response.status === 401 ? ErrorCode.AUTH_ERROR : ErrorCode.API_ERROR,
          `API error: ${response.statusText}`,
          { status: response.status }
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      
      throw new ServiceError(
        ErrorCode.NETWORK_ERROR,
        'Failed to connect to Gotify',
        { error }
      );
    }
  }

  // Message Management (requires client token for reading, app token for sending)
  async getMessages(limit?: number, since?: number): Promise<PagedMessages> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for reading messages');
    }
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (since) params.append('since', since.toString());
    return this.request<PagedMessages>(`/message?${params.toString()}`, {}, true);
  }

  async createMessage(message: string, title?: string, priority: number = 5, extras?: Record<string, unknown>): Promise<Message> {
    // Uses application token by default
    return this.request<Message>('/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        title,
        priority,
        extras
      })
    });
  }

  async deleteMessage(id: number): Promise<void> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for deleting messages');
    }
    await this.request(`/message/${id}`, {
      method: 'DELETE'
    }, true);
  }

  async deleteAllMessages(): Promise<void> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for deleting messages');
    }
    await this.request('/message', {
      method: 'DELETE'
    }, true);
  }

  // Application Management (requires client token)
  async getApplications(): Promise<Application[]> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing applications');
    }
    return this.request<Application[]>('/application', {}, true);
  }

  async createApplication(name: string, description: string): Promise<Application> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing applications');
    }
    return this.request<Application>('/application', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description
      })
    }, true);
  }

  async updateApplication(id: number, name: string, description: string): Promise<Application> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing applications');
    }
    return this.request<Application>(`/application/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        description
      })
    }, true);
  }

  async deleteApplication(id: number): Promise<void> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing applications');
    }
    await this.request(`/application/${id}`, {
      method: 'DELETE'
    }, true);
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

  // Client Management (requires client token)
  async getClients(): Promise<Client[]> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing clients');
    }
    return this.request<Client[]>('/client', {}, true);
  }

  async createClient(name: string): Promise<Client> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing clients');
    }
    return this.request<Client>('/client', {
      method: 'POST',
      body: JSON.stringify({ name })
    }, true);
  }

  async updateClient(id: number, name: string): Promise<Client> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing clients');
    }
    return this.request<Client>(`/client/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    }, true);
  }

  async deleteClient(id: number): Promise<void> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for managing clients');
    }
    await this.request(`/client/${id}`, {
      method: 'DELETE'
    }, true);
  }

  // Health & Version (public endpoints, no token needed)
  async getHealth(): Promise<Health> {
    const response = await fetch(`${this.config.url}/health`);
    return response.json();
  }

  async getVersion(): Promise<Version> {
    const response = await fetch(`${this.config.url}/version`);
    return response.json();
  }

  // Stats (requires client token)
  async getStats(): Promise<Stats> {
    if (!this.config.clientToken) {
      throw new Error('Client token (GOTIFY_CLIENT_TOKEN) is required for getting stats');
    }
    const [messages, applications, clients] = await Promise.all([
      this.getMessages(),
      this.getApplications(),
      this.getClients()
    ]);

    return {
      messages: messages.paging.size,
      applications: applications.length,
      clients: clients.length
    };
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
} 