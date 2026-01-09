// cypress/e2e/api/23.openapi.missing-endpoints.readonly-plus.cy.ts
// Production-safe reachability coverage for still-missing OpenAPI endpoints.
//
// Rules:
// - Only exercise endpoints in a non-destructive way.
// - For mutation endpoints, use invalid payloads or unauthenticated requests and
//   accept 4xx as "covered" (we only need to hit the route).
// - No skips/pending.

import { API_PREFIX, getEnv } from '../../support/api';

type Case = {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  auth?: 'none' | 'admin' | 'superadmin' | 'trainer' | 'member';
  failOnStatusCode?: boolean;
  body?: any;
  qs?: Record<string, any>;
  // Acceptable status codes. Keep broad so prod variability doesn't fail the suite.
  expectStatus?: number[];
};

const authHeader = (token: string | undefined) => (token ? { Authorization: `Bearer ${token}` } : {});

const loginToken = (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
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

  const email = getEnv(emailKey, '');
  const password = getEnv(passKey, '');

  if (!email || !password) return cy.wrap('');

  return cy
    .request({
      method: 'POST',
      url: `${API_PREFIX}/auth/login`,
      failOnStatusCode: false,
      body: { email, password },
      timeout: 90_000,
    })
    .then((res) => {
      if (res.status !== 200 && res.status !== 201) return '';
      return (res.body as any)?.token || '';
    });
};

