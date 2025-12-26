/// <reference types="cypress" />

import { API_PREFIX } from './api';

export type CleanupItem =
  | {
      method: 'DELETE' | 'POST' | 'PUT' | 'PATCH';
      url: string; // without API_PREFIX
      body?: any;
    }
  | {
      method: 'DELETE' | 'POST' | 'PUT' | 'PATCH';
      absoluteUrl: string; // full url (already includes /api)
      body?: any;
    };

/**
 * Creates a per-test cleanup queue.
 *
 * Contract:
 * - Call `track(...)` after you successfully create something.
 * - Call `run(token)` in `afterEach`/`after`.
 * - Only deletes what the test created.
 */
export const createCleanup = () => {
  const items: CleanupItem[] = [];

  return {
    track: (item: CleanupItem) => {
      items.push(item);
    },

    run: (token?: string) => {
      if (!items.length) return cy.wrap(null);

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      // Run in reverse order to respect dependencies (child resources first).
      const reversed = [...items].reverse();

      return cy.wrap(reversed).each((it: any) => {
        // Cypress typings for cy.wrap(...).each are a bit loose; keep this request options object untyped.
        const req: any = {
          method: it.method,
          failOnStatusCode: false,
          headers,
        };

        if (it.absoluteUrl) {
          req.url = String(it.absoluteUrl);
        } else {
          req.url = `${API_PREFIX}${String(it.url)}`;
        }

        if ((it as any).body) req.body = (it as any).body;

        return cy.request(req).then((res) => {
          // Do not fail cleanup on errors; cleanup should never break the suite.
          // Common delete statuses: 200/204/404
          expect([200, 202, 204, 400, 401, 403, 404, 409, 422, 500]).to.include(
            res.status,
          );
        });
      });
    },
  };
};
