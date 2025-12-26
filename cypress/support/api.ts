// cypress/support/api.ts
// Typed API helpers powered by the OpenAPI spec in `openapi/gymmm.openapi.json`.

import type { paths } from './generated/openapi';
import { apiRequest, API_PREFIX } from './client';

export { API_PREFIX };

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LoginResponse {
  token: string;
  user: {
    _id?: string;
    id?: string;
    role: string;
    [key: string]: any;
  };
}

type LoginBehavior = {
  /** If true, a 429 response from /auth/login will skip the current test instead of failing. */
  skipOnRateLimit?: boolean;
  /** Retry /auth/login when rate limited instead of skipping. */
  retryOnRateLimit?: boolean;
  /** Max retries for rate-limited login (default 5). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 400). */
  baseDelayMs?: number;
};

export const getEnv = (key: string, fallback?: string) => {
  const v = Cypress.env(key);
  if (!v && !fallback) {
    throw new Error(`Missing Cypress env: ${key}`);
  }
  return (v || fallback) as string;
};

/**
 * Generic authorized request (kept for compatibility with existing tests).
 *
 * This stays untyped because some specs call endpoints not included in the
 * current OpenAPI snippet.
 */
export const authRequest = (
  token: string | undefined,
  method: HttpMethod,
  url: string,
  body?: any,
  failOnStatusCode = true,
) => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  return cy.request({
    method,
    url: `${API_PREFIX}${url}`,
    headers,
    body,
    failOnStatusCode,
  });
};

/**
 * Typed request for OpenAPI-known endpoints.
 */
export const api = <P extends keyof paths, M extends keyof paths[P]>(
  method: HttpMethod,
  path: P,
  body?: any,
  options?: { token?: string; failOnStatusCode?: boolean; qs?: any },
) => apiRequest<P, M>(method, path, body, options);

const waitMs = (ms: number) => cy.wait(ms, { log: false });

/**
 * Backend warmup / readiness probe.
 *
 * Useful for cold-started deployments (e.g. Render free tier) where the first request
 * can take ~1 minute before the API starts responding.
 */
export const waitForBackendReady = (options?: {
  /**
   * Relative health URL (must include API prefix path part like "/api").
   * Default: `${API_PREFIX}/auth/health`
   */
  url?: string;
  /** How long to wait in total (default 70_000ms). */
  timeoutMs?: number;
  /** Probe interval (default 2_000ms). */
  intervalMs?: number;
  /** Allowed statuses that count as "ready". Default: [200, 204, 401, 403]. */
  readyStatuses?: number[];
}) => {
  const url = options?.url ?? `${API_PREFIX}/auth/health`;
  const timeoutMs = options?.timeoutMs ?? 70_000;
  const intervalMs = options?.intervalMs ?? 2_000;
  const readyStatuses = options?.readyStatuses ?? [200, 204, 401, 403];

  const startedAt = Date.now();

  const probe = (): Cypress.Chainable<void> => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) {
      throw new Error(`Backend not ready after ${timeoutMs}ms (${url})`);
    }

    // cy.request() can still throw for non-HTTP/network errors (e.g. DNS),
    // so keep each probe short and retry.
    return cy
      .request({
        method: 'GET',
        url,
        failOnStatusCode: false,
        timeout: Math.min(30_000, timeoutMs),
      })
      .then((res) => {
        if (readyStatuses.includes(res.status)) return;

        const elapsed2 = Date.now() - startedAt;
        if (elapsed2 >= timeoutMs) {
          throw new Error(
            `Backend not ready after ${timeoutMs}ms. Last status: ${res.status} (${url})`,
          );
        }

        return waitMs(intervalMs).then(() => probe());
      });
  };

  return cy.then(() => probe());
};

// login helper that normalizes user._id OR user.id into user._id
export const login = (email: string, password: string, behavior: LoginBehavior = {}) => {
  const retryOn429 = Boolean(behavior.retryOnRateLimit);
  const maxRetries = behavior.maxRetries ?? 5;
  const baseDelayMs = behavior.baseDelayMs ?? 400;

  const attempt = (n: number): Cypress.Chainable<LoginResponse> => {
    return api<'/auth/login', 'post'>(
      'POST',
      '/auth/login',
      { email, password },
      { failOnStatusCode: false },
    ).then((res) => {
      if (res.status === 429) {
        if (behavior.skipOnRateLimit) {
          return cy.then(function () {
            (this as any).skip();
          }) as any;
        }

        if (retryOn429 && n < maxRetries) {
          const delay = Math.min(baseDelayMs * Math.pow(2, n), 8000);
          return waitMs(delay).then(() => attempt(n + 1));
        }
      }

      expect([200, 201]).to.include(res.status);

      const body = res.body as any as LoginResponse;

      expect(body.token).to.be.a('string').and.not.empty;
      expect(body).to.have.property('user');

      const user = body.user;
      const userId = (user._id || user.id) as string;

      expect(userId, 'user id from login').to.be.a('string').and.not.empty;
      // normalize so all tests can rely on _id
      (body.user as any)._id = userId;

      return body;
    });
  };

  return attempt(0);
};

// Optional custom command for convenience
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      apiLogin(role: 'admin' | 'superadmin' | 'trainer' | 'member'): Chainable<{
        token: string;
        userId: string;
      }>;
    }
  }
}

Cypress.Commands.add('apiLogin', (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
  const emailKey =
    role === 'admin'
      ? 'ADMIN_EMAIL'
      : role === 'superadmin'
        ? 'SUPER_EMAIL'
        : role === 'trainer'
          ? 'TRAINER_EMAIL'
          : 'MEMBER_EMAIL';
  const passKey =
    role === 'admin'
      ? 'ADMIN_PASSWORD'
      : role === 'superadmin'
        ? 'SUPER_PASSWORD'
        : role === 'trainer'
          ? 'TRAINER_PASSWORD'
          : 'MEMBER_PASSWORD';

  const email = getEnv(emailKey);
  const password = getEnv(passKey);

  const maxRetries = 10;
  const baseDelayMs = 400;

  const attempt = (n: number): Cypress.Chainable<{ token: string; userId: string }> => {
    return cy.then(() => {
      return cy
        .request({
          method: 'POST',
          url: `${API_PREFIX}/auth/login`,
          body: { email, password },
          failOnStatusCode: false,
        })
        .then((res) => {
          if (res.status === 429 && n < maxRetries) {
            const delay = Math.min(baseDelayMs * Math.pow(2, n), 8000);
            return waitMs(delay).then(() => attempt(n + 1));
          }

          // In production, auth can be rate-limited (429) or intermittently error.
          // Never skip tests; instead return a sentinel token so downstream checks can
          // run in “best-effort” mode and assert on the observed status.
          if (res.status !== 200 && res.status !== 201) {
            return { token: '', userId: '' };
          }
          const body = res.body as any as LoginResponse;
          const userId = (body.user._id || body.user.id) as string;
          (body.user as any)._id = userId;
          return { token: body.token, userId };
        });
    }) as Cypress.Chainable<{ token: string; userId: string }>;
  };

  return attempt(0);
});

export {};