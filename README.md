# 🎬 Media Stack MCP Server

A comprehensive Model Context Protocol (MCP) server that bridges the gap between Large Language Models (LLMs) and your self-hosted media technology stack. This project enables intelligent automation and natural language control of your media services while maintaining traditional programmatic access.

## 🎯 Key Features

- 🤖 LLM-powered natural language control of media services
- 🔌 Modular architecture for easy service integration
- 🔄 Unified API gateway for traditional access
- 🎮 Web UI for visual control (planned)
- 🔐 Direct API access without LLM middleware
- 🧩 Extensible plugin system for new services

## 📚 Documentation

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Building MCP Servers with LLMs](https://modelcontextprotocol.io/tutorials/building-mcp-with-llms)
- [Full Documentation](https://modelcontextprotocol.io/docs)
- [Current Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/)
- [MCP Schema](https://github.com/modelcontextprotocol/specification/tree/main/schema)

## 🏗️ Project Structure

This monorepo is organized into modular packages, each serving a specific purpose:

- 📦 `packages/server`: Core MCP server implementation
- 🌐 `packages/web`: Web UI interface (planned)
- 💬 `packages/chatbot`: LLM chat interface (planned)
- 🔀 `packages/api-gateway`: API routing and service coordination (planned)

### 🔧 Integrated Services

#### ✅ Currently Supported
- Gotify - Notification Management
- Sonarr - TV Show Management
- Prowlarr - Indexer Management
- Overseerr - Request Management

#### 🚧 Planned Integrations
- Radarr - Movie Management
- qBittorrent - Torrent Management
- SABnzbd - Usenet Downloads
- Plex - Media Server
- Tautulli - Server Statistics
- TMDB - Media Database

## 📖 Service Documentation

### 🟢 Currently Integrated
- [Sonarr - TV Show Management](https://sonarr.tv/docs/api/)
- [Prowlarr - Indexer Management](https://prowlarr.com/docs/api/)
- [Overseerr - Request Management](https://api-docs.overseerr.dev/)
- [Gotify - Notification Service](https://gotify.net/api-docs)

### 📋 Planned Integration
- [Radarr - Movie Management](https://radarr.video/docs/api/)
- [Plex - Media Server](https://plexapi.dev/Intro)
- [Tautulli - Media Server Stats](https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference)
- [SABnzbd - Usenet Downloader](https://sabnzbd.org/wiki/advanced/api)
- [qbittorrent - Torrent Downloader](https://github.com/qbittorrent/wiki/blob/master/WebUI-API-(qBittorrent-5.0).md)
- [TMDB - Movie/TV Show Database](https://developer.themoviedb.org/docs)

## 🧪 Development

### Testing Tools
- [wong2/mcp-cli](https://github.com/wong2/mcp-cli)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)

### 🛠️ SDK References
- [Typescript SDK](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md)
- [Create Typescript Server](https://github.com/modelcontextprotocol/create-typescript-server/blob/main/README.md)
- [Template Typescript Server](https://github.com/modelcontextprotocol/create-typescript-server/blob/main/template/README.md.ejs)
- [Building MCP Servers with LLMs](https://modelcontextprotocol.io/llms-full.txt)

## 🏛️ Architecture

The project follows a modular architecture where each service package contains:
- 🔌 API client implementation
- 📝 Type definitions
- 🛠️ MCP tools for service interaction
- 🛣️ API routes

This architecture supports multiple interaction methods:
1. **LLM-Powered Control**: Natural language processing for intuitive media management
2. **Traditional API Access**: Direct API calls through the unified gateway
3. **Web Interface**: Visual control panel for service management (planned)
4. **Chatbot Interface**: Conversational UI for service control (planned)

The modular design allows for:
- Easy addition of new services
- Independent service deployment
- Flexible interaction methods
- Consistent API patterns across services

## 🚀 Getting Started

### Prerequisites
```bash
# Clone and setup repository
git clone https://github.com/jmagar/yarr
cd yarr
pnpm install
```

### Configuration

1. Create `.env` file from template:
```bash
cp .env.template .env
```

Then add your service API keys:
```env
# Sonarr Configuration
SONARR_URL=http://localhost:8989
SONARR_API_KEY=your_sonarr_api_key

# Prowlarr Configuration  
PROWLARR_URL=http://localhost:9696
PROWLARR_API_KEY=your_prowlarr_api_key

# Overseerr Configuration
OVERSEERR_URL=http://localhost:5055
OVERSEERR_API_KEY=your_overseerr_api_key

# Gotify Configuration
GOTIFY_URL=http://localhost:8080
GOTIFY_APP_TOKEN=your_gotify_app_token
GOTIFY_CLIENT_TOKEN=your_gotify_client_token  # Optional, for receiving messages
```

2. Configure Claude Desktop:

> **Important**: Use full paths in your configuration to ensure Claude Desktop can find the executables and project directory.

```json
{
  "mcpServers": {
    "yarr": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\path\\to\\yarr\\packages\\server\\dist\\index.js"],
      "cwd": "C:\\path\\to\\yarr",
      "transport": {
        "type": "stdio"
      },
      "env": {
        "NODE_ENV": "production",
        "PROWLARR_URL": "http://localhost:9696",
        "PROWLARR_API_KEY": "your_prowlarr_api_key",
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "your_sonarr_api_key",
        "OVERSEERR_URL": "http://localhost:5055",
        "OVERSEERR_API_KEY": "your_overseerr_api_key",
        "GOTIFY_URL": "http://localhost:8080",
        "GOTIFY_APP_TOKEN": "your_gotify_app_token",
        "GOTIFY_CLIENT_TOKEN": "your_gotify_client_token"
      }
    }
  }
}
```

> Note: Replace `C:\\path\\to\\yarr` with your actual project directory path.

### Available Tools

#### Sonarr
```typescript
// Series Management
sonarr:search              - Search for TV shows
sonarr:list-series         - List all monitored TV series  
sonarr:series-details      - Get detailed information about a series
sonarr:add-series         - Add a new series to monitor
sonarr:monitor-season     - Monitor or unmonitor a season
sonarr:list-profiles      - List quality and language profiles
sonarr:upcoming          - Get upcoming episodes
sonarr:queue             - Get current download queue
sonarr:remove-from-queue - Remove item from download queue
```

#### Prowlarr
```typescript
prowlarr:search           - Search across all indexers
prowlarr:list-indexers    - List configured indexers
prowlarr:indexer-stats    - Get indexer performance stats
prowlarr:check-config     - Validate Prowlarr connection
```

#### Overseerr
```typescript
overseerr:search          - Search for movies and TV shows
overseerr:request         - Request a movie or TV show
overseerr:list-requests   - List media requests
overseerr:update-request  - Update request status
overseerr:trending        - Get trending media with recommendations
overseerr:available       - Get popular available media
overseerr:status          - Get system status
```

#### Gotify
```typescript
gotify:messages:list      - List messages with pagination
gotify:messages:send      - Send a new message
gotify:messages:delete    - Delete a message by ID
gotify:messages:cleanup   - Delete old messages
gotify:apps:list         - List all applications
gotify:apps:create       - Create a new application
gotify:clients:list      - List all clients
gotify:clients:create    - Create a new client
gotify:health           - Check Gotify server health
gotify:stats            - Get Gotify statistics
```
