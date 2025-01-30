import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarrService } from "@media-mcp/radarr";
import { OverseerrService } from "@media-mcp/overseerr";
import { SonarrService } from "@media-mcp/sonarr";
import type { Series, Season } from "@media-mcp/sonarr";
import type { MovieResult as OverseerrMovieResult, TvResult as OverseerrTvResult } from "@media-mcp/overseerr";

// Define types for stats
interface SonarrStats {
  seriesCount: number;
  episodeCount: number;
  episodeFileCount: number;
  sizeOnDisk: number;
}

interface SeasonStats {
  episodeCount: number;
  episodeFileCount: number;
  sizeOnDisk: number;
}

// Define types for Radarr queue items
interface QueueItem {
  title: string;
  status: string;
  quality: {
    quality: {
      name: string;
    };
  };
}

// Define types for Sonarr queue items
interface SonarrQueueItem {
  series?: {
    title: string;
  };
  episode?: {
    episodeNumber: number;
    seasonNumber: number;
  };
  status: string;
  quality?: {
    quality?: {
      name: string;
    };
  };
}

// Initialize services
const radarr = new RadarrService({
  baseUrl: process.env.RADARR_URL || "http://localhost:7878",
  apiKey: process.env.RADARR_API_KEY || "",
});

const sonarr = new SonarrService({
  url: process.env.SONARR_URL || "http://localhost:8989",
  apiKey: process.env.SONARR_API_KEY || "",
});

const overseerr = new OverseerrService({
  url: process.env.OVERSEERR_URL || "http://localhost:5055",
  apiKey: process.env.OVERSEERR_API_KEY || "",
});

export function registerTools(server: McpServer) {
  // Integrated search tool that shows both movies and TV shows
  server.tool(
    "search_media",
    "Search for movies and TV shows using Overseerr",
    {
      query: z.string().describe("Title to search for"),
      type: z.enum(['all', 'movie', 'tv']).optional().describe("Type of media to search for")
    },
    async ({ query, type = 'all' }) => {
      try {
        const results = await overseerr.searchAll(query);
        let allResults = [];

        if (type === 'all' || type === 'movie') {
          allResults.push(...results.movies);
        }
        if (type === 'all' || type === 'tv') {
          allResults.push(...results.tvShows);
        }

        if (!allResults.length) {
          return {
            content: [{ type: "text", text: "No media found" }]
          };
        }

        const formattedResults = allResults.map((media: OverseerrMovieResult | OverseerrTvResult) => {
          const title = 'name' in media ? media.name : media.title;
          const releaseDate = 'firstAirDate' in media ? media.firstAirDate : media.releaseDate;
          
          return `
Title: ${title} (${releaseDate?.split('-')[0] || 'N/A'})
Type: ${media.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Series'}
ID: ${media.id}
Overview: ${media.overview}
Status: ${media.mediaInfo?.status === 5 ? 'Available' : 'Not Available'}
${media.mediaInfo?.status === 5 ? '✅ Available' : ''}
${media.mediaInfo?.status === 1 ? '⏳ Pending' : ''}
${media.mediaInfo?.status === 3 ? '⚙️ Processing' : ''}
---`;
        }).join('\n');

        return {
          content: [{ type: "text", text: formattedResults }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to search media: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Get all download queues in one view
  server.tool(
    "get_all_queues",
    "Get current download queues from both Radarr and Sonarr",
    {
      pageSize: z.number().optional().describe("Number of items to return per service"),
      page: z.number().optional().describe("Page number to return")
    },
    async ({ pageSize = 10, page = 1 }) => {
      try {
        const [radarrQueue, sonarrQueue] = await Promise.all([
          radarr.getQueue({ pageSize, page }),
          sonarr.getQueue()
        ]);

        let queueText = '';

        // Format Radarr queue
        if (radarrQueue.items?.length) {
          queueText += '\n🎬 Movies Queue:\n';
          queueText += radarrQueue.items.map((item: QueueItem) => `
Title: ${item.title}
Status: ${item.status}
Quality: ${item.quality.quality.name}
---`).join('\n');
        }

        // Format Sonarr queue
        if (sonarrQueue?.length) {
          queueText += '\n\n📺 TV Shows Queue:\n';
          queueText += sonarrQueue.map((item: SonarrQueueItem) => `
Series: ${item.series?.title || 'Unknown'}
Episode: ${item.episode?.episodeNumber ? `S${item.episode.seasonNumber}E${item.episode.episodeNumber}` : 'Unknown'}
Status: ${item.status}
Quality: ${item.quality?.quality?.name || 'Unknown'}
---`).join('\n');
        }

        if (!queueText) {
          queueText = 'No active downloads in either queue';
        }

        return {
          content: [{ type: "text", text: queueText }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to get queues: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Combined system status
  server.tool(
    "get_system_status",
    "Get system status from all services",
    {},
    async () => {
      try {
        const [radarrStatus, radarrStats, series, overseerrStatus] = await Promise.all([
          radarr.getSystemStatus(),
          radarr.getStats(),
          sonarr.getAllSeries(),
          overseerr.getSystemStatus()
        ]);

        // Calculate Sonarr stats
        const sonarrStats = series.reduce((stats: SonarrStats, series: Series) => {
          const seriesStats = series.seasons.reduce((seasonStats: SeasonStats, season: Season) => ({
            episodeCount: seasonStats.episodeCount + season.statistics.episodeCount,
            episodeFileCount: seasonStats.episodeFileCount + season.statistics.episodeFileCount,
            sizeOnDisk: seasonStats.sizeOnDisk + season.statistics.sizeOnDisk
          }), { episodeCount: 0, episodeFileCount: 0, sizeOnDisk: 0 });

          return {
            seriesCount: stats.seriesCount + 1,
            episodeCount: stats.episodeCount + seriesStats.episodeCount,
            episodeFileCount: stats.episodeFileCount + seriesStats.episodeFileCount,
            sizeOnDisk: stats.sizeOnDisk + seriesStats.sizeOnDisk
          };
        }, { seriesCount: 0, episodeCount: 0, episodeFileCount: 0, sizeOnDisk: 0 });

        const systemInfo = `
🎬 Radarr Status:
Version: ${radarrStatus.version}
Movie Count: ${radarrStats.movieCount}
Movies with Files: ${radarrStats.movieFileCount}
Movies Monitored: ${radarrStats.monitoredMovieCount}
Missing Movies: ${radarrStats.movieFileMissingCount}
Total Space Used: ${(radarrStats.sizeOnDisk / 1024 / 1024 / 1024).toFixed(2)} GB

📺 Sonarr Status:
Series Count: ${sonarrStats.seriesCount}
Episode Count: ${sonarrStats.episodeCount}
Episodes with Files: ${sonarrStats.episodeFileCount}
Total Space Used: ${(sonarrStats.sizeOnDisk / 1024 / 1024 / 1024).toFixed(2)} GB

🎯 Overseerr Status:
Version: ${overseerrStatus.version}
Total Requests: ${overseerrStatus.pendingRequestCount}
Available Movies: ${overseerrStatus.availableMovies}
Available Series: ${overseerrStatus.availableSeries}
`;
        
        return {
          content: [{ type: "text", text: systemInfo }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to get system status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  console.error("Registered Integration tools: search_media, get_all_queues, get_system_status");
} 