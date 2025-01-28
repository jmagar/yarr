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
