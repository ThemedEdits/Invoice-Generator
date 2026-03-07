import { z } from "zod";

// The application relies entirely on Firebase Client SDK for data fetching and Auth.
// This file exports the api shapes and buildUrl helper to satisfy standard imports.

export const api = {
  health: {
    get: {
      method: 'GET' as const,
      path: '/api/health' as const,
      responses: {
        200: z.object({ status: z.string() }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
