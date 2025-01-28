I need you to do a systematic, thorough, meticulous and with the absolute highest attention to do detail analysis of our project @Codebase so that you can get caught up to speed on exactly what our project is and how it works.

We are creating a Model Context Protocol (MCP) server that uses the API from various self-hosted media server/automation apps to contol your self-hosted media technology stack with LLMs.
    - [Building MCP Servers with LLMs](https://modelcontextprotocol.io/tutorials/building-mcp-with-llms)
    - [Full Documentation](https://modelcontextprotocol.io/docs)
    - [Typescript SDK README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md)
    - [Create Typescript Server README](https://github.com/modelcontextprotocol/create-typescript-server/blob/main/README.md)
    - [Template Typescript Server README](https://github.com/modelcontextprotocol/create-typescript-server/blob/main/template/README.md.ejs)
    - [Current Model Context Protocol Specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/)
    - [Model Context Protocol Schema](https://github.com/modelcontextprotocol/specification/tree/main/schema)
    - [Model Context Protocol Documentation](https://modelcontextprotocol.io/)


The services we plan on integrating, along with their API documentation: 
    - [Sonarr - TV Show Management](https://sonarr.tv/docs/api/)
    - [Radarr - Movie Management](https://radarr.video/docs/api/)
    - [Prowlarr - Indexer Management](https://prowlarr.com/docs/api/)
    - [Overseerr - Request Management](https://api-docs.overseerr.dev/)
    - [Plex - Media Server](https://plexapi.dev/Intro)
    - [Tautulli - Media Server Stats](https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference)
    - [SABnzbd - Usenet Downloader](https://sabnzbd.org/wiki/advanced/api)
    - [qbittorrent - Torrent Downloader](https://github.com/qbittorrent/wiki/blob/master/WebUI-API-(qBittorrent-5.0).md)
    - [Gotify - Notification Service](https://gotify.net/api-docs)
    - [TMDB - Movie/TV Show Database](https://developer.themoviedb.org/docs)


Currently we have working packages for:
    - Gotify
    - Sonarr
    - Prowlarr
    - Overseerr
Which leaves us still needing to integrate:
    - Radarr
    - qbittorrent
    - SABnzbd
    - Plex
    - Tautulli
    - TMDB

We are using a monorepo structure, and trying to keep everything as modular as possible so that we can easily spin off a service into its own standalone service if wanted. Or, if we want to integrate a new service, we can easily do so.

We have a base server package that is responsible for running the actual MCP server. It is located in the `packages/server` directory. This package is responsible for running the MCP server, initializing the services, and registering the tools.

Each service has its own package that is responsible for interacting with the various APIs of the service. The various services are named after the service they are interacting with. For example, the Sonarr service is located in the `packages/sonarr` directory. Each service has its own set of tools that are responsible for interacting with the various APIs of that particular service.

To test our server, we are using [wong2/mcp-cli](https://github.com/wong2/mcp-cli) and the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) tool. This allows us to test our server and all the tools we've built that can interact with the various APIs to execute tasks for our various services.

We would like to experiment with putting a WEB UI on top of our server so that we can easily transition chatbot control to a more traditional UI, while still being able to use all the tools we've built and leveraging the full power of LLMs. Going down this path, we would need to build a new package that is responsible for running the WEB UI. This package would be located in the `packages/web` directory. This package would be responsible for running the WEB UI, and for interacting with the server package to execute tasks for our various services. Also, we would need to build a new package that is responsible for running the chatbot. This package would be located in the `packages/chatbot` directory. This package would be responsible for running the chatbot, and for interacting with the server package to execute tasks for our various services. To accompany the chatbot, and WEB UI, and to make this usuable service to people that aren't trying to go all in on LLMs, I want to explore the option of using/interacting with our MCP server without having to have an LLM as the middleman.

Our MCP tools are pretty much just API calls anyways, the MCP tools are pretty much just a wrapper around the various APIs of the various services we are integrating with, and each service already has its own API client. So, we can just call the API directly without having to go through the MCP tools. To enable all of this to work without the LLM in the middle, we will create an API gateway that will be responsible for routing requests to the appropriate service. This API gateway will be located in the `packages/api-gateway` directory. This API gateway will be responsible for routing requests to the appropriate service, and for interacting with the server package to execute tasks for our various services. This would be the best entrypoint for the LLM to interact with our MCP server with our server, right?

To implement this, we will create an API folder in each service, that will house the API client, API routes, complete proper types for that services API. And since we have all the API calls properly typed, we can easily translate the API calls into the MCP tools. We could even have a tool that will dynamically generate the MCP tools from the API client, API routes, and proper types for that services API, ensuring that the MCP tools are always up to date with the latest API changes.

# yarr
# yarr
