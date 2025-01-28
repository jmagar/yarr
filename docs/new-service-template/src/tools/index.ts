import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { Service } from '../service.js';

export function registerTools(server: McpServer, service: Service) {
  // Resource Management Tools
  server.tool(
    "service:list-resources",
    "List all resources",
    {},
    async () => {
      try {
        const resources = await service.getResources();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resources, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing resources: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "service:get-resource",
    "Get resource details",
    {
      id: z.number().describe("Resource ID")
    },
    async ({ id }) => {
      try {
        const resource = await service.getResource(id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resource, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting resource: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "service:create-resource",
    "Create a new resource",
    {
      name: z.string().describe("Resource name"),
      // Add other resource parameters
    },
    async ({ name, ...params }) => {
      try {
        const resource = await service.createResource({ name, ...params });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resource, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating resource: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Command Management Tools
  server.tool(
    "service:execute-command",
    "Execute a command",
    {
      name: z.string().describe("Command name"),
      // Add command parameters
    },
    async ({ name, ...params }) => {
      try {
        const command = await service.executeCommand({ name, ...params });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(command, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Statistics Tools
  server.tool(
    "service:stats",
    "Get service statistics",
    {},
    async () => {
      try {
        const stats = await service.getStats();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(stats, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting stats: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Enhanced Operation Tools
  server.tool(
    "service:enhanced-operation",
    "Perform enhanced operation on a resource",
    {
      resourceId: z.number().describe("Resource ID")
    },
    async ({ resourceId }) => {
      try {
        await service.enhancedOperation(resourceId);
        return {
          content: [{
            type: "text",
            text: "Enhanced operation completed successfully"
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error performing operation: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
} 