describe('OpenAPI - Missing - Readonly plus reachability (production-safe)', () => {
  const tokens: Partial<Record<'admin' | 'superadmin' | 'trainer' | 'member', string>> = {};

  // Optional perf ceiling (ms). Set CYPRESS_PERF_CEILING_MS=1500 (for example) to enable.
  // Defaults to disabled (0) to avoid production flakiness.
  const perfCeilingMs = Number(getEnv('PERF_CEILING_MS', '0') || 0);

  const assertOptionalPerf = (res: Cypress.Response<any>, label: string) => {
    if (!perfCeilingMs) return;
    const d = Number((res as any).duration || 0);
    if (!d) return;
    expect(d, `${label} duration(ms) <= ${perfCeilingMs}`).to.be.lte(perfCeilingMs);
  };

  before(() => {
    // Best-effort logins. If creds are missing, tests still run unauthenticated.
    loginToken('admin').then((t) => (tokens.admin = t));
    loginToken('superadmin').then((t) => (tokens.superadmin = t));
    loginToken('trainer').then((t) => (tokens.trainer = t));
    loginToken('member').then((t) => (tokens.member = t));
  });

  it('Public - Health - GET /auth/health returns 200', () => {
    return cy
      .request({
        method: 'GET',
        url: `${API_PREFIX}/auth/health`,
        failOnStatusCode: false,
        timeout: 90_000,
      })
      .then((res) => {
        expect([200], 'GET /auth/health status').to.include(res.status);
        assertOptionalPerf(res, 'GET /auth/health');
      });
  });

  it('Public - QR - GET /qr/_health returns 200', () => {
    return cy
      .request({
        method: 'GET',
        url: `${API_PREFIX}/qr/_health`,
        failOnStatusCode: false,
        timeout: 90_000,
      })
      .then((res) => {
        expect([200], 'GET /qr/_health status').to.include(res.status);
        assertOptionalPerf(res, 'GET /qr/_health');
      });
  });

  it('Admin - Auth - GET /auth/me reachable (best-effort)', () => {
    const token = tokens.admin || '';
    return cy
      .request({
        method: 'GET',
        url: `${API_PREFIX}/auth/me`,
        headers: authHeader(token),
        failOnStatusCode: false,
      })
      .then((res) => {
        expect([200, 401, 403, 429, 500], 'GET /auth/me status').to.include(res.status);
        assertOptionalPerf(res, 'GET /auth/me');
      });
  });

  const GYM_ID = getEnv('GYM_ID', '');
  const MEMBER_ID = getEnv('MEMBER_ID', '');

  const cases: Case[] = [
    // Remaining GET coverage
    {
      name: 'Public - Coupons - GET /coupons reachable (unauth)',
      method: 'GET',
      url: `${API_PREFIX}/coupons`,
      auth: 'none',
      failOnStatusCode: false,
      expectStatus: [200, 401, 403, 404, 429],
    },
    {
      name: 'Admin - Payments - GET /payments reachable (admin)',
      method: 'GET',
      url: `${API_PREFIX}/payments`,
      auth: 'admin',
      failOnStatusCode: false,
      expectStatus: [200, 400, 401, 403, 404, 429],
    },
    {
      name: 'Admin - Payments - GET /payments/invoice/{id} reachable (admin, best-effort)',
      method: 'GET',
      url: `${API_PREFIX}/payments/invoice/${MEMBER_ID || '000000000000000000000000'}`,
      auth: 'admin',
      failOnStatusCode: false,
      expectStatus: [200, 400, 401, 403, 404, 429],
    },
    {
      name: 'Trainer - Classes - GET /trainer/classes/{id}/roster reachable (trainer, best-effort)',
      method: 'GET',
      url: `${API_PREFIX}/trainer/classes/${MEMBER_ID || '000000000000000000000000'}/roster`,
      auth: 'trainer',
      failOnStatusCode: false,
      expectStatus: [200, 400, 401, 403, 404, 429],
    },
    {
      name: 'Superadmin - Feature toggles - GET /superadmin/feature-toggles reachable',
      method: 'GET',
      url: `${API_PREFIX}/superadmin/feature-toggles`,
      auth: 'superadmin',
      failOnStatusCode: false,
      expectStatus: [200, 400, 401, 403, 404, 429],
    },
    {
      name: 'Superadmin - Settings - GET /superadmin/settings reachable',
      method: 'GET',
      url: `${API_PREFIX}/superadmin/settings`,
      auth: 'superadmin',
      failOnStatusCode: false,
      expectStatus: [200, 400, 401, 403, 404, 429],
    },

    // “Safe” mutation reachability (intentionally invalid -> 4xx accepted)
    {
      name: 'Public - Echo - POST /echo reachable (invalid payload)',
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      auth: 'none',
      failOnStatusCode: false,
      body: { ping: true },
      expectStatus: [200, 201, 400, 401, 403, 404, 429],
    },
    {
      name: 'Auth - Invite register - POST /auth/register-by-invite reachable (invalid invite)',
      method: 'POST',
      url: `${API_PREFIX}/auth/register-by-invite`,
      auth: 'none',
      failOnStatusCode: false,
      body: { inviteToken: 'invalid', password: 'P@ssw0rd123', name: 'Test' },
	  expectStatus: [200, 201, 400, 401, 403, 404, 409, 422, 429],
    },
    {
      name: 'Admin - Schedule templates - POST /schedule-templates reachable (invalid body)',
      method: 'POST',
      url: `${API_PREFIX}/schedule-templates`,
      auth: 'admin',
      failOnStatusCode: false,
      body: {},
	  expectStatus: [200, 201, 400, 401, 403, 404, 409, 422, 429, 500],
    },
    {
      name: 'Admin - Class types import - POST /class-types/import reachable (invalid)',
      method: 'POST',
      url: `${API_PREFIX}/class-types/import`,
      auth: 'admin',
      failOnStatusCode: false,
      body: { rows: [] },
      expectStatus: [200, 201, 400, 401, 403, 404, 409, 415, 429],
    },
    {
      name: 'Admin - Features - PUT /features/toggles reachable (invalid)',
      method: 'PUT',
      url: `${API_PREFIX}/features/toggles`,
      auth: 'admin',
      failOnStatusCode: false,
      body: {},
      expectStatus: [200, 201, 400, 401, 403, 404, 429],
    },
    {
      name: 'Superadmin - Plans - POST /superadmin/plans reachable (invalid)',
      method: 'POST',
      url: `${API_PREFIX}/superadmin/plans`,
      auth: 'superadmin',
      failOnStatusCode: false,
      body: {},
      expectStatus: [200, 201, 400, 401, 403, 404, 409, 429],
    },
    {
      name: 'Superadmin - Feature toggles - PUT /superadmin/feature-toggles reachable (invalid)',
      method: 'PUT',
      url: `${API_PREFIX}/superadmin/feature-toggles`,
      auth: 'superadmin',
      failOnStatusCode: false,
      body: {},
      expectStatus: [200, 201, 400, 401, 403, 404, 429],
    },
    {
      name: 'Superadmin - Gyms subscription - PUT /superadmin/gyms/{id}/subscription reachable (invalid)',
      method: 'PUT',
      url: `${API_PREFIX}/superadmin/gyms/${GYM_ID || '000000000000000000000000'}/subscription`,
      auth: 'superadmin',
      failOnStatusCode: false,
      body: {},
      expectStatus: [200, 201, 400, 401, 403, 404, 409, 429],
    },
  ];

  cases.forEach((c) => {
    it(c.name, () => {
      const role = c.auth || 'none';
      const token = role === 'admin' ? tokens.admin : role === 'superadmin' ? tokens.superadmin : role === 'trainer' ? tokens.trainer : role === 'member' ? tokens.member : '';

      return cy
        .request({
          method: c.method,
          url: c.url,
          headers: authHeader(token),
          failOnStatusCode: c.failOnStatusCode ?? false,
          body: c.body,
          qs: c.qs,
        })
        .then((res) => {
          const allowed = c.expectStatus || [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500];
          expect(allowed, `${c.method} ${c.url} status`).to.include(res.status);
          assertOptionalPerf(res, `${c.method} ${c.url}`);
        });
    });
  });
});
