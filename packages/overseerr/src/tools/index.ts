import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { OverseerrService } from '../service.js';
import { RequestStatus } from '../types.js';

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
        const formattedText = [
          'Search Results:',
          '',
          results.movies.length ? 'Movies:' : '',
          ...results.movies.map(m => 
            `- ${m.title} (${m.releaseDate?.split('-')[0] || 'N/A'})\n  ${m.overview}`
          ),
          results.movies.length ? '' : '',
          results.tvShows.length ? 'TV Shows:' : '',
          ...results.tvShows.map(t => 
            `- ${t.name} (${t.firstAirDate?.split('-')[0] || 'N/A'})\n  ${t.overview}`
          )
        ].join('\n');

        return {
          content: [{
            type: "text",
            text: formattedText
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

  // List requests
  server.tool(
    'overseerr:requests:list',
    'List media requests',
    {
      take: z.number().optional(),
      skip: z.number().optional(),
      filter: z.enum(['pending', 'approved', 'declined', 'available'] as const).optional(),
      sort: z.string().optional(),
      requestedBy: z.number().optional()
    },
    async (params) => {
      const requests = await service.getRequests(params);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(requests, null, 2)
        }]
      };
    }
  );

  // Get request details
  server.tool(
    'overseerr:requests:get',
    'Get request details',
    {
      requestId: z.number()
    },
    async ({ requestId }) => {
      const request = await service.getRequest(requestId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(request, null, 2)
        }]
      };
    }
  );

  // Update request status
  server.tool(
    'overseerr:requests:update-status',
    'Update request status',
    {
      requestId: z.number(),
      status: z.enum(['pending', 'approved', 'declined', 'available'] as const)
    },
    async ({ requestId, status }) => {
      const request = await service.updateRequestStatus(requestId, status);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(request, null, 2)
        }]
      };
    }
  );

  // Delete request
  server.tool(
    'overseerr:requests:delete',
    'Delete request',
    {
      requestId: z.number()
    },
    async ({ requestId }) => {
      await service.deleteRequest(requestId);
      return {
        content: [{
          type: 'text',
          text: `Request ${requestId} deleted successfully`
        }]
      };
    }
  );

  // Get requests by status
  server.tool(
    'overseerr:requests:by-status',
    'Get requests by status',
    {
      status: z.enum(['pending', 'approved', 'declined', 'available'] as const)
    },
    async ({ status }) => {
      const requests = await service.getRequestsByStatus(status);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(requests, null, 2)
        }]
      };
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
        const status = await service.getSystemStatus();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              version: status.version,
              healthy: status.healthy,
              pendingRequestCount: status.pendingRequestCount,
              availableMovies: status.availableMovies,
              availableSeries: status.availableSeries
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
