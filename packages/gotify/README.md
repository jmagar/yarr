# Service Template

This is a template for adding new services to the Media-MCP project. Follow this guide to integrate your service.

## Quick Start

1. Copy this template:
```bash
cp -r docs/new-service-template packages/your-service
cd packages/your-service
```

2. Update package name in `package.json`:
```json
{
  "name": "@media-mcp/your-service"
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

## Implementation Checklist

### 1. Types (`src/types.ts`)
- [ ] Define service configuration interface
- [ ] Define API response types
- [ ] Define resource types
- [ ] Define command/operation types
- [ ] Define statistics/metrics types
- [ ] Export all types

### 2. API Client (`src/api.ts`)
- [ ] Implement base request method with error handling
- [ ] Add resource management methods (CRUD)
- [ ] Add command/operation methods
- [ ] Add statistics/metrics methods
- [ ] Handle rate limiting
- [ ] Handle authentication
- [ ] Handle pagination

### 3. Service Layer (`src/service.ts`)
- [ ] Implement service class with API client
- [ ] Add resource management methods
- [ ] Add command/operation methods
- [ ] Add statistics/metrics methods
- [ ] Add enhanced operations combining multiple API calls
- [ ] Add error handling and retries
- [ ] Add data transformation/formatting

### 4. Tools (`src/tools/index.ts`)
- [ ] Implement tool registration function
- [ ] Add resource management tools
- [ ] Add command/operation tools
- [ ] Add statistics/metrics tools
- [ ] Add enhanced operation tools
- [ ] Add proper error handling
- [ ] Add descriptive help text
- [ ] Add parameter validation

### 5. Integration
- [ ] Update root package.json
- [ ] Update server package.json
- [ ] Update server index.ts
- [ ] Add environment variables
- [ ] Test all tools

## API Integration

### Authentication
- API Key in headers: `X-Api-Key`
- Bearer token: `Authorization: Bearer <token>`
- Basic auth: `Authorization: Basic <base64>`
- Custom headers: `X-Custom-Header: value`

### Rate Limiting
```typescript
class RateLimiter {
  private lastRequest = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async acquire() {
    const now = Date.now();
    const wait = this.lastRequest + this.minInterval - now;
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }
    this.lastRequest = Date.now();
  }
}

// Usage in API client
private rateLimiter = new RateLimiter(2); // 2 requests per second

async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await this.rateLimiter.acquire();
  // ... rest of request code
}
```

### Pagination
```typescript
async getAllPages<T>(endpoint: string): Promise<T[]> {
  let page = 1;
  const results: T[] = [];
  
  while (true) {
    const response = await this.request<{
      items: T[];
      totalPages: number;
    }>(`${endpoint}?page=${page}`);
    
    results.push(...response.items);
    
    if (page >= response.totalPages) break;
    page++;
  }
  
  return results;
}
```

### Error Handling
```typescript
// API Errors
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_ERROR = 'AUTH_ERROR'
}

// Error with context
throw new ServiceError(
  ErrorCode.RATE_LIMIT,
  'Rate limit exceeded',
  {
    retryAfter: response.headers.get('Retry-After'),
    limit: response.headers.get('X-RateLimit-Limit')
  }
);

// Error handling in tools
try {
  // ... operation
} catch (error) {
  if (error instanceof ServiceError) {
    switch (error.code) {
      case ErrorCode.RATE_LIMIT:
        return {
          content: [{
            type: "text",
            text: `Rate limit exceeded. Try again in ${error.context.retryAfter} seconds.`
          }],
          isError: true
        };
      // ... handle other error types
    }
  }
  // ... handle unknown errors
}
```

## Tool Design

### Naming Convention
- Use format: `service:category:action`
- Examples:
  - `service:resources:list`
  - `service:resources:get`
  - `service:commands:execute`
  - `service:stats:get`

### Parameter Validation
```typescript
// Simple parameter
{
  id: z.number().describe("Resource ID")
}

// Complex parameters
{
  filter: z.object({
    status: z.enum(['active', 'inactive']).describe("Filter by status"),
    type: z.enum(['type1', 'type2']).optional().describe("Filter by type"),
    tags: z.array(z.string()).optional().describe("Filter by tags")
  }).describe("Filter options")
}

// Date ranges
{
  start: z.string().datetime().describe("Start date (ISO 8601)"),
  end: z.string().datetime().optional().describe("End date (ISO 8601)")
}
```

### Response Formatting
```typescript
// Success response
return {
  content: [{
    type: "text",
    text: JSON.stringify(result, null, 2)
  }]
};

// Error response
return {
  content: [{
    type: "text",
    text: `Error: ${error.message}`
  }],
  isError: true
};

// Progress response
return {
  content: [{
    type: "text",
    text: `Operation started. Use 'service:commands:status ${commandId}' to check progress.`
  }]
};
```

## Testing

### Unit Tests
```typescript
// API client tests
describe('ServiceApi', () => {
  it('should handle rate limiting', async () => {
    // Test implementation
  });
});

// Service layer tests
describe('Service', () => {
  it('should combine multiple API calls', async () => {
    // Test implementation
  });
});

// Tool tests
describe('Tools', () => {
  it('should handle errors properly', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```bash
# Start test server
pnpm test:server

# Run integration tests
pnpm test:integration

# Test specific tool
npx @wong2/mcp-cli node packages/server/dist/index.js
```

## Debugging

### Tool Debugging
```typescript
const DEBUG = process.env.DEBUG === '1';

function debug(...args: any[]) {
  if (DEBUG) console.error(...args);
}

server.tool(
  "service:operation",
  "Description",
  { /* params */ },
  async (params) => {
    debug('Params:', params);
    try {
      const result = await service.operation(params);
      debug('Result:', result);
      return { /* ... */ };
    } catch (error) {
      debug('Error:', error);
      throw error;
    }
  }
);
```

### API Debugging
```typescript
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  debug('Request:', {
    url: `${this.config.url}/api/v1${endpoint}`,
    options
  });

  const response = await fetch(/* ... */);
  
  debug('Response:', {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.clone().text()
  });

  // ... rest of request code
}
```

## Common Issues

### Module Resolution
- Always use `.js` extension in imports
- Use proper path aliases in tsconfig.json
- Check package.json exports field

### Type Exports
- Use `export type` for type-only exports
- Use proper type imports
- Check tsconfig.json settings

### Tool Parameters
- Always include parameter descriptions
- Use proper zod types
- Handle optional parameters

### Rate Limiting
- Implement proper rate limiting
- Handle rate limit errors
- Use exponential backoff

### Authentication
- Handle token expiration
- Refresh tokens when needed
- Secure API key storage 