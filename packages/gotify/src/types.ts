// Configuration
export interface GotifyConfig {
  url: string;
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
  appid: number;
  message: string;
  title: string;
  priority: number;
  date: string;
  extras?: Record<string, unknown>;
}

export interface PagedMessages {
  messages: Message[];
  paging: {
    since?: number;
    limit?: number;
    size: number;
  };
}

// Application Types
export interface Application {
  id: number;
  name: string;
  description: string;
  token: string;
  internal: boolean;
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
  health: "green" | "yellow" | "red";
  database: "green" | "yellow" | "red";
}

// Version Types
export interface Version {
  version: string;
  commit: string;
  buildDate: string;
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
  messages: number;
  applications: number;
  clients: number;
} 