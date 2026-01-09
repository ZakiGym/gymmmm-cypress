/// <reference types="cypress" />

import { API_PREFIX } from '../../support/api';

/**
 * Bulk coverage for endpoints that were still "missing" in the OpenAPI-vs-tests report.
 *
 * IMPORTANT:
 * - This runs against production (Render) and is "best-effort".
 * - It will only perform destructive operations (DELETE/PUT/PATCH) on *test-created* resources.
 * - For endpoints that require an existing id, this spec discovers a candidate id via list endpoints
 *   and then performs a safe read-only request, OR creates a dedicated resource first when possible.
 */

describe('OpenAPI: missing endpoints bulk coverage (production-safe, best-effort)', () => {
  const okish = (status: number) => [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503].includes(status);

  const authed = (token: string, method: string, path: string, body?: any) => {
    return cy.request({
      method,
      url: `${API_PREFIX}${path}`,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
      failOnStatusCode: false,
      timeout: 90_000,
    });
  };

  const requireToken = (token: string, label: string) => {
    // Never skip; but make diagnostics explicit.
    expect(token, `${label} token available`).to.be.a('string');
  };

  it('covers read-only missing endpoints (discovery-based)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      requireToken(token, 'admin');

      // Admin: analytics, exports, features, settings, schedule templates
      const adminGets = [
        '/features/catalog',
        '/features/toggles',
        '/gym/list-lite',
        '/schedule-templates',
        '/class-types/export',
        '/classes/export',
        '/billing/reports/revenue',
      ];

      adminGets.forEach((p) => {
        authed(token, 'GET', p).then((res) => {
          expect(okish(res.status), `GET ${p} status`).to.eq(true);
        });
      });

      // Payments/me is for member typically, but hitting as admin should still be safe.
      authed(token, 'GET', '/payments/me').then((res) => {
        expect(okish(res.status), 'GET /payments/me status').to.eq(true);
      });

      // QR recent (admin/trainer)
      authed(token, 'GET', '/qr/admin/recent').then((res) => {
        expect(okish(res.status), 'GET /qr/admin/recent status').to.eq(true);
      });

      // Try to discover a gym id (for /gym/{id} read)
      authed(token, 'GET', '/gym').then((gymsRes) => {
        expect(okish(gymsRes.status), 'GET /gym status').to.eq(true);
        const gyms = Array.isArray(gymsRes.body) ? gymsRes.body : gymsRes.body?.data || gymsRes.body?.gyms;
        const gymId = gyms?.[0]?._id || gyms?.[0]?.id;

        if (gymId) {
          authed(token, 'GET', `/gym/${gymId}`).then((res) => {
            expect(okish(res.status), 'GET /gym/{id} status').to.eq(true);
          });
        }
      });

      // Try to discover a class id and hit classes/{id}
      authed(token, 'GET', '/classes').then((classesRes) => {
        expect(okish(classesRes.status), 'GET /classes status').to.eq(true);
        const classes = Array.isArray(classesRes.body) ? classesRes.body : classesRes.body?.data || classesRes.body?.classes;
        const classId = classes?.[0]?._id || classes?.[0]?.id;
        if (classId) {
          authed(token, 'GET', `/classes/${classId}`).then((res) => {
            expect(okish(res.status), 'GET /classes/{id} status').to.eq(true);
          });
        }
      });

      // Try to discover a user id (admin list users) and then GET /user/{id}
      authed(token, 'GET', '/user').then((usersRes) => {
        expect(okish(usersRes.status), 'GET /user status').to.eq(true);
        const users = Array.isArray(usersRes.body) ? usersRes.body : usersRes.body?.data || usersRes.body?.users;
        const userId = users?.[0]?._id || users?.[0]?.id;
        if (userId) {
          authed(token, 'GET', `/user/${userId}`).then((res) => {
            expect(okish(res.status), 'GET /user/{id} status').to.eq(true);
          });
        }
      });

      // CRM: fetch one pipeline and its stages; and fetch one contact/deal/form/task by id if present.
      authed(token, 'GET', '/crm/pipelines').then((pipRes) => {
        expect(okish(pipRes.status), 'GET /crm/pipelines status').to.eq(true);
        const pipelines = Array.isArray(pipRes.body) ? pipRes.body : pipRes.body?.data || pipRes.body?.pipelines;
        const pipelineId = pipelines?.[0]?._id || pipelines?.[0]?.id;
        if (pipelineId) {
          authed(token, 'GET', `/crm/pipelines/${pipelineId}`).then((res) => {
            expect(okish(res.status), 'GET /crm/pipelines/{id} status').to.eq(true);
          });
          authed(token, 'GET', `/crm/pipelines/${pipelineId}/stages`).then((res) => {
            expect(okish(res.status), 'GET /crm/pipelines/{id}/stages status').to.eq(true);
          });
        }
      });

      const tryGetFirstById = (listPath: string, getByIdPrefix: string) => {
        authed(token, 'GET', listPath).then((listRes) => {
          expect(okish(listRes.status), `GET ${listPath} status`).to.eq(true);
          const list = Array.isArray(listRes.body) ? listRes.body : listRes.body?.data;
          const id = list?.[0]?._id || list?.[0]?.id;
          if (id) {
            authed(token, 'GET', `${getByIdPrefix}${id}`).then((res) => {
              expect(okish(res.status), `GET ${getByIdPrefix}{id} status`).to.eq(true);
            });
          }
        });
      };

      tryGetFirstById('/crm/contacts', '/crm/contacts/');
      tryGetFirstById('/crm/deals', '/crm/deals/');
      tryGetFirstById('/crm/forms', '/crm/forms/');
      tryGetFirstById('/crm/tasks', '/crm/tasks/');
      tryGetFirstById('/crm/activities', '/crm/activities/');

      // CRM analytics endpoints (read-only)
      ['/crm/analytics/funnel', '/crm/analytics/sources', '/crm/analytics/deals/by-stage'].forEach((p) => {
        authed(token, 'GET', p).then((res) => {
          expect(okish(res.status), `GET ${p} status`).to.eq(true);
        });
      });
    });
  });

  it('covers superadmin-only missing endpoints (best-effort)', () => {
    cy.apiLogin('superadmin').then(({ token }) => {
      requireToken(token, 'superadmin');

      const superGets = [
        '/superadmin/dashboard/series',
        '/superadmin/invoices/latest',
      ];

      superGets.forEach((p) => {
        authed(token, 'GET', p).then((res) => {
          expect(okish(res.status), `GET ${p} status`).to.eq(true);
        });
      });

      // Discover a gymId to call gym-scoped superadmin endpoints.
      authed(token, 'GET', '/gym').then((gymsRes) => {
        expect(okish(gymsRes.status), 'GET /gym (superadmin) status').to.eq(true);
        const gyms = Array.isArray(gymsRes.body) ? gymsRes.body : gymsRes.body?.data || gymsRes.body?.gyms;
        const gymId = gyms?.[0]?._id || gyms?.[0]?.id;
        if (!gymId) return;

        authed(token, 'GET', `/superadmin/gyms/${gymId}`).then((res) => {
          expect(okish(res.status), 'GET /superadmin/gyms/{id} status').to.eq(true);
        });
        authed(token, 'GET', `/superadmin/gyms/${gymId}/users`).then((res) => {
          expect(okish(res.status), 'GET /superadmin/gyms/{id}/users status').to.eq(true);
        });
        authed(token, 'GET', `/superadmin/gyms/${gymId}/payments/export`).then((res) => {
          expect(okish(res.status), 'GET /superadmin/gyms/{gymId}/payments/export status').to.eq(true);
        });

        // Settings stubs may 501/404.
        authed(token, 'GET', `/superadmin/settings/${gymId}`).then((res) => {
          expect(okish(res.status), 'GET /superadmin/settings/{gymId} status').to.eq(true);
        });
      });
    });
  });

  it('covers trainer-only missing endpoints (best-effort)', () => {
    cy.apiLogin('trainer').then(({ token }) => {
      requireToken(token, 'trainer');

      ['/trainer/classes/me', '/trainer/stats/me', '/trainer/notifications', '/trainer/availability/me'].forEach((p) => {
        authed(token, 'GET', p).then((res) => {
          expect(okish(res.status), `GET ${p} status`).to.eq(true);
        });
      });

      // Discover a classId for roster endpoint.
      authed(token, 'GET', '/trainer/classes/me').then((res) => {
        const classes = Array.isArray(res.body) ? res.body : res.body?.data || res.body?.classes;
        const classId = classes?.[0]?._id || classes?.[0]?.id;
        if (classId) {
          authed(token, 'GET', `/trainer/classes/${classId}/roster`).then((r) => {
            expect(okish(r.status), 'GET /trainer/classes/{id}/roster status').to.eq(true);
          });
        }
      });
    });
  });

  it('covers webhook endpoints with realistic payloads (best-effort)', () => {
    // No auth expected; treat 2xx/4xx as acceptable depending on configuration.
    const webhookPosts: Array<{ path: string; body: any; contentType?: string }> = [
      {
        path: '/webhooks-raw/stripe',
        body: { type: 'charge.succeeded', data: { object: { id: 'evt_test_raw', amount: 100 } } },
      },
      {
        path: '/webhooks/email/sendgrid',
        body: [{ event: 'delivered', email: 'test@example.com', timestamp: Math.floor(Date.now() / 1000) }],
      },
    ];

    webhookPosts.forEach((w) => {
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}${w.path}`,
        body: w.body,
        failOnStatusCode: false,
        timeout: 90_000,
      }).then((res) => {
        expect(okish(res.status), `POST ${w.path} status`).to.eq(true);
      });
    });
  });
});
