# API Gateway Implementation Guide

## Overview
Based on our working services (Sonarr, Prowlarr, Overseerr, Gotify), this guide shows exactly how to:
1. Create the API gateway service
2. Integrate existing service APIs
3. Generate MCP tools from typed APIs

## Phase 1: Gateway Service Implementation

### 1.1 Base Service Structure
```typescript
// packages/api-gateway/src/service.ts
import { ApiClient } from './api/client';
import { ServiceConfig, RouteDefinition } from './api/types';

export class GatewayService {
  private clients: Map<string, ApiClient>;
  private routes: Map<string, RouteDefinition[]>;

  constructor() {
    this.clients = new Map();
    this.routes = new Map();
  }

  // Register a service's API client and routes
  registerService(name: string, config: ServiceConfig) {
    const client = new ApiClient(config);
    this.clients.set(name, client);
    
    // Get routes from service
    const routes = config.routes;
    this.routes.set(name, routes);
  }

  // Proxy request to appropriate service
  async handleRequest(serviceName: string, path: string, method: string, body?: any) {
    const client = this.clients.get(serviceName);
    if (!client) throw new Error(`Service ${serviceName} not found`);

    return client.request(path, { method, body });
  }
}
```

### 1.2 API Client Implementation
```typescript
// packages/api-gateway/src/api/client.ts
import { ServiceConfig, RequestOptions } from './types';

export class ApiClient {
  constructor(private config: ServiceConfig) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.url}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 1.3 Route Handling
```typescript
// packages/api-gateway/src/api/routes.ts
import express from 'express';
import { GatewayService } from '../service';

export function createRouter(gateway: GatewayService) {
  const router = express.Router();

  // Route pattern from our working services
  router.all('/api/:service/*', async (req, res) => {
    try {
      const { service } = req.params;
      const path = req.path.replace(`/api/${service}`, '');
      
      const response = await gateway.handleRequest(
        service,
        path,
        req.method,
        req.body
      );

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
```

## Phase 2: Service Integration

### 2.1 Service Registration
```typescript
// packages/api-gateway/src/index.ts
import { GatewayService } from './service';
import { createRouter } from './api/routes';
import express from 'express';

// Import existing services
import { SonarrService } from '@media-mcp/sonarr';
import { ProwlarrService } from '@media-mcp/prowlarr';
import { OverseerrService } from '@media-mcp/overseerr';
import { GotifyService } from '@media-mcp/gotify';

const app = express();
const gateway = new GatewayService();

// Register services using their existing clients
const sonarr = new SonarrService({
  url: process.env.SONARR_URL!,
  apiKey: process.env.SONARR_API_KEY!
});

gateway.registerService('sonarr', {
  url: sonarr.config.url,
  apiKey: sonarr.config.apiKey,
  routes: sonarr.routes
});

// Add router
app.use(createRouter(gateway));

app.listen(3000);
```

## Phase 3: MCP Tool Generation

### 3.1 Tool Registration
```typescript
// packages/api-gateway/src/tools/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GatewayService } from '../service';

export function registerTools(server: McpServer, gateway: GatewayService) {
  // Register a tool for each service route
  for (const [service, routes] of gateway.routes) {
    for (const route of routes) {
      server.tool(
        `${service}:${route.name}`,
        route.description,
        route.parameters,
        async (params) => {
          return gateway.handleRequest(
            service,
            route.path,
            route.method,
            params
          );
        }
      );
    }
  }
}
```

## Implementation Status

### Working Services
```typescript
// ✅ - Ready for integration
// 🟡 - Needs updates
// ❌ - Not started

// Sonarr ✅
// - Has typed API client
// - Has route definitions
// - Has MCP tools

// Prowlarr ✅
// - Has typed API client
// - Has route definitions
// - Has MCP tools

// Overseerr ✅
// - Has typed API client
// - Has route definitions
// - Has MCP tools

// Gotify ✅
// - Has typed API client
// - Has route definitions
// - Has MCP tools
```

### Integration Steps
1. Copy this implementation
2. Register each service
3. Test API access
4. Verify MCP tools
5. Add remaining services

## Testing
```bash
# Test direct API access
curl http://localhost:3000/api/sonarr/series

# Test MCP tool generation
mcp-cli inspect http://localhost:3000
```
