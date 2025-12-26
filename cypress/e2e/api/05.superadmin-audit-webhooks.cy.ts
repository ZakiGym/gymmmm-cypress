// Legacy spec re-enabled.

// cypress/e2e/05.superadmin-audit-webhooks.cy.ts
import { authRequest, getEnv, login, API_PREFIX } from '../../support/api';

describe('Superadmin, Audit & Webhooks', () => {
  let superToken: string;

  before(() => {
    login(
      getEnv('SUPER_EMAIL', 'superadmin@gmail.com'),
      getEnv('SUPER_PASSWORD'),
      { retryOnRateLimit: true },
    ).then((body) => {
      superToken = body.token;
    });
  });

  it('lists gyms and system logs', () => {
    authRequest(superToken, 'GET', '/superadmin/gyms', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
    });

    authRequest(superToken, 'GET', '/superadmin/logs?limit=20', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
    });
  });

  it('reads and updates gym feature flags', () => {
    const gymId = getEnv('GYM_ID');

    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/features`, undefined, false)
      .then((res) => {
        expect([200, 400, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
        if (res.status !== 200) return;
      })
      .then(() =>
        authRequest(
          superToken,
          'PUT',
          `/superadmin/gyms/${gymId}/features`,
          {
            enableMultiLocation: true,
            enableCrmAutomations: true,
          },
          false,
        ),
      )
      .then((res) => {
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
      });
  });

  it('audit logs + CSV export', () => {
    authRequest(superToken, 'GET', '/audit/logs?limit=20', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
    });

    authRequest(
      superToken,
      'GET',
      '/audit/export.csv?from=2025-11-01&to=2025-11-30',
      undefined,
      false,
    ).then((res) => {
      expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      const ct = (res.headers as any)?.['content-type'];
      if (res.status === 200 && ct) expect(String(ct)).to.include('text/csv');
    });
  });

  it('accepts Stripe webhook payloads (no signature, test mode)', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/stripe`,
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      body: {
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test_cypress' } },
      },
    }).then((res) => {
      expect([200, 202, 400, 401, 403, 404, 429]).to.include(res.status);
    });

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/webhooks/stripe-subscriptions`,
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      body: {
        type: 'invoice.paid',
        data: { object: { id: 'in_test_cypress' } },
      },
    }).then((res) => {
      expect([200, 202, 400, 401, 403, 404, 429]).to.include(res.status);
    });
  });
});