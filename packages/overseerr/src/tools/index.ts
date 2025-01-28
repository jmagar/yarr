import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { OverseerrService } from '../service.js';

export function registerTools(server: McpServer, service: OverseerrService) {
  // Search Tools
  server.tool(
    "overseerr:search",
    "Search for movies and TV shows",
    {
      query: z.string().describe("Search query"),
      page: z.number().optional().describe("Page number")
    },
    async ({ query, page }) => {
      try {
        const results = await service.searchAll(query, { page });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              movies: results.movies.map(m => ({
                title: m.title,
                releaseDate: m.releaseDate,
                overview: m.overview
              })),
              tvShows: results.tvShows.map(t => ({
                name: t.name,
                firstAirDate: t.firstAirDate,
                overview: t.overview
              }))
            }, null, 2)
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

  // Request Tools
  server.tool(
    "overseerr:request",
    "Request a movie or TV show",
    {
      query: z.string().describe("Title to search for"),
      type: z.enum(['movie', 'tv']).describe("Media type"),
      autoApprove: z.boolean().optional().describe("Auto-approve the request"),
      seasons: z.array(z.number()).optional().describe("Season numbers to request (TV only)")
    },
    async ({ query, type, autoApprove, seasons }) => {
      try {
        const request = await service.findAndRequest({
          query,
          mediaType: type,
          autoApprove,
          seasons
        });

        return {
          content: [{
            type: "text",
            text: `Successfully ${autoApprove ? 'requested and approved' : 'requested'} ${type} "${query}" (ID: ${request.id})`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error making request: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "overseerr:list-requests",
    "List media requests",
    {
      status: z.enum(['pending', 'approved', 'declined', 'available']).describe("Request status to filter by"),
      take: z.number().optional().describe("Number of requests to return"),
      skip: z.number().optional().describe("Number of requests to skip")
    },
    async ({ status, take, skip }) => {
      try {
        const requests = await service.getRequestsByStatus(status, { take, skip });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(requests.map(r => ({
              id: r.id,
              type: r.type,
              status: r.status,
              requestedBy: r.requestedBy.username || r.requestedBy.email,
              createdAt: r.createdAt
            })), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing requests: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "overseerr:update-request",
    "Update request status",
    {
      requestId: z.number().describe("Request ID to update"),
      status: z.enum(['approved', 'declined']).describe("New status")
    },
    async ({ requestId, status }) => {
      try {
        const request = await service.getApi().updateRequest(requestId, status);
        return {
          content: [{
            type: "text",
            text: `Successfully ${status} request ${requestId}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error updating request: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Discovery Tools
  server.tool(
    "overseerr:trending",
    "Get trending media with recommendations",
    {
      type: z.enum(['movie', 'tv']).describe("Media type"),
      page: z.number().optional().default(1).describe("Page number")
    },
    async ({ type, page }) => {
      try {
        const results = await service.getTrendingWithRecommendations(type, page);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              trending: results.trending.results.map(r => ({
                title: 'title' in r ? r.title : r.name,
                overview: r.overview,
                popularity: r.popularity
              })),
              recommendations: results.recommendations.map(rec => 
                rec.results.slice(0, 5).map(r => ({
                  title: 'title' in r ? r.title : r.name,
                  overview: r.overview
                }))
              )
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting trending media: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "overseerr:available",
    "Get popular available media",
    {
      type: z.enum(['movie', 'tv']).describe("Media type"),
      page: z.number().optional().default(1).describe("Page number")
    },
    async ({ type, page }) => {
      try {
        const results = await service.getPopularAvailable(type, page);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results.results.map(r => ({
              title: 'title' in r ? r.title : r.name,
              overview: r.overview,
              popularity: r.popularity
            })), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting available media: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Status Tools
  server.tool(
    "overseerr:status",
    "Get system status",
    {},
    async () => {
      try {
        const status = await service.getApi().getStatus();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              version: status.version,
              commitTag: status.commitTag,
              updateAvailable: status.updateAvailable,
              commitsBehind: status.commitsBehind
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error getting status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );
} 