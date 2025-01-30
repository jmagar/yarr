import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { Service } from '../service.js';

/**
 * Common tool response types
 */
interface ToolContent {
  [key: string]: unknown;
  type: "text";
  text: string;
}

interface ToolResponse {
  [key: string]: unknown;
  content: ToolContent[];
  isError?: boolean;
}

/**
 * Response formatting utilities
 */
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

/**
 * Common parameter schemas
 */
const commonParameters = {
  limit: z.number().min(1).max(100).optional().describe("Number of items to return"),
  offset: z.number().min(0).optional().describe("Number of items to skip"),
  sort: z.string().optional().describe("Sort field"),
  order: z.enum(['asc', 'desc']).optional().describe("Sort order"),
  filter: z.record(z.unknown()).optional().describe("Filter criteria")
};

export function registerTools(server: McpServer, service: Service) {
  /**
   * Resource Management Tools
   */
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
        const resources = await service.getResourcesWithMetadata({
          page: params.offset && params.limit ? Math.floor(params.offset / params.limit) : undefined,
          pageSize: params.limit,
          sort: params.sort,
          order: params.order,
          status: params.status,
          type: params.type,
          tags: params.tags
        });
        return formatToolResponse(resources);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:resources:get",
    "Get detailed information about a specific resource",
    {
      id: z.number().describe("Resource ID"),
      includeMetadata: z.boolean().optional().describe("Include additional metadata")
    },
    async ({ id }) => {
      try {
        const resource = await service.getResourceDetails(id);
        return formatToolResponse(resource);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:resources:create",
    "Create a new resource",
    {
      name: z.string().min(2).max(100).describe("Resource name"),
      type: z.string().describe("Resource type"),
      status: z.string().optional().describe("Initial status"),
      enabled: z.boolean().optional().describe("Whether the resource is enabled"),
      settings: z.record(z.unknown()).optional().describe("Resource settings"),
      tags: z.array(z.string()).optional().describe("Resource tags")
    },
    async (params) => {
      try {
        const resource = await service.createResourceWithValidation(params);
        return formatToolResponse(resource, "success");
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:resources:update",
    "Update an existing resource",
    {
      id: z.number().describe("Resource ID"),
      name: z.string().min(2).max(100).optional().describe("New resource name"),
      status: z.string().optional().describe("New status"),
      enabled: z.boolean().optional().describe("Enable/disable the resource"),
      settings: z.record(z.unknown()).optional().describe("Updated settings"),
      tags: z.array(z.string()).optional().describe("Updated tags")
    },
    async ({ id, ...data }) => {
      try {
        const resource = await service.updateResourceWithValidation(id, data);
        return formatToolResponse(resource, "success");
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:resources:delete",
    "Delete a resource",
    {
      id: z.number().describe("Resource ID"),
      force: z.boolean().optional().describe("Force deletion")
    },
    async ({ id, force }) => {
      try {
        await service.deleteResourceWithValidation(id);
        return formatToolResponse("Resource deleted successfully", "success");
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Command Operations Tools
   */
  server.tool(
    "service:command:execute",
    "Execute a command",
    {
      command: z.string().min(1).describe("Command to execute"),
      params: z.record(z.unknown()).optional().describe("Command parameters"),
      timeout: z.number().optional().describe("Command timeout in seconds"),
      async: z.boolean().optional().describe("Run command asynchronously")
    },
    async (args: {
      command: string;
      params?: Record<string, unknown>;
      timeout?: number;
      async?: boolean;
    }) => {
      try {
        const result = await service.executeCommandWithValidation(args.command, {
          ...args.params,
          timeout: args.timeout,
          async: args.async
        });
        return formatToolResponse(result);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:command:status",
    "Check command execution status",
    {
      id: z.number().describe("Command ID"),
      includeDetails: z.boolean().optional().describe("Include execution details")
    },
    async ({ id, includeDetails }) => {
      try {
        const status = await service.monitorCommandProgress(id);
        return formatToolResponse(status);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Statistics & Health Tools
   */
  server.tool(
    "service:stats:get",
    "Get enhanced service statistics",
    {
      ...commonParameters,
      period: z.string().optional().describe("Time period for stats"),
      metrics: z.array(z.string()).optional().describe("Specific metrics to include")
    },
    async (params) => {
      try {
        const stats = await service.getEnhancedStats({
          from: params.period ? new Date(params.period).toISOString() : undefined,
          sort: params.sort,
          order: params.order
        });
        return formatToolResponse(stats);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "service:health:check",
    "Check service health status",
    {
      timeout: z.number().optional().describe("Health check timeout in seconds"),
      includeMetrics: z.boolean().optional().describe("Include system metrics")
    },
    async ({ timeout, includeMetrics }) => {
      try {
        const health = await service.getFullHealthCheck();
        return formatToolResponse(health);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Utility Tools
   */
  server.tool(
    "service:validate",
    "Validate service configuration",
    {},
    async () => {
      try {
        const [health, stats] = await Promise.all([
          service.getFullHealthCheck(),
          service.getEnhancedStats()
        ]);

        return formatToolResponse({
          status: "success",
          health: health.status,
          resourceCount: stats.totalResources,
          lastValidated: new Date().toISOString()
        });
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );
} 