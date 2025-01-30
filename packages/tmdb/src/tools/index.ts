import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { Service as TMDBService } from '../service.js';
import { Movie, TVShow, Genre } from '../types.js';

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

export function registerTools(server: McpServer, tmdb: TMDBService): void {
  // Search tools
  server.tool(
    "search_media",
    "Search for movies and TV shows",
    {
      query: z.string().describe("Search query"),
      type: z.enum(['all', 'movie', 'tv']).optional().describe("Type of media to search for"),
      page: z.number().optional().describe("Page number")
    },
    async ({ query, type = 'all', page = 1 }) => {
      try {
        const results = await tmdb.searchAll(query, {
          page,
          includeMovies: type === 'all' || type === 'movie',
          includeTVShows: type === 'all' || type === 'tv'
        });

        const formattedResults = await Promise.all([
          ...results.movies.map(async (movie) => {
            const images = await tmdb.getImageUrls(movie);
            return `
🎬 Movie: ${movie.title} (${movie.release_date?.split('-')[0] || 'TBA'})
ID: ${movie.id}
Rating: ⭐ ${movie.vote_average.toFixed(1)} (${movie.vote_count} votes)
Overview: ${movie.overview}
${images.poster ? `Poster: ${images.poster}` : ''}
---`;
          }),
          ...results.tvShows.map(async (show) => {
            const images = await tmdb.getImageUrls(show);
            return `
📺 TV Show: ${show.name} (${show.first_air_date?.split('-')[0] || 'TBA'})
ID: ${show.id}
Rating: ⭐ ${show.vote_average.toFixed(1)} (${show.vote_count} votes)
Episodes: ${show.number_of_episodes} (${show.number_of_seasons} seasons)
Overview: ${show.overview}
${images.poster ? `Poster: ${images.poster}` : ''}
---`;
          })
        ]);

        return {
          content: [{
            type: "text",
            text: formattedResults.join('\n') || "No results found"
          }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Movie discovery tools
  server.tool(
    "discover_movies",
    "Get popular, top rated, upcoming, and now playing movies",
    {
      include: z.array(z.enum(['popular', 'top_rated', 'upcoming', 'now_playing']))
        .optional()
        .describe("Categories to include"),
      page: z.number().optional().describe("Page number")
    },
    async ({ include = ['popular', 'top_rated', 'upcoming', 'now_playing'], page = 1 }) => {
      try {
        const results = await tmdb.getMovieDiscovery({
          page,
          includePopular: include.includes('popular'),
          includeTopRated: include.includes('top_rated'),
          includeUpcoming: include.includes('upcoming'),
          includeNowPlaying: include.includes('now_playing')
        });

        let discoveryText = '';

        if (results.popular) {
          discoveryText += '\n🔥 Popular Movies:\n' + await formatMovieList(results.popular, tmdb);
        }
        if (results.topRated) {
          discoveryText += '\n⭐ Top Rated Movies:\n' + await formatMovieList(results.topRated, tmdb);
        }
        if (results.upcoming) {
          discoveryText += '\n📅 Upcoming Movies:\n' + await formatMovieList(results.upcoming, tmdb);
        }
        if (results.nowPlaying) {
          discoveryText += '\n🎬 Now Playing Movies:\n' + await formatMovieList(results.nowPlaying, tmdb);
        }

        return {
          content: [{
            type: "text",
            text: discoveryText || "No movies found"
          }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // TV Show discovery tools
  server.tool(
    "discover_tv_shows",
    "Get popular, top rated, airing today, and on the air TV shows",
    {
      include: z.array(z.enum(['popular', 'top_rated', 'airing_today', 'on_the_air']))
        .optional()
        .describe("Categories to include"),
      page: z.number().optional().describe("Page number")
    },
    async ({ include = ['popular', 'top_rated', 'airing_today', 'on_the_air'], page = 1 }) => {
      try {
        const results = await tmdb.getTVShowDiscovery({
          page,
          includePopular: include.includes('popular'),
          includeTopRated: include.includes('top_rated'),
          includeAiringToday: include.includes('airing_today'),
          includeOnTheAir: include.includes('on_the_air')
        });

        let discoveryText = '';

        if (results.popular) {
          discoveryText += '\n🔥 Popular TV Shows:\n' + await formatTVShowList(results.popular, tmdb);
        }
        if (results.topRated) {
          discoveryText += '\n⭐ Top Rated TV Shows:\n' + await formatTVShowList(results.topRated, tmdb);
        }
        if (results.airingToday) {
          discoveryText += '\n📺 Airing Today:\n' + await formatTVShowList(results.airingToday, tmdb);
        }
        if (results.onTheAir) {
          discoveryText += '\n📅 On The Air:\n' + await formatTVShowList(results.onTheAir, tmdb);
        }

        return {
          content: [{
            type: "text",
            text: discoveryText || "No TV shows found"
          }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Detailed info tools
  server.tool(
    "get_movie_details",
    "Get detailed information about a movie",
    {
      movieId: z.number().describe("TMDB movie ID"),
      includeRecommendations: z.boolean().optional().describe("Include recommended movies"),
      includeSimilar: z.boolean().optional().describe("Include similar movies")
    },
    async ({ movieId, includeRecommendations = true, includeSimilar = true }) => {
      try {
        const details = await tmdb.getMovieDetails(movieId);
        const images = await tmdb.getImageUrls(details.movie);

        let detailsText = `
🎬 ${details.movie.title} (${details.movie.release_date?.split('-')[0] || 'TBA'})
Rating: ⭐ ${details.movie.vote_average.toFixed(1)} (${details.movie.vote_count} votes)
Runtime: ${details.movie.runtime || 'N/A'} minutes
Status: ${details.movie.status}
Budget: $${(details.movie.budget / 1000000).toFixed(1)}M
Revenue: $${(details.movie.revenue / 1000000).toFixed(1)}M
Genres: ${details.movie.genres.map((g: Genre) => g.name).join(', ')}
${details.movie.overview}
${images.poster ? `\nPoster: ${images.poster}` : ''}
${images.backdrop ? `\nBackdrop: ${images.backdrop}` : ''}`;

        if (includeRecommendations && details.recommendations.length > 0) {
          detailsText += '\n\n📌 Recommended Movies:\n' + 
            await formatMovieList(details.recommendations.slice(0, 5), tmdb);
        }

        if (includeSimilar && details.similar.length > 0) {
          detailsText += '\n\n🎯 Similar Movies:\n' + 
            await formatMovieList(details.similar.slice(0, 5), tmdb);
        }

        return {
          content: [{
            type: "text",
            text: detailsText
          }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "get_tv_show_details",
    "Get detailed information about a TV show",
    {
      showId: z.number().describe("TMDB TV show ID"),
      includeRecommendations: z.boolean().optional().describe("Include recommended shows"),
      includeSimilar: z.boolean().optional().describe("Include similar shows")
    },
    async ({ showId, includeRecommendations = true, includeSimilar = true }) => {
      try {
        const details = await tmdb.getTVShowDetails(showId);
        const images = await tmdb.getImageUrls(details.show);

        let detailsText = `
📺 ${details.show.name} (${details.show.first_air_date?.split('-')[0] || 'TBA'})
Rating: ⭐ ${details.show.vote_average.toFixed(1)} (${details.show.vote_count} votes)
Episodes: ${details.show.number_of_episodes} (${details.show.number_of_seasons} seasons)
Status: ${details.show.status}
Type: ${details.show.type}
Networks: ${details.show.networks.map((n: { name: string }) => n.name).join(', ')}
Genres: ${details.show.genres.map((g: Genre) => g.name).join(', ')}
${details.show.overview}
${images.poster ? `\nPoster: ${images.poster}` : ''}
${images.backdrop ? `\nBackdrop: ${images.backdrop}` : ''}`;

        if (includeRecommendations && details.recommendations.length > 0) {
          detailsText += '\n\n📌 Recommended Shows:\n' + 
            await formatTVShowList(details.recommendations.slice(0, 5), tmdb);
        }

        if (includeSimilar && details.similar.length > 0) {
          detailsText += '\n\n🎯 Similar Shows:\n' + 
            await formatTVShowList(details.similar.slice(0, 5), tmdb);
        }

        return {
          content: [{
            type: "text",
            text: detailsText
          }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  console.error("Registered TMDB tools: search_media, discover_movies, discover_tv_shows, get_movie_details, get_tv_show_details");
}

// Helper functions for formatting
async function formatMovieList(movies: Movie[], tmdb: TMDBService): Promise<string> {
  const formattedMovies = await Promise.all(movies.map(async (movie) => {
    const images = await tmdb.getImageUrls(movie);
    return `
Title: ${movie.title} (${movie.release_date?.split('-')[0] || 'TBA'})
Rating: ⭐ ${movie.vote_average.toFixed(1)} (${movie.vote_count} votes)
Overview: ${movie.overview}
${images.poster ? `Poster: ${images.poster}` : ''}
---`;
  }));
  return formattedMovies.join('\n');
}

async function formatTVShowList(shows: TVShow[], tmdb: TMDBService): Promise<string> {
  const formattedShows = await Promise.all(shows.map(async (show) => {
    const images = await tmdb.getImageUrls(show);
    return `
Title: ${show.name} (${show.first_air_date?.split('-')[0] || 'TBA'})
Rating: ⭐ ${show.vote_average.toFixed(1)} (${show.vote_count} votes)
Episodes: ${show.number_of_episodes} (${show.number_of_seasons} seasons)
Overview: ${show.overview}
${images.poster ? `Poster: ${images.poster}` : ''}
---`;
  }));
  return formattedShows.join('\n');
}