import { ServiceConfig } from '@media-mcp/shared';

// Configuration
export interface GotifyConfig extends ServiceConfig {
  apiKey: string;
  applicationToken: string;  // For sending messages
  clientToken?: string;     // For receiving messages (optional)
}

// Token Types
export enum TokenType {
  APPLICATION = 'application',
  CLIENT = 'client'
}

// Message Types
export interface Message {
  id: number;
  appid: string;
  message: string;
  title: string;
  priority: number;
  extras?: Record<string, unknown>;
  date: string;
}

export interface PagedMessages {
  messages: Message[];
  paging: {
    since?: number;
    limit?: number;
    next?: string;
    size: number;
  };
}

// Application Types
export interface Application {
  id: number;
  name: string;
  description: string;
  internal: boolean;
  token: string;
  image: string;
}

// Client Types
export interface Client {
  id: number;
  name: string;
  token: string;
}

// Health Types
export interface Health {
  health: 'green' | 'yellow' | 'red';
  database: 'green' | 'yellow' | 'red';
}

// Version Types
export interface Version {
  version: string;
  buildDate: string;
  commit: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Error Types
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUTH_ERROR = 'AUTH_ERROR'
}

// Resource Types
export interface Resource {
  id: number;
  name: string;
  // Add resource properties
}

// Command Types
export interface Command {
  id: number;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  // Add command properties
}

// Stats Types
export interface Stats {
  appCount: number;
  clientCount: number;
  messageCount: number;
} 