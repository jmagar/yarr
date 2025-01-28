import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  prowlarr: {
    url: process.env.PROWLARR_URL || "http://localhost:9696",
    apiKey: process.env.PROWLARR_API_KEY
  },
  sabnzbd: {
    url: process.env.SABNZBD_URL,
    apiKey: process.env.SABNZBD_API_KEY
  },
  qbittorrent: {
    url: process.env.QBITTORRENT_URL,
    username: process.env.QBITTORRENT_USERNAME,
    password: process.env.QBITTORRENT_PASSWORD
  }
};

// Validate required environment variables
if (!config.prowlarr.apiKey) {
  throw new Error("PROWLARR_API_KEY environment variable is required");
} 