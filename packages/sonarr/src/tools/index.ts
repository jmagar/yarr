import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { SonarrService } from '../service.js';

export function registerTools(server: McpServer, service: SonarrService) {
  // Series management tools
  server.tool(
    "sonarr:search",
    "Search for TV shows",
    {
      query: z.string().describe("Search query")
    },
    async ({ query }) => {
      try {
        const results = await service.search(query);
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
    "sonarr:list-series",
    "List all monitored TV series",
    {},
    async () => {
      try {
        const series = await service.getAllSeries();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(series, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing series: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "sonarr:series-details",
    "Get detailed information about a series",
    {
      seriesId: z.number().describe("Series ID")
    },
    async ({ seriesId }) => {
      try {
        const details = await service.getSeriesDetails(seriesId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(details, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting series details: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "sonarr:add-series",
    "Add a new series to monitor",
    {
      tvdbId: z.number().describe("TVDB ID of the series"),
      path: z.string().describe("Path where series files will be stored"),
      qualityProfileId: z.number().describe("Quality profile ID to use"),
      languageProfileId: z.number().describe("Language profile ID to use"),
      seasonFolder: z.boolean().optional().describe("Use season folders"),
      monitored: z.boolean().optional().describe("Monitor series for new episodes"),
      searchForMissingEpisodes: z.boolean().optional().describe("Search for missing episodes")
    },
    async ({ tvdbId, ...options }) => {
      try {
        const series = await service.addSeries(tvdbId, options);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(series, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error adding series: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Season management tools
  server.tool(
    "sonarr:monitor-season",
    "Monitor or unmonitor a season",
    {
      seriesId: z.number().describe("Series ID"),
      seasonNumber: z.number().describe("Season number"),
      monitored: z.boolean().describe("Monitor status")
    },
    async ({ seriesId, seasonNumber, monitored }) => {
      try {
        await service.monitorSeason(seriesId, seasonNumber, monitored);
        return {
          content: [{
            type: "text",
            text: `Successfully ${monitored ? 'monitored' : 'unmonitored'} season ${seasonNumber}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error updating season: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Profile management tools
  server.tool(
    "sonarr:list-profiles",
    "List quality and language profiles",
    {},
    async () => {
      try {
        const [quality, language] = await Promise.all([
          service.getQualityProfiles(),
          service.getLanguageProfiles()
        ]);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ quality, language }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting profiles: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Calendar tools
  server.tool(
    "sonarr:upcoming",
    "Get upcoming episodes",
    {
      days: z.number().optional().describe("Number of days to look ahead (default: 7)")
    },
    async ({ days }) => {
      try {
        const episodes = await service.getUpcomingEpisodes(days);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(episodes, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting upcoming episodes: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Queue management tools
  server.tool(
    "sonarr:queue",
    "Get current download queue",
    {},
    async () => {
      try {
        const queue = await service.getQueue();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(queue, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting queue: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "sonarr:remove-from-queue",
    "Remove an item from the download queue",
    {
      id: z.number().describe("Queue item ID"),
      blacklist: z.boolean().optional().describe("Blacklist the release (default: false)")
    },
    async ({ id, blacklist }) => {
      try {
        await service.removeFromQueue(id, blacklist);
        return {
          content: [{
            type: "text",
            text: `Successfully removed item ${id} from queue`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error removing from queue: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
} 