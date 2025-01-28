import { config } from 'dotenv';
// Load environment variables from .env file with override option
config({ override: true });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ProwlarrService, registerTools as registerProwlarrTools } from '@media-mcp/prowlarr';
import { SonarrService, registerTools as registerSonarrTools } from '@media-mcp/sonarr';
import { GotifyService, registerTools as registerGotifyTools } from '@media-mcp/gotify';
import { OverseerrService, registerTools as registerOverseerrTools } from '@media-mcp/overseerr';

// Initialize services
const prowlarr = new ProwlarrService({
  url: process.env.PROWLARR_URL || "http://localhost:9696",
  apiKey: process.env.PROWLARR_API_KEY || ""
});

const sonarr = new SonarrService({
  url: process.env.SONARR_URL || "http://localhost:8989",
  apiKey: process.env.SONARR_API_KEY || ""
});

// Initialize Gotify service
const gotifyUrl = process.env.GOTIFY_URL;
const gotifyAppToken = process.env.GOTIFY_APP_TOKEN;
const gotifyClientToken = process.env.GOTIFY_CLIENT_TOKEN;

console.error('Initializing Gotify service with:', {
  url: gotifyUrl,
  hasAppToken: !!gotifyAppToken,
  hasClientToken: !!gotifyClientToken
});

if (!gotifyUrl || !gotifyAppToken) {
  throw new Error('Gotify configuration missing. Please set GOTIFY_URL and GOTIFY_APP_TOKEN in .env (GOTIFY_CLIENT_TOKEN is optional for receiving messages)');
}

const gotifyService = new GotifyService({
  url: gotifyUrl,
  applicationToken: gotifyAppToken,
  clientToken: gotifyClientToken
});

// Initialize Overseerr service
const overseerrUrl = process.env.OVERSEERR_URL;
const overseerrApiKey = process.env.OVERSEERR_API_KEY;

console.error('Initializing Overseerr service with:', {
  url: overseerrUrl,
  hasApiKey: !!overseerrApiKey,
  envKeys: Object.keys(process.env).filter(key => key.startsWith('OVERSEERR')) // Debug logging
});

if (!overseerrUrl || !overseerrApiKey) {
  throw new Error('Overseerr configuration missing. Please set OVERSEERR_URL and OVERSEERR_API_KEY in .env');
}

const overseerrService = new OverseerrService({
  url: overseerrUrl,
  apiKey: overseerrApiKey
});

// Create server instance
const server = new McpServer({
  name: "media-mcp",
  version: "1.0.0"
});

// Register service tools
console.error('Registering Prowlarr tools...');
registerProwlarrTools(server, prowlarr);

console.error('Registering Sonarr tools...');
registerSonarrTools(server, sonarr);

console.error('Registering Gotify tools...');
registerGotifyTools(server, gotifyService);

console.error('Registering Overseerr tools...');
registerOverseerrTools(server, overseerrService);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport); 