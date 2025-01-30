# Service Template

This is a template for adding new services to the Media-MCP project. Follow this guide to integrate your service.

## Quick Start

1. Copy the template:
```bash
cp -r docs/new-service-template packages/your-service
cd packages/your-service
```

2. Update package name in `package.json`:
```json
{
  "name": "@media-mcp/your-service",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@media-mcp/shared": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.4.1",
    "dotenv": "^16.4.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.12.0",
    "@typescript-eslint/eslint-plugin": "^8.22.0",
    "@typescript-eslint/parser": "^8.22.0",
    "eslint": "^9.19.0",
    "prettier": "^3.4.2",
    "typescript": "^5.7.3"
  }
}
```

3. Add environment variables to root `.env`:
```bash
YOUR_SERVICE_URL=http://localhost:1234
YOUR_SERVICE_API_KEY=your_api_key_here
```

4. Add service to root `package.json`:
```json
{
  "scripts": {
    "build:services": "pnpm --filter @media-mcp/prowlarr --filter @media-mcp/sonarr --filter @media-mcp/your-service build"
  }
}
```

## Implementation Guide

### 1. Types (`src/types.ts`)

Define your service types following these patterns:

```typescript
/**
 * Configuration interface for the service
 */
export interface ServiceConfig {
  url: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitPerSecond?: number;
}

/**
 * Common response fields shared across all responses
 */
export interface BaseResponse {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resource response interface
 */
export interface ResourceResponse extends BaseResponse {
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Command response interface
 */
export interface CommandResponse extends BaseResponse {
  command: string;
  parameters: Record<string, unknown>;
  progress: number;
  message: string;
  startTime: string;
  endTime?: string;
  error?: string;
}

/**
 * Statistics response interface
 */
export interface StatsResponse {
  totalResources: number;
  activeResources: number;
  lastUpdate: string;
  metrics: {
    requestCount: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  };
  resourceStats: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    timestamp: string;
    duration: number;
    metadata?: Record<string, unknown>;
  }>;
  resources: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

/**
 * Common query parameters
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  status?: string[];
  type?: string[];
  tags?: string[];
  search?: string;
  from?: string;
  to?: string;
  includeDisabled?: boolean;
  fields?: string[];
}
```

### 2. API Client (`src/api.ts`)

Implement your API client with these features:

1. Rate Limiting
2. Retry Logic
3. Error Handling
4. Request Timeout
5. Query Parameter Handling

```typescript
export class ServiceApi {
  private lastRequest = 0;
  private readonly minInterval: number;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRateLimit = 2;

  constructor(private config: ServiceConfig) {
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
      } catch (error) {
        lastError = error as Error;
        if (error instanceof ServiceError) {
          if (error.code === 'RATE_LIMIT') {
            const retryAfter = parseInt((error.context?.retryAfter as string) ?? '1');
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          if (['AUTHENTICATION_ERROR', 'VALIDATION_ERROR'].includes(error.code)) {
            throw error;
          }
        }
        if (attempt < attempts) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000))
          );
        }
      }
    }
    throw lastError;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    query?: QueryParams
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(`${this.config.url}/api/v1${endpoint}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v.toString()));
          } else {
            url.searchParams.set(key, value.toString());
          }
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
        ...options,
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      });

      // Handle various response statuses
      if (!response.ok) {
        // ... error handling implementation
      }

      return response.json();
    } catch (error) {
      // ... error handling implementation
    } finally {
      clearTimeout(timeout);
    }
  }

  // Implement your API methods here
}
```

### 3. Service Layer (`src/service.ts`)

Implement your service layer with these features:

1. Enhanced Resource Management
2. Command Operations
3. Statistics & Health Monitoring
4. Data Validation
5. Data Transformation

```typescript
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

  // Resource Management
  async getResourcesWithMetadata(query?: QueryParams): Promise<ResourceResponse[]> {
    const resources = await this.api.getResources(query);
    return resources.map(resource => this.enrichResourceData(resource));
  }

  // Command Operations
  async executeCommandWithValidation(
    command: string, 
    params?: Record<string, unknown>
  ): Promise<CommandResponse> {
    this.validateCommand(command);
    if (params) {
      this.validateCommandParams(params);
    }
    const result = await this.api.executeCommand(command, params);
    return this.enrichCommandData(result);
  }

  // Statistics & Health
  async getEnhancedStats(query?: QueryParams): Promise<StatsResponse & { computed: any }> {
    const [stats, health] = await Promise.all([
      this.api.getStats(query),
      this.api.getHealth()
    ]);
    return this.enrichStatsData(stats, health);
  }

  // Validation Methods
  protected validateResourceData(data: Partial<ResourceResponse>): void {
    // ... validation implementation
  }

  // Helper Methods
  protected enrichResourceData(resource: ResourceResponse): ResourceResponse & { metadata: any } {
    // ... data enrichment implementation
  }
}
```

### 4. Tools (`src/tools/index.ts`)

Implement your tools with these features:

1. Common Parameter Schemas
2. Response Formatting
3. Error Handling
4. Input Validation
5. Enhanced Responses

```typescript
// Common tool response types
interface ToolResponse {
  content: Array<{
    type: "text" | "error" | "success" | "warning" | "info";
    text: string;
  }>;
  isError?: boolean;
}

