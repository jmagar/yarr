import { TMDBApi } from './api.js';
import { TMDBConfig } from './types.js';

export class TMDBService {
  private readonly api: TMDBApi;

  constructor(config: TMDBConfig) {
    this.api = new TMDBApi(config);
  }

  async searchMovies(query: string) {
    return this.api.searchMovies(query);
  }

  async searchTVShows(query: string) {
    return this.api.searchTVShows(query);
  }

  async getMovie(id: number) {
    return this.api.getMovie(id);
  }

  async getTVShow(id: number) {
    return this.api.getTVShow(id);
  }
} 