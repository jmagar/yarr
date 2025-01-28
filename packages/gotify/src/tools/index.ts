import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { GotifyService } from '../service.js';

export function registerTools(server: McpServer, service: GotifyService) {
  console.error('Starting Gotify tools registration...');

  // Message Tools
  console.error('Registering message tools...');
  server.tool(
    "gotify:messages:list",
    "List messages with optional pagination",
    {
      limit: z.number().optional().describe("Maximum number of messages to return"),
      since: z.number().optional().describe("Return messages after this message ID")
    },
    async ({ limit, since }) => {
      console.error('Executing gotify:messages:list with:', { limit, since });
      try {
        const messages = await service.getMessages(limit, since);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(messages, null, 2)
          }]
        };
      } catch (error) {
        console.error('Error in gotify:messages:list:', error);
        return {
          content: [{
            type: "text",
            text: `Error listing messages: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:messages:send",
    "Send a new message",
    {
      message: z.string().describe("Message content"),
      title: z.string().optional().describe("Message title"),
      priority: z.number().min(0).max(10).optional().describe("Message priority (0-10)"),
      extras: z.record(z.unknown()).optional().describe("Additional message metadata")
    },
    async ({ message, title, priority, extras }) => {
      try {
        const result = await service.sendMessage(message, { title, priority, extras });
        return {
          content: [{
            type: "text",
            text: `Message sent successfully with ID: ${result.id}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:messages:delete",
    "Delete a message by ID",
    {
      id: z.number().describe("Message ID to delete")
    },
    async ({ id }) => {
      try {
        await service.deleteMessage(id);
        return {
          content: [{
            type: "text",
            text: `Message ${id} deleted successfully`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error deleting message: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:messages:cleanup",
    "Delete messages older than specified days",
    {
      days: z.number().min(1).describe("Delete messages older than this many days")
    },
    async ({ days }) => {
      try {
        await service.cleanupOldMessages(days);
        return {
          content: [{
            type: "text",
            text: `Successfully cleaned up messages older than ${days} days`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error cleaning up messages: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Application Tools
  server.tool(
    "gotify:apps:list",
    "List all applications",
    {},
    async () => {
      try {
        const apps = await service.getApplications();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(apps, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing applications: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:apps:create",
    "Create a new application",
    {
      name: z.string().describe("Application name"),
      description: z.string().describe("Application description"),
      imageUrl: z.string().url().optional().describe("URL of the application image")
    },
    async ({ name, description, imageUrl }) => {
      try {
        const app = imageUrl
          ? await service.createApplicationWithImage(name, description, imageUrl)
          : await service.createApplication(name, description);

        return {
          content: [{
            type: "text",
            text: `Application created successfully with ID: ${app.id}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating application: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Client Tools
  server.tool(
    "gotify:clients:list",
    "List all clients",
    {},
    async () => {
      try {
        const clients = await service.getClients();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(clients, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing clients: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:clients:create",
    "Create a new client",
    {
      name: z.string().describe("Client name")
    },
    async ({ name }) => {
      try {
        const client = await service.createClient(name);
        return {
          content: [{
            type: "text",
            text: `Client created successfully with ID: ${client.id} and token: ${client.token}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating client: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Health & Stats Tools
  server.tool(
    "gotify:health",
    "Check Gotify server health",
    {},
    async () => {
      try {
        const [health, version] = await Promise.all([
          service.getHealth(),
          service.getVersion()
        ]);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ health, version }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error checking health: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "gotify:stats",
    "Get Gotify statistics",
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

  console.error('Finished registering Gotify tools');
} 