// Common parameter schemas
const commonParameters = {
  limit: z.number().min(1).max(100).optional().describe("Number of items to return"),
  offset: z.number().min(0).optional().describe("Number of items to skip"),
  sort: z.string().optional().describe("Sort field"),
  order: z.enum(['asc', 'desc']).optional().describe("Sort order"),
  filter: z.record(z.unknown()).optional().describe("Filter criteria")
};

export function registerTools(server: McpServer, service: Service) {
  // Resource Management Tools
  server.tool(
    "service:resources:list",
    "List all resources with metadata",
    {
      ...commonParameters,
      status: z.array(z.string()).optional().describe("Filter by status"),
      type: z.array(z.string()).optional().describe("Filter by type"),
      tags: z.array(z.string()).optional().describe("Filter by tags")
    },
    async (params) => {
      try {
        const resources = await service.getResourcesWithMetadata(params);
        return formatToolResponse(resources);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // ... implement other tools
}
```

## Testing

Add these test files to your service:

1. `src/__tests__/api.test.ts`
2. `src/__tests__/service.test.ts`
3. `src/__tests__/tools.test.ts`

Follow this testing pattern:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Service } from '../service.js';
import { ServiceApi } from '../api.js';

describe('Service', () => {
  const mockConfig = {
    url: 'http://localhost:1234',
    apiKey: 'test-key',
    timeout: 5000,
    retryAttempts: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle successful requests', async () => {
    const service = new Service(mockConfig);
    // Add your tests
  });

  it('should handle errors properly', async () => {
    // Add error handling tests
  });

  it('should validate inputs', async () => {
    // Add validation tests
  });

  it('should enrich response data', async () => {
    // Add data transformation tests
  });
});
```

## Integration

1. Add your service to the server's service registry
2. Add environment variables to templates
3. Update documentation
4. Add integration tests
5. Test all tools with the MCP CLI 

# Tool Creation Guide

## Tool Patterns

When creating tools for your service, follow these patterns:

### 1. Naming Convention

Tools should follow this naming pattern:
```typescript
"service:<category>:<action>"
```

Examples:
- `service:resources:list`
- `service:command:execute`
- `service:health:check`

### 2. Tool Structure

Each tool should have:
1. A unique identifier
2. A clear description
3. Parameter schema using Zod
4. Handler function with error handling

```typescript
server.tool(
  "service:resources:list",           // Identifier
  "List all resources with metadata", // Description
  {                                  // Parameter Schema
    ...commonParameters,
    status: z.array(z.string()).optional().describe("Filter by status"),
    type: z.array(z.string()).optional().describe("Filter by type")
  },
  async (params, _extra) => {        // Handler
    try {
      const result = await service.someOperation(params);
      return formatToolResponse(result);
    } catch (error) {
      return formatErrorResponse(error);
    }
  }
);
```

### 3. Common Parameters

Use these standard parameter patterns:

```typescript
const commonParameters = {
  // Pagination
  limit: z.number().min(1).max(100).optional()
    .describe("Number of items to return"),
  offset: z.number().min(0).optional()
    .describe("Number of items to skip"),
  
  // Sorting
  sort: z.string().optional()
    .describe("Sort field"),
  order: z.enum(['asc', 'desc']).optional()
    .describe("Sort order"),
  
  // Filtering
  filter: z.record(z.unknown()).optional()
    .describe("Filter criteria"),
  
  // Common Options
  includeDisabled: z.boolean().optional()
    .describe("Include disabled items"),
  fields: z.array(z.string()).optional()
    .describe("Fields to return")
};
```

### 4. Response Formatting

Always use the standard response formatters:

```typescript
function formatToolResponse(
  data: unknown, 
  type: "text" | "error" | "success" | "warning" | "info" = "text"
): ToolResponse {
  return {
    content: [{
      type: "text",
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }],
    isError: type === "error"
  };
}

function formatErrorResponse(error: unknown): ToolResponse {
  return formatToolResponse(
    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    "error"
  );
}
```

### 5. Tool Categories

Organize tools into these standard categories:

1. **Resource Management**
   ```typescript
   // List resources
   server.tool("service:resources:list", ...);
   
   // Get resource details
   server.tool("service:resources:get", ...);
   
   // Create resource
   server.tool("service:resources:create", ...);
   
   // Update resource
   server.tool("service:resources:update", ...);
   
   // Delete resource
   server.tool("service:resources:delete", ...);
   ```

2. **Command Operations**
   ```typescript
   // Execute command
   server.tool("service:command:execute", ...);
   
   // Check command status
   server.tool("service:command:status", ...);
   ```

3. **Statistics & Health**
   ```typescript
   // Get statistics
   server.tool("service:stats:get", ...);
   
   // Check health
   server.tool("service:health:check", ...);
   ```

4. **Utility Tools**
   ```typescript
   // Validate configuration
   server.tool("service:validate", ...);
   
   // Test connection
   server.tool("service:test", ...);
   ```

### 6. Error Handling

Implement consistent error handling:

```typescript
try {
  // Operation
  const result = await service.someOperation();
  return formatToolResponse(result);
} catch (error) {
  if (error instanceof ServiceError) {
    // Handle known errors
    return formatErrorResponse(error);
  }
  // Handle unknown errors
  return formatErrorResponse(new Error('Unknown error occurred'));
}
```

### 7. Parameter Validation

Use Zod for robust parameter validation:

```typescript
const schema = {
  // Required parameters
  name: z.string().min(2).max(100)
    .describe("Resource name"),
  
  // Optional parameters with defaults
  enabled: z.boolean().default(true)
    .describe("Whether the resource is enabled"),
  
  // Enums
  status: z.enum(['active', 'inactive', 'error'])
    .describe("Resource status"),
  
  // Arrays
  tags: z.array(z.string()).optional()
    .describe("Resource tags"),
  
  // Nested objects
  settings: z.object({
    key: z.string(),
    value: z.unknown()
  }).optional().describe("Resource settings")
};
```

### 8. Testing Tools

Create test cases for each tool:

```typescript
describe('Resource Tools', () => {
  const service = new Service(mockConfig);
  
  it('should list resources', async () => {
    const result = await tools["service:resources:list"](
      { limit: 10 },
      mockExtra
    );
    expect(result.content[0].text).toContain('"resources":');
  });
  
  it('should handle errors', async () => {
    const result = await tools["service:resources:get"](
      { id: -1 },
      mockExtra
    );
    expect(result.isError).toBe(true);
  });
});
```

### 9. Documentation

Document each tool with:
1. Purpose
2. Parameters
3. Response format
4. Examples
5. Error cases

Example:
```typescript
/**
 * List resources with optional filtering and pagination
 * 
 * @param {Object} params
 * @param {number} [params.limit=100] - Maximum number of items to return
 * @param {number} [params.offset=0] - Number of items to skip
 * @param {string[]} [params.status] - Filter by status
 * @param {string[]} [params.type] - Filter by type
 * @param {string[]} [params.tags] - Filter by tags
 * 
 * @returns {Promise<ToolResponse>} List of resources
 * 
 * @example
 * // List active resources
 * const result = await tools["service:resources:list"]({
 *   status: ["active"],
 *   limit: 10
 * });
 * 
 * @throws {ServiceError}
 * - VALIDATION_ERROR: Invalid parameters
 * - AUTHENTICATION_ERROR: Invalid API key
 * - API_ERROR: API request failed
 */
```

### 10. Best Practices

1. **Consistency**
   - Use standard naming conventions
   - Follow common parameter patterns
   - Use consistent response formats

2. **Validation**
   - Validate all input parameters
   - Use descriptive error messages
   - Include validation context

3. **Error Handling**
   - Catch and handle all errors
   - Provide meaningful error messages
   - Include error context when available

4. **Performance**
   - Implement pagination
   - Use efficient queries
   - Cache when appropriate

5. **Testing**
   - Test happy path
   - Test error cases
   - Test edge cases
   - Test parameter validation 