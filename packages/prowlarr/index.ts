import * as dotenv from 'dotenv';
dotenv.config();

// Add these debug logs at the start of the file
console.log("Environment variables after dotenv:", {
  PROWLARR_URL: process.env.PROWLARR_URL,
  API_KEY_SET: !!process.env.PROWLARR_API_KEY
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PROWLARR_URL = process.env.PROWLARR_URL || "http://localhost:9696";
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY;

// Add these constants with the other environment variables
const SABNZBD_URL = process.env.SABNZBD_URL;
const SABNZBD_API_KEY = process.env.SABNZBD_API_KEY;
const QBITTORRENT_URL = process.env.QBITTORRENT_URL;
const QBITTORRENT_USERNAME = process.env.QBITTORRENT_USERNAME;
const QBITTORRENT_PASSWORD = process.env.QBITTORRENT_PASSWORD;

if (!PROWLARR_API_KEY) {
  throw new Error("PROWLARR_API_KEY environment variable is required");
}

// Enhanced API call function with better error handling
async function callProwlarr(endpoint: string, options: RequestInit = {}) {
  const apiKey = PROWLARR_API_KEY as string;
  
  try {
    const response = await fetch(`${PROWLARR_URL}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Please wait ${retryAfter} seconds before trying again.`);
    }

    if (!response.ok) {
      throw new Error(`Prowlarr API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      throw new Error(`Cannot connect to Prowlarr at ${PROWLARR_URL}. Please check the URL and ensure Prowlarr is running.`);
    }
    throw error;
  }
}

// Create server instance
const server = new McpServer({
  name: "prowlarr-mcp",
  version: "1.0.0"
});

// Type for API error handling
interface ApiError {
  message: string;
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

// Helper functions for parsing media information
function parseQuality(title: string): string {
  const qualities = ['2160p', '1080p', '720p', 'HDTV', 'WEB-DL', 'BluRay'];
  for (const quality of qualities) {
    if (title.toUpperCase().includes(quality.toUpperCase())) return quality;
  }
  return 'Unknown';
}

function detectLanguage(title: string): string {
  const languages = {
    'VOSTFR': 'French Subtitles',
    'MULTI': 'Multiple Languages',
    'FRENCH': 'French',
    'ENG': 'English'
  };
  
  for (const [code, lang] of Object.entries(languages)) {
    if (title.toUpperCase().includes(code)) return lang;
  }
  return 'Unknown';
}

// Helper function for formatting file sizes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add these helper functions
async function sendToSabnzbd(url: string, title: string) {
  const params = new URLSearchParams({
    mode: 'addurl',
    name: url,
    nzbname: title,
    apikey: SABNZBD_API_KEY as string,
    output: 'json'
  });

  const response = await fetch(`${SABNZBD_URL}/api?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`SABnzbd API error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.status !== true) {
    throw new Error(`SABnzbd error: ${result.error || 'Unknown error'}`);
  }

  return result;
}

async function sendToQbittorrent(url: string, title: string) {
  // First login to get cookie
  const loginForm = new URLSearchParams({
    username: QBITTORRENT_USERNAME as string,
    password: QBITTORRENT_PASSWORD as string
  });

  const loginResponse = await fetch(`${QBITTORRENT_URL}/api/v2/auth/login`, {
    method: 'POST',
    body: loginForm
  });

  if (!loginResponse.ok) {
    throw new Error('Failed to login to qBittorrent');
  }

  const cookie = loginResponse.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('No cookie received from qBittorrent');
  }

  // Add the torrent
  const form = new URLSearchParams({
    urls: url,
    name: title
  });

  const addResponse = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/add`, {
    method: 'POST',
    headers: {
      'Cookie': cookie
    },
    body: form
  });

  if (!addResponse.ok) {
    throw new Error(`qBittorrent API error: ${addResponse.statusText}`);
  }

  return { status: 'success' };
}

// Enhanced search indexers tool
server.tool(
  "search-indexers",
  "Search across all Prowlarr indexers",
  {
    query: z.string().describe("Search query"),
    type: z.enum(["search", "movie", "tv", "book", "audio", "other"]).default("search")
      .describe("Type of search to perform"),
    categories: z.array(z.number()).optional()
      .describe("Optional category IDs to search within")
  },
  async ({ query, type, categories }) => {
    try {
      // Build search parameters
      const params = new URLSearchParams({
        query: query,
        type: type
      });
      
      if (categories && categories.length > 0) {
        params.append("categories", categories.join(","));
      }

      const results = await callProwlarr(`/search?${params.toString()}`);
      
      // Enhanced result formatting with sorting by date and seeders
      const formattedResults = results
        .map((item: any) => ({
          title: item.title,
          indexer: item.indexer,
          size: formatBytes(item.size),
          category: item.category,
          publishDate: new Date(item.publishDate).toLocaleString(),
          publishTimestamp: new Date(item.publishDate).getTime(),
          downloadUrl: item.downloadUrl,
          magnetUrl: item.magnetUrl || null,
          seeders: item.seeders || 0,
          leechers: item.leechers || 0,
          quality: parseQuality(item.title),
          language: detectLanguage(item.title),
          // Add download type
          downloadType: item.downloadUrl.toLowerCase().includes('.nzb') ? 'nzb' : 'torrent'
        }))
        .sort((a: any, b: any) => {
          // Sort by publish date first (most recent first)
          const dateCompare = b.publishTimestamp - a.publishTimestamp;
          if (dateCompare !== 0) return dateCompare;
          
          // If same date, sort by seeders (highest first)
          return (b.seeders || 0) - (a.seeders || 0);
        });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(formattedResults, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ 
          type: "text", 
          text: `Error searching indexers: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// List indexers tool
server.tool(
  "list-indexers",
  "List all configured indexers and their categories",
  {},
  async () => {
    try {
      const indexers = await callProwlarr('/indexer');
      
      const formattedIndexers = indexers.map((indexer: any) => ({
        name: indexer.name,
        protocol: indexer.protocol,
        categories: indexer.enabledCategories,
        privacy: indexer.privacy,
        priority: indexer.priority,
        status: indexer.enable ? 'Enabled' : 'Disabled'
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify(formattedIndexers, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error listing indexers: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

interface HealthData {
  name: string;
  status: string;
  lastCheck: string;
  responseTime?: string;
  testResult?: string;
}

// Indexer stats tool
server.tool(
  "indexer-stats",
  "Get statistics about indexer performance",
  {
    indexerId: z.number().optional().describe("Optional specific indexer ID")
  },
  async ({ indexerId }) => {
    try {
      const endpoint = indexerId ? `/indexerstats/${indexerId}` : '/indexerstats';
      const stats = await callProwlarr(endpoint);
      
      const formattedStats = {
        averageResponseTime: `${stats.averageResponseTime}ms`,
        numberOfQueries: stats.numberOfQueries,
        numberOfGrabs: stats.numberOfGrabs,
        numberOfFailures: stats.numberOfFailures,
        success_rate: `${((stats.numberOfSuccessfulQueries / stats.numberOfQueries) * 100).toFixed(2)}%`
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(formattedStats, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error getting stats: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Configuration validation tool
server.tool(
  "check-configuration",
  "Validate Prowlarr connection and configuration",
  {},
  async () => {
    try {
      const [system, indexers] = await Promise.all([
        callProwlarr('/system/status'),
        callProwlarr('/indexer')
      ]);
      
      const status = {
        version: system.version,
        startTime: new Date(system.startTime).toLocaleString(),
        activeIndexers: indexers.filter((i: any) => i.enable).length,
        totalIndexers: indexers.length,
        isHealthy: system.isHealthy,
        authentication: "Connected successfully",
        url: PROWLARR_URL
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(status, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Configuration check failed: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Add the download tool
server.tool(
  "download",
  "Send a download to the appropriate client",
  {
    url: z.string().describe("Download or magnet URL"),
    title: z.string().describe("Title for the download"),
    type: z.enum(["nzb", "torrent"]).describe("Type of download")
  },
  async ({ url, title, type }) => {
    try {
      let result;

      if (type === "nzb") {
        if (!SABNZBD_URL || !SABNZBD_API_KEY) {
          throw new Error("SABnzbd not configured. Please set SABNZBD_URL and SABNZBD_API_KEY");
        }
        result = await sendToSabnzbd(url, title);
      } else {
        if (!QBITTORRENT_URL || !QBITTORRENT_USERNAME || !QBITTORRENT_PASSWORD) {
          throw new Error("qBittorrent not configured. Please set QBITTORRENT_URL, QBITTORRENT_USERNAME, and QBITTORRENT_PASSWORD");
        }
        result = await sendToQbittorrent(url, title);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Successfully sent ${type} download to client`,
            title: title,
            details: result
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ 
          type: "text", 
          text: `Error sending download: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// Add the category rules tool
server.tool(
  "set-category-rules",
  "Configure download settings by category",
  {
    category: z.number().describe("Category ID"),
    client: z.enum(["sabnzbd", "qbittorrent"]).describe("Preferred client"),
    path: z.string().optional().describe("Download path"),
    priority: z.enum(["high", "normal", "low"]).optional()
  },
  async ({ category, client, path, priority }) => {
    try {
      // Store the rule
      const rule = {
        category,
        client,
        path,
        priority,
        created: new Date().toISOString()
      };

      // In a real implementation, you'd store this in a database
      // For now, we'll just return the created rule
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: "Category rule created",
            rule
          }, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ 
          type: "text", 
          text: `Error creating category rule: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// Add the download history tool
server.tool(
  "download-history",
  "View recent downloads and their status",
  {
    limit: z.number().optional().default(10),
    client: z.enum(["all", "sabnzbd", "qbittorrent"]).optional().default("all")
  },
  async ({ limit, client }) => {
    try {
      let results = [];

      if (client === "all" || client === "sabnzbd") {
        if (SABNZBD_URL && SABNZBD_API_KEY) {
          const params = new URLSearchParams({
            mode: 'history',
            limit: limit.toString(),
            apikey: SABNZBD_API_KEY,
            output: 'json'
          });

          const response = await fetch(`${SABNZBD_URL}/api?${params.toString()}`);
          const data = await response.json();
          
          results.push(...data.history.slots.map((item: any) => ({
            client: 'sabnzbd',
            name: item.name,
            size: formatBytes(item.bytes),
            status: item.status,
            completedAt: new Date(item.completed * 1000).toLocaleString()
          })));
        }
      }

      if (client === "all" || client === "qbittorrent") {
        if (QBITTORRENT_URL && QBITTORRENT_USERNAME && QBITTORRENT_PASSWORD) {
          // Login first
          const loginForm = new URLSearchParams({
            username: QBITTORRENT_USERNAME,
            password: QBITTORRENT_PASSWORD
          });

          const loginResponse = await fetch(`${QBITTORRENT_URL}/api/v2/auth/login`, {
            method: 'POST',
            body: loginForm
          });

          const cookie = loginResponse.headers.get('set-cookie');

          // Get history
          const response = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/info`, {
            headers: {
              'Cookie': cookie || ''
            }
          });
          
          const data = await response.json();
          results.push(...data.slice(0, limit).map((item: any) => ({
            client: 'qbittorrent',
            name: item.name,
            size: formatBytes(item.size),
            status: item.state,
            completedAt: new Date(item.completion_on * 1000).toLocaleString()
          })));
        }
      }

      // Sort by completion date
      results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

      return {
        content: [{
          type: "text",
          text: JSON.stringify(results.slice(0, limit), null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ 
          type: "text", 
          text: `Error getting download history: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// Add the health check tool
server.tool(
  "health-check",
  "Check indexer health and response times",
  {
    testSearch: z.boolean().optional().default(false)
  },
  async ({ testSearch }) => {
    try {
      const indexers = await callProwlarr('/indexer');
      const results: HealthData[] = [];

      for (const indexer of indexers) {
        const healthData: HealthData = {
          name: indexer.name,
          status: indexer.enable ? 'Enabled' : 'Disabled',
          lastCheck: new Date(indexer.lastRssSyncTime || Date.now()).toLocaleString()
        };

        if (testSearch && indexer.enable) {
          try {
            const startTime = Date.now();
            await callProwlarr(`/indexer/${indexer.id}/test`);
            healthData.responseTime = `${Date.now() - startTime}ms`;
            healthData.testResult = 'Success';
          } catch (error) {
            if (error instanceof Error) {
              healthData.testResult = `Failed: ${error.message}`;
            } else {
              healthData.testResult = 'Failed: Unknown error';
            }
          }
        }

        results.push(healthData);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error checking health: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

interface SmartSearchResult {
  title: string;
  indexer: string;
  size: number;
  sizeFormatted: string;
  seeders: number;
  publishDate: string;
  downloadUrl: string;
  magnetUrl: string | null;
  quality: string;
  language: string;
  preferred?: boolean;
}

// Add the smart search tool
server.tool(
  "smart-search",
  "Advanced search with filters",
  {
    query: z.string(),
    minSize: z.number().optional(),
    maxSize: z.number().optional(),
    minSeeders: z.number().optional(),
    requiredKeywords: z.array(z.string()).optional(),
    excludedKeywords: z.array(z.string()).optional(),
    preferredReleaseGroups: z.array(z.string()).optional()
  },
  async ({ query, minSize, maxSize, minSeeders, requiredKeywords, excludedKeywords, preferredReleaseGroups }) => {
    try {
      const params = new URLSearchParams({ query });
      const results = await callProwlarr(`/search?${params.toString()}`);
      
      let filteredResults = results
        .map((item: any) => ({
          title: item.title,
          indexer: item.indexer,
          size: item.size,
          sizeFormatted: formatBytes(item.size),
          seeders: item.seeders || 0,
          publishDate: new Date(item.publishDate).toLocaleString(),
          downloadUrl: item.downloadUrl,
          magnetUrl: item.magnetUrl || null,
          quality: parseQuality(item.title),
          language: detectLanguage(item.title)
        }))
        .filter((item: SmartSearchResult) => {
          if (minSize && item.size < minSize) return false;
          if (maxSize && item.size > maxSize) return false;
          if (minSeeders && item.seeders < minSeeders) return false;
          
          if (requiredKeywords?.length) {
            if (!requiredKeywords.every(keyword => 
              item.title.toLowerCase().includes(keyword.toLowerCase())
            )) return false;
          }
          
          if (excludedKeywords?.length) {
            if (excludedKeywords.some(keyword => 
              item.title.toLowerCase().includes(keyword.toLowerCase())
            )) return false;
          }
          
          if (preferredReleaseGroups?.length) {
            const hasPreferredGroup = preferredReleaseGroups.some(group => 
              item.title.toLowerCase().includes(group.toLowerCase())
            );
            item.preferred = hasPreferredGroup;
          }
          
          return true;
        })
        .sort((a: SmartSearchResult, b: SmartSearchResult) => {
          // Preferred groups first
          if (a.preferred && !b.preferred) return -1;
          if (!a.preferred && b.preferred) return 1;
          // Then by seeders
          return (b.seeders || 0) - (a.seeders || 0);
        });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(filteredResults, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error in smart search: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

interface Release {
  title: string;
  size: string;
  seeders: number;
  quality: string;
  language: string;
  group: string;
  downloadUrl: string;
}

// Add the compare releases tool
server.tool(
  "compare-releases",
  "Compare different releases of the same content",
  {
    query: z.string(),
    maxResults: z.number().optional().default(5)
  },
  async ({ query, maxResults }) => {
    try {
      const params = new URLSearchParams({ query });
      const results = await callProwlarr(`/search?${params.toString()}`);
      
      const releases: Release[] = results
        .map((item: any) => ({
          title: item.title,
          size: formatBytes(item.size),
          seeders: item.seeders || 0,
          quality: parseQuality(item.title),
          language: detectLanguage(item.title),
          group: item.title.match(/-(.*?)$|$/)![1] || 'Unknown',
          downloadUrl: item.downloadUrl
        }))
        .slice(0, maxResults);

      // Group by quality
      const comparison = {
        "2160p": releases.filter((r: Release) => r.quality === "2160p"),
        "1080p": releases.filter((r: Release) => r.quality === "1080p"),
        "720p": releases.filter((r: Release) => r.quality === "720p"),
        "Other": releases.filter((r: Release) => !["2160p", "1080p", "720p"].includes(r.quality))
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(comparison, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error comparing releases: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Add the space check tool
server.tool(
  "check-space",
  "Check available space on download clients",
  {},
  async () => {
    try {
      const results: any = {};

      if (SABNZBD_URL && SABNZBD_API_KEY) {
        const params = new URLSearchParams({
          mode: 'diskspace',
          apikey: SABNZBD_API_KEY,
          output: 'json'
        });

        const response = await fetch(`${SABNZBD_URL}/api?${params.toString()}`);
        const data = await response.json();
        
        results.sabnzbd = data.diskspace.map((disk: any) => ({
          path: disk.path,
          free: formatBytes(disk.free),
          total: formatBytes(disk.total)
        }));
      }

      if (QBITTORRENT_URL && QBITTORRENT_USERNAME && QBITTORRENT_PASSWORD) {
        // Login first
        const loginForm = new URLSearchParams({
          username: QBITTORRENT_USERNAME,
          password: QBITTORRENT_PASSWORD
        });

        const loginResponse = await fetch(`${QBITTORRENT_URL}/api/v2/auth/login`, {
          method: 'POST',
          body: loginForm
        });

        const cookie = loginResponse.headers.get('set-cookie');

        const response = await fetch(`${QBITTORRENT_URL}/api/v2/sync/maindata`, {
          headers: {
            'Cookie': cookie || ''
          }
        });
        
        const data = await response.json();
        results.qbittorrent = {
          free: formatBytes(data.server_state.free_space_on_disk),
          total: "N/A (qBittorrent API limitation)"
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error checking space: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Add the download stats tool
server.tool(
  "download-stats",
  "View download statistics and trends",
  {
    timeframe: z.enum(["day", "week", "month", "year"]).default("week"),
    type: z.enum(["size", "count", "success-rate"]).default("count")
  },
  async ({ timeframe, type }) => {
    try {
      const now = Date.now();
      const timeframes = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };

      const startTime = now - timeframes[timeframe];
      const stats: any = {
        timeframe,
        type,
        sabnzbd: null,
        qbittorrent: null
      };

      if (SABNZBD_URL && SABNZBD_API_KEY) {
        const params = new URLSearchParams({
          mode: 'history',
          limit: '0',
          apikey: SABNZBD_API_KEY,
          output: 'json'
        });

        const response = await fetch(`${SABNZBD_URL}/api?${params.toString()}`);
        const data = await response.json();
        
        const filteredHistory = data.history.slots.filter((item: any) => 
          new Date(item.completed * 1000).getTime() > startTime
        );

        stats.sabnzbd = {
          count: filteredHistory.length,
          size: formatBytes(filteredHistory.reduce((acc: number, item: any) => acc + item.bytes, 0)),
          success_rate: `${((filteredHistory.filter((i: any) => i.status === "Completed").length / filteredHistory.length) * 100).toFixed(2)}%`
        };
      }

      if (QBITTORRENT_URL && QBITTORRENT_USERNAME && QBITTORRENT_PASSWORD) {
        // Login first
        const loginForm = new URLSearchParams({
          username: QBITTORRENT_USERNAME,
          password: QBITTORRENT_PASSWORD
        });

        const loginResponse = await fetch(`${QBITTORRENT_URL}/api/v2/auth/login`, {
          method: 'POST',
          body: loginForm
        });

        const cookie = loginResponse.headers.get('set-cookie');

        const response = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/info`, {
          headers: {
            'Cookie': cookie || ''
          }
        });
        
        const data = await response.json();
        const filteredTorrents = data.filter((item: any) => 
          item.completion_on * 1000 > startTime
        );

        stats.qbittorrent = {
          count: filteredTorrents.length,
          size: formatBytes(filteredTorrents.reduce((acc: number, item: any) => acc + item.size, 0)),
          success_rate: `${((filteredTorrents.filter((i: any) => i.progress === 1).length / filteredTorrents.length) * 100).toFixed(2)}%`
        };
      }

      // Return only the requested stat type if specified
      if (type !== "count") {
        for (const client in stats) {
          if (stats[client] && typeof stats[client] === 'object') {
            stats[client] = stats[client][type];
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(stats, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = isApiError(error) ? error.message : 'Unknown error occurred';
      return {
        content: [{ type: "text", text: `Error getting download stats: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport); 