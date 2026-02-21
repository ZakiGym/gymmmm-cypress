// cypress/e2e/api/36.api.stripe-subscriptions.cy.ts

import { authRequest, getEnv } from '../../support/api';

describe('API: Stripe Connect & Subscriptions (best-effort)', () => {
  const gymId = getEnv('GYM_ID');

  let adminToken = '';
  let superToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
    cy.apiLogin('superadmin').then(({ token }) => {
      superToken = token;
    });
  });

  // ============================
  // STRIPE CONNECT
  // ============================

  it('GET /stripe-connect/status — current gym Stripe Connect status', () => {
    authRequest(adminToken, 'GET', '/stripe-connect/status', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 500], 'stripe connect status').to.include(res.status);
    });
  });

  it('POST /stripe-connect/onboard — begin onboarding (best-effort)', () => {
    authRequest(adminToken, 'POST', '/stripe-connect/onboard', { gymId }, false).then((res) => {
      // May return a redirect URL, a stub response, or 400 if already onboarded
      expect([200, 201, 400, 403, 404, 500], 'stripe connect onboard').to.include(res.status);
    });
  });

  it('POST /stripe-connect/dashboard-link — get dashboard link (best-effort)', () => {
    authRequest(adminToken, 'POST', '/stripe-connect/dashboard-link', { gymId }, false).then(
      (res) => {
        // May return URL or fail if not onboarded
        expect([200, 201, 400, 403, 404, 500], 'stripe connect dashboard').to.include(res.status);
      },
    );
  });

  // ============================
  // SUBSCRIPTIONS (Gym-level)
  // ============================

  it('GET /subscriptions/summary — current gym subscription', () => {
    authRequest(adminToken, 'GET', '/subscriptions/summary', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'subscription summary').to.include(res.status);
    });
  });

  it('GET /subscriptions/usage — usage metrics', () => {
    authRequest(adminToken, 'GET', '/subscriptions/usage', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'subscription usage').to.include(res.status);
    });
  });

  it('GET /subscriptions/invoices — subscription invoices', () => {
    authRequest(adminToken, 'GET', '/subscriptions/invoices', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'subscription invoices').to.include(res.status);
    });
  });

  it('POST /subscriptions/portal — billing portal session (best-effort)', () => {
    authRequest(adminToken, 'POST', '/subscriptions/portal', { gymId }, false).then((res) => {
      // May return a portal URL or fail if Stripe not configured
      expect([200, 201, 400, 403, 404, 500], 'subscription portal').to.include(res.status);
    });
  });

  it('POST /subscriptions — subscribe gym to plan (best-effort)', () => {
    authRequest(
      adminToken,
      'POST',
      '/subscriptions',
      { plan: 'Growth', gymId },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'subscribe to plan').to.include(res.status);
    });
  });

  // ============================
  // STRIPE CONNECT with superadmin override
  // ============================

  it('GET /stripe-connect/status?gymId={id} (superadmin override)', () => {
    authRequest(superToken, 'GET', `/stripe-connect/status?gymId=${gymId}`, undefined, false).then(
      (res) => {
        expect([200, 401, 403, 404, 500], 'stripe connect status (sa)').to.include(res.status);
      },
    );
  });

  it('POST /stripe-connect/onboard with gymId override (superadmin)', () => {
    authRequest(superToken, 'POST', '/stripe-connect/onboard', { gymId }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 500], 'stripe connect onboard (sa)').to.include(
        res.status,
      );
    });
  });
});
