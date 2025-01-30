import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { TautulliService } from '../service.js';

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
  startDate: z.string().optional().describe("Start date for filtering"),
  endDate: z.string().optional().describe("End date for filtering")
};

export function registerTools(server: McpServer, tautulli: TautulliService) {
  /**
   * Activity Tools
   */
  server.tool(
    "tautulli:activity:current",
    "Get current Plex activity",
    {},
    async (_params, _extra) => {
      try {
        const activity = await tautulli.getCurrentActivity();
        return formatToolResponse(activity);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:activity:streams",
    "Get active streams",
    {},
    async (_params, _extra) => {
      try {
        const streams = await tautulli.getActiveStreams();
        return formatToolResponse(streams);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:activity:transcodes",
    "Get transcoding sessions",
    {},
    async (_params, _extra) => {
      try {
        const transcodes = await tautulli.getTranscodingSessions();
        return formatToolResponse(transcodes);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:activity:terminate",
    "Terminate a streaming session",
    {
      sessionId: z.string().describe("Session ID to terminate"),
      reason: z.string().optional().describe("Reason for termination")
    },
    async ({ sessionId, reason }, _extra) => {
      try {
        await tautulli.terminateSession(sessionId, reason);
        return formatToolResponse("Session terminated successfully", "success");
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * History Tools
   */
  server.tool(
    "tautulli:history:get",
    "Get Plex watch history with stats",
    commonParameters,
    async (params, _extra) => {
      try {
        const history = await tautulli.getHistory(params);
        return formatToolResponse(history);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:history:user",
    "Get watch history for a specific user",
    {
      userId: z.number().describe("User ID"),
      ...commonParameters
    },
    async ({ userId, ...params }, _extra) => {
      try {
        const history = await tautulli.getUserHistory(userId, params);
        return formatToolResponse(history);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Library Tools
   */
  server.tool(
    "tautulli:libraries:stats",
    "Get library statistics",
    {},
    async (_params, _extra) => {
      try {
        const stats = await tautulli.getLibraryStats();
        return formatToolResponse(stats);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:libraries:details",
    "Get detailed information about a library",
    {
      sectionId: z.number().describe("Library section ID")
    },
    async ({ sectionId }, _extra) => {
      try {
        const details = await tautulli.getLibraryDetails(sectionId);
        return formatToolResponse(details);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * User Tools
   */
  server.tool(
    "tautulli:users:stats",
    "Get user statistics and engagement metrics",
    {
      userId: z.number().describe("User ID")
    },
    async ({ userId }, _extra) => {
      try {
        const stats = await tautulli.getUserStats(userId);
        return formatToolResponse(stats);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  server.tool(
    "tautulli:users:all",
    "Get statistics for all users",
    {},
    async (_params, _extra) => {
      try {
        const stats = await tautulli.getAllUserStats();
        return formatToolResponse(stats);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Recently Added Tools
   */
  server.tool(
    "tautulli:recent:added",
    "Get recently added content",
    {
      count: z.number().min(1).max(100).optional().describe("Number of items to return")
    },
    async ({ count }, _extra) => {
      try {
        const recent = await tautulli.getRecentlyAdded(count);
        return formatToolResponse(recent);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  /**
   * Server Tools
   */
  server.tool(
    "tautulli:server:status",
    "Get server status and health metrics",
    {},
    async (_params, _extra) => {
      try {
        const status = await tautulli.getServerStatus();
        return formatToolResponse(status);
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  console.error("Registered Tautulli tools: activity, history, libraries, users, recent, server");
} 