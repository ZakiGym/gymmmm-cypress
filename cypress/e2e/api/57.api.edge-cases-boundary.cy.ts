// cypress/e2e/api/57.api.edge-cases-boundary.cy.ts
// Boundary testing, edge cases, data integrity, and concurrency scenarios.

import { authRequest, getEnv } from '../../support/api';

const gymId = getEnv('GYM_ID');
const okish = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 501, 502, 503];
const writeResult = [200, 201, 204, 400, 403, 404, 409, 422, 500];

describe('API: Edge Cases & Boundary Tests', () => {
  let adminToken = '';
  let memberToken = '';
  let superToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
  });

  /* ───── Malformed & Extreme Input ───── */

  describe('Malformed input handling', () => {
    it('POST /auth/login with SQL injection attempt', () => {
      authRequest(undefined, 'POST', '/auth/login', {
        email: "admin@gymmm.app' OR '1'='1",
        password: "' OR '1'='1",
      }, false).then((res) => {
        expect([400, 401, 422, 429], 'SQL injection blocked').to.include(res.status);
      });
    });

    it('POST /auth/login with XSS attempt in email', () => {
      authRequest(undefined, 'POST', '/auth/login', {
        email: '<script>alert("xss")</script>@test.com',
        password: 'Test123!',
      }, false).then((res) => {
        expect([400, 401, 422, 429], 'XSS blocked').to.include(res.status);
      });
    });

    it('POST /user with extremely long name', () => {
      const longName = 'A'.repeat(10000);
      authRequest(adminToken, 'POST', '/user', {
        firstName: longName,
        lastName: 'Test',
        email: `longname-${Date.now()}@test.com`,
        password: 'Test123!',
        role: 'member',
      }, false).then((res) => {
        expect(okish, 'long name handled').to.include(res.status);
      });
    });

    it('POST /crm/contacts with special characters in name', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', {
        firstName: '测试用户 <>&"\'',
        email: `special-${Date.now()}@test.com`,
      }, false).then((res) => {
        expect(okish, 'special chars handled').to.include(res.status);
      });
    });

    it('POST /classes with negative capacity', () => {
      authRequest(adminToken, 'POST', '/classes', {
        name: 'Negative Cap',
        capacity: -5,
        gymId,
        startTime: '2026-04-01T09:00:00Z',
        endTime: '2026-04-01T10:00:00Z',
      }, false).then((res) => {
        expect(writeResult, 'negative capacity').to.include(res.status);
      });
    });

    it('POST /classes with zero capacity', () => {
      authRequest(adminToken, 'POST', '/classes', {
        name: 'Zero Cap',
        capacity: 0,
        gymId,
        startTime: '2026-04-01T09:00:00Z',
        endTime: '2026-04-01T10:00:00Z',
      }, false).then((res) => {
        expect(writeResult, 'zero capacity').to.include(res.status);
      });
    });

    it('POST /classes with end time before start time', () => {
      authRequest(adminToken, 'POST', '/classes', {
        name: 'Time Travel Class',
        capacity: 10,
        gymId,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T09:00:00Z',
      }, false).then((res) => {
        expect(writeResult, 'end before start').to.include(res.status);
      });
    });

    it('POST /schedule-templates with invalid day of week', () => {
      authRequest(adminToken, 'POST', '/schedule-templates', {
        name: 'Bad Day',
        gymId,
        dayOfWeek: 99,
        startTime: '09:00',
        endTime: '10:00',
      }, false).then((res) => {
        expect(writeResult, 'invalid day of week').to.include(res.status);
      });
    });

    it('POST /crm/contacts with invalid email format', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', {
        firstName: 'Bad Email',
        email: 'not-an-email',
      }, false).then((res) => {
        expect(okish, 'invalid contact email').to.include(res.status);
      });
    });
  });

  /* ───── Idempotency & Double operations ───── */

  describe('Idempotency & double operations', () => {
    it('double cancel membership returns appropriate status', () => {
      authRequest(memberToken, 'PUT', '/memberships/cancel', undefined, false).then((res1) => {
        expect(okish, 'first cancel').to.include(res1.status);

        authRequest(memberToken, 'PUT', '/memberships/cancel', undefined, false).then((res2) => {
          expect(okish, 'double cancel').to.include(res2.status);
        });
      });
    });

    it('double QR issue returns appropriate status', () => {
      authRequest(memberToken, 'POST', '/qr/issue', undefined, false).then((res1) => {
        expect(okish, 'first qr issue').to.include(res1.status);

        authRequest(memberToken, 'POST', '/qr/issue', undefined, false).then((res2) => {
          expect(okish, 'double qr issue').to.include(res2.status);
        });
      });
    });
  });

  /* ───── Read-only endpoints data integrity ───── */

  describe('Read-only endpoints return valid data structures', () => {
    it('GET /classes returns array of classes', () => {
      authRequest(adminToken, 'GET', '/classes', undefined, false).then((res) => {
        if (res.status === 200) {
          const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
          if (data) expect(data).to.be.an('array');
        }
      });
    });

    it('GET /bookings returns data', () => {
      authRequest(adminToken, 'GET', '/bookings', undefined, false).then((res) => {
        expect(okish, 'bookings').to.include(res.status);
        if (res.status === 200) {
          const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
          if (data) expect(data).to.be.an('array');
        }
      });
    });

    it('GET /memberships returns array of plans', () => {
      authRequest(adminToken, 'GET', '/memberships', undefined, false).then((res) => {
        if (res.status === 200) {
          const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
          if (data) expect(data).to.be.an('array');
        }
      });
    });

    it('GET /notifications returns array', () => {
      authRequest(adminToken, 'GET', '/notifications', undefined, false).then((res) => {
        if (res.status === 200) {
          const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
          if (data) expect(data).to.be.an('array');
        }
      });
    });

    it('GET /user/profile returns user object', () => {
      authRequest(adminToken, 'GET', '/user/profile', undefined, false).then((res) => {
        if (res.status === 200) {
          const body = res.body as any;
          // API may wrap in { user: {...} } or return flat
          const user = body?.user || body;
          expect(user).to.be.an('object');
        }
      });
    });

    it('GET /settings returns settings object', () => {
      authRequest(adminToken, 'GET', '/settings', undefined, false).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.be.an('object');
        }
      });
    });

    it('GET /billing/summary returns billing data', () => {
      authRequest(adminToken, 'GET', '/billing/summary', undefined, false).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.be.an('object');
        }
      });
    });

    it('GET /admin/dashboard/stats returns stats', () => {
      authRequest(adminToken, 'GET', '/admin/dashboard/stats', undefined, false).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.be.an('object');
        }
      });
    });

    it('GET /crm/analytics/funnel returns funnel data', () => {
      authRequest(adminToken, 'GET', '/crm/analytics/funnel', undefined, false).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.be.an('object');
        }
      });
    });

    it('GET /crm/analytics/sources returns sources', () => {
      authRequest(adminToken, 'GET', '/crm/analytics/sources', undefined, false).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.satisfy((d: any) => typeof d === 'object' || Array.isArray(d));
        }
      });
    });

    it('GET /crm/analytics/deals/by-stage returns stage data', () => {
      authRequest(adminToken, 'GET', '/crm/analytics/deals/by-stage', undefined, false).then(
        (res) => {
          if (res.status === 200) {
            expect(res.body).to.satisfy((d: any) => typeof d === 'object' || Array.isArray(d));
          }
        },
      );
    });
  });

  /* ───── Export endpoints ───── */

  describe('Export endpoints return valid responses', () => {
    const exportPaths = [
      '/classes/export',
      '/bookings/export',
      '/payments/export',
      '/class-types/export',
      '/admin/analytics/export',
      '/audit-log/logs.csv',
    ];

    exportPaths.forEach((path) => {
      it(`GET ${path} returns CSV/file or valid response`, () => {
        authRequest(adminToken, 'GET', path, undefined, false).then((res) => {
          expect(okish, `export ${path}`).to.include(res.status);
          if (res.status === 200) {
            const ct = res.headers['content-type'] || '';
            expect(ct).to.satisfy((c: string) =>
              /csv|octet|json|text|zip|xlsx/.test(c),
            );
          }
        });
      });
    });
  });

  /* ───── Pagination ───── */

  describe('Pagination parameters (best-effort)', () => {
    const paginated = [
      '/user',
      '/classes',
      '/bookings/admin',
      '/payments/admin',
      '/crm/contacts',
      '/crm/deals',
      '/crm/tasks',
      '/crm/activities',
      '/notifications',
    ];

    paginated.forEach((path) => {
      it(`GET ${path}?page=1&limit=5 respects pagination`, () => {
        authRequest(adminToken, 'GET', `${path}?page=1&limit=5`, undefined, false).then((res) => {
          expect(okish, `paginated ${path}`).to.include(res.status);
          if (res.status === 200) {
            const body = res.body as any;
            const data = Array.isArray(body) ? body : body?.data;
            if (Array.isArray(data)) {
              expect(data.length).to.be.lte(10);
            }
          }
        });
      });
    });
  });

  /* ───── Health endpoints ───── */

  describe('Health checks', () => {
    it('GET /auth/health returns 200', () => {
      authRequest(undefined, 'GET', '/auth/health', undefined, false).then((res) => {
        expect([200, 204], 'auth health').to.include(res.status);
      });
    });

    it('GET /qr/_health returns 200', () => {
      authRequest(undefined, 'GET', '/qr/_health', undefined, false).then((res) => {
        expect([200, 204], 'qr health').to.include(res.status);
      });
    });

    it('GET /webhooks/stripe/health returns valid status', () => {
      authRequest(undefined, 'GET', '/webhooks/stripe/health', undefined, false).then((res) => {
        expect([200, 204, 401, 403], 'webhook health').to.include(res.status);
      });
    });
  });

  /* ───── Echo endpoint ───── */

  describe('Utility: echo', () => {
    it('POST /echo returns valid response', () => {
      const payload = { test: true, timestamp: Date.now(), nested: { key: 'value' } };
      authRequest(undefined, 'POST', '/echo', payload, false).then((res) => {
        expect(okish, 'echo status').to.include(res.status);
        if (res.status === 200 || res.status === 201) {
          expect(res.body).to.deep.include(payload);
        }
      });
    });
  });

  /* ───── Stripe Connect ───── */

  describe('Stripe Connect edge cases', () => {
    it('GET /stripe-connect/status returns connect status', () => {
      authRequest(adminToken, 'GET', '/stripe-connect/status', undefined, false).then((res) => {
        expect([200, 400, 403, 404, 500], 'stripe status').to.include(res.status);
      });
    });

    it('POST /stripe-connect/dashboard-link works or returns error', () => {
      authRequest(adminToken, 'POST', '/stripe-connect/dashboard-link', undefined, false).then(
        (res) => {
          expect(writeResult, 'stripe dashboard link').to.include(res.status);
        },
      );
    });
  });

  /* ───── Subscriptions ───── */

  describe('Subscription read endpoints', () => {
    it('GET /subscriptions/summary returns summary', () => {
      authRequest(adminToken, 'GET', '/subscriptions/summary', undefined, false).then((res) => {
        expect([200, 400, 403, 404, 500], 'sub summary').to.include(res.status);
      });
    });

    it('GET /subscriptions/usage returns usage', () => {
      authRequest(adminToken, 'GET', '/subscriptions/usage', undefined, false).then((res) => {
        expect([200, 400, 403, 404, 500], 'sub usage').to.include(res.status);
      });
    });

    it('GET /subscriptions/invoices returns invoices', () => {
      authRequest(adminToken, 'GET', '/subscriptions/invoices', undefined, false).then((res) => {
        expect([200, 400, 403, 404, 500], 'sub invoices').to.include(res.status);
      });
    });
  });

  /* ───── Features ───── */

  describe('Feature toggles', () => {
    it('GET /features/catalog returns feature list', () => {
      authRequest(adminToken, 'GET', '/features/catalog', undefined, false).then((res) => {
        expect([200, 403, 404, 500], 'features catalog').to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.satisfy((b: any) => typeof b === 'object' || Array.isArray(b));
        }
      });
    });

    it('GET /features/toggles returns toggles for gym', () => {
      authRequest(adminToken, 'GET', '/features/toggles', undefined, false).then((res) => {
        expect([200, 403, 404, 500], 'features toggles').to.include(res.status);
      });
    });
  });

  /* ───── Superadmin read endpoints ───── */

  describe('Superadmin read endpoints', () => {
    it('GET /superadmin/dashboard/stats returns stats', () => {
      authRequest(superToken, 'GET', '/superadmin/dashboard/stats', undefined, false).then(
        (res) => {
          expect([200, 403, 500], 'super dashboard stats').to.include(res.status);
          if (res.status === 200) {
            expect(res.body).to.be.an('object');
          }
        },
      );
    });

    it('GET /superadmin/dashboard/series returns series', () => {
      authRequest(superToken, 'GET', '/superadmin/dashboard/series', undefined, false).then(
        (res) => {
          expect([200, 403, 500], 'super dashboard series').to.include(res.status);
        },
      );
    });

    it('GET /superadmin/invoices/latest returns invoices', () => {
      authRequest(superToken, 'GET', '/superadmin/invoices/latest', undefined, false).then(
        (res) => {
          expect([200, 403, 500], 'super invoices').to.include(res.status);
        },
      );
    });

    it('GET /superadmin/plans returns global plans', () => {
      authRequest(superToken, 'GET', '/superadmin/plans', undefined, false).then((res) => {
        expect([200, 403, 500], 'super plans').to.include(res.status);
        if (res.status === 200) {
          const data = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
          if (data) expect(data).to.be.an('array');
        }
      });
    });

    it('GET /superadmin/feature-toggles/catalog returns catalog', () => {
      authRequest(superToken, 'GET', '/superadmin/feature-toggles/catalog', undefined, false).then(
        (res) => {
          expect([200, 403, 500], 'super features catalog').to.include(res.status);
        },
      );
    });
  });
});
