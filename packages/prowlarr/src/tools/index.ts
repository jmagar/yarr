import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { ProwlarrService } from '../service.js';

export function registerTools(server: McpServer, service: ProwlarrService) {
  server.tool(
    "prowlarr:search",
    "Search across all Prowlarr indexers",
    {
      query: z.string().describe("Search query"),
      type: z.enum(["search", "movie", "tv", "book", "audio", "other"])
        .optional()
        .describe("Type of search to perform"),
      categories: z.array(z.number())
        .optional()
        .describe("Optional category IDs to search within")
    },
    async ({ query, type, categories }) => {
      try {
        const results = await service.searchWithMetadata(query, type);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "prowlarr:list-indexers",
    "List all configured indexers and their categories",
    {},
    async () => {
      try {
        const indexers = await service.getIndexers();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(indexers, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing indexers: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "prowlarr:indexer-stats",
    "Get statistics about indexer performance",
    {
      indexerId: z.number().optional().describe("Optional specific indexer ID")
    },
    async ({ indexerId }) => {
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

  server.tool(
    "prowlarr:check-config",
    "Validate Prowlarr connection and configuration",
    {},
    async () => {
      try {
        const indexers = await service.getIndexers();
        const status = {
          activeIndexers: indexers.filter(i => i.enabled).length,
          totalIndexers: indexers.length,
          authentication: "Connected successfully",
          url: process.env.PROWLARR_URL
        };
        return {
          content: [{
            type: "text",
            text: JSON.stringify(status, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Configuration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
} 