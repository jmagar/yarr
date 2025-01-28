// Configuration
export interface ServiceConfig {
  url: string;
  apiKey: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
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

// Statistics Types
export interface Stats {
  total: number;
  active: number;
  // Add stats properties
} 