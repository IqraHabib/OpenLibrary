import type { APIRequestContext } from '@playwright/test';

const BASE_URL = 'https://openlibrary.org';

export interface BookDoc {
  title: string;
  [key: string]: unknown;
}

export interface SearchResponse {
  numFound: number;
  docs: BookDoc[];
}

export interface SearchParams {
  q: string;
  limit?: number;
  sort?: string;
}

export class OpenLibraryApi {
  constructor(private readonly request: APIRequestContext) {}

  async searchBooks(params: SearchParams): Promise<SearchResponse> {
    const query: Record<string, string> = { q: params.q };
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.sort !== undefined) query.sort = params.sort;

    const response = await this.request.get(`${BASE_URL}/search.json`, { params: query });
    return response.json() as Promise<SearchResponse>;
  }
}
