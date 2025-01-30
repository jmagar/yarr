import { config } from 'dotenv';
// Load environment variables from .env file with override option
config({ override: true });

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'RADARR_URL', 
  'RADARR_API_KEY',
  'OVERSEERR_URL',
  'OVERSEERR_API_KEY'
];

const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

// Create server instance
const server = new McpServer({
  name: "media-server",
  version: "1.0.0"
});

// Register tools
console.error('Registering Media Management tools...');
registerTools(server);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport); 