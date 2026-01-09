// cypress/support/client.ts

import type { paths } from './generated/openapi';

export type ApiResponse<T> = {
  status: number;
  body: T;
  headers: Record<string, any>;
};

export type ApiOptions = {
  token?: string;
  failOnStatusCode?: boolean;
  qs?: Record<string, any>;
};

// Extract the request body type for a given OpenAPI path + method.
// If the operation doesn't declare a JSON requestBody, this becomes never.
export type RequestBody<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;

// Extract the 2xx JSON response body type for a given path + method.
export type SuccessResponse<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends { responses: infer R }
  ? // prefer 200, else 201, else 204
    (R extends { 200: any }
      ? ExtractJson<R[200]>
      : R extends { 201: any }
        ? ExtractJson<R[201]>
        : R extends { 204: any }
          ? ExtractJson<R[204]>
          : unknown)
  : unknown;

type ExtractJson<T> = T extends { content: { 'application/json': infer J } }
  ? J
  : // some endpoints are file streams or don't specify JSON
    any;

export const API_PREFIX = '/api';

/**
 * Typed Cypress request wrapper.
 *
 * Notes:
 * - Uses Cypress `baseUrl` from `cypress.config.js`.
 * - Accepts OpenAPI paths *without* the `/api` prefix (ex: `/auth/login`).
 */
export const apiRequest = <
  P extends keyof paths,
  M extends keyof paths[P],
>(
  method: string,
  path: P,
  body?: RequestBody<P, M>,
  options: ApiOptions = {},
): Cypress.Chainable<ApiResponse<SuccessResponse<P, M>>> => {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  // Runtime endpoint capture
  // Many API specs use cy.request() (Node-side), which bypasses browser-level
  // intercept/fetch/XHR instrumentation. Recording here ensures coverage metrics
  // reflect real API usage.
  cy.task(
    'runtime:record',
    { method, pathname: `${API_PREFIX}${path as string}` },
    { log: false },
  );

  return cy.request({
    method,
    url: `${API_PREFIX}${path as string}`,
    body: body as any,
    qs: options.qs,
    headers,
    failOnStatusCode: options.failOnStatusCode ?? true,
  }) as any;
};

export {};
