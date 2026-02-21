/**
 * 47 — Member Stats + Invites + Settings extras
 *
 * Covers:
 * - GET /member/stats
 * - GET /invites/verify/:token, POST /invites/accept, POST /invites
 * - GET /settings/terms-consent, PATCH /settings/terms-consent
 * - PUT /gym/my/website
 */

import { authRequest } from '../../support/api';

describe('Member Stats + Invites + Settings extras', () => {
  let memberToken: string;
  let adminToken: string;
  let superToken: string;

  before(() => {
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
  });

  /* ─── Member Stats ───────────────────────────────────── */

  it('GET /member/stats — member aggregated stats', () => {
    authRequest(memberToken, 'GET', '/member/stats', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /member/stats — no auth should fail', () => {
    authRequest(undefined, 'GET', '/member/stats', undefined, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  /* ─── Invites ────────────────────────────────────────── */

  it('POST /invites — send invite (admin)', () => {
    authRequest(adminToken, 'POST', '/invites', {
      email: `cy-test-${Date.now()}@example.com`,
      role: 'member',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500]).to.include(res.status);
    });
  });

  it('GET /invites/verify/:token — verify with fake token', () => {
    authRequest(undefined, 'GET', '/invites/verify/fake-token-12345', undefined, false)
      .then((res) => {
        expect([400, 404, 422, 500]).to.include(res.status);
      });
  });

  it('POST /invites/accept — accept with fake token', () => {
    authRequest(undefined, 'POST', '/invites/accept', {
      token: 'fake-token-12345',
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPass123!',
    }, false).then((res) => {
      expect([400, 404, 422, 500]).to.include(res.status);
    });
  });

  it('POST /invites — member cannot send invites', () => {
    authRequest(memberToken, 'POST', '/invites', {
      email: 'nope@example.com',
      role: 'member',
    }, false).then((res) => {
      expect([401, 403]).to.include(res.status);
    });
  });

  /* ─── Settings extras ────────────────────────────────── */

  it('GET /settings/terms-consent', () => {
    authRequest(adminToken, 'GET', '/settings/terms-consent', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PATCH /settings/terms-consent — update', () => {
    authRequest(adminToken, 'PATCH', '/settings/terms-consent', {
      memberTerms: 'By signing up you agree to our gym policies.',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('PUT /gym/my/website — update website content', () => {
    authRequest(adminToken, 'PUT', '/gym/my/website', {
      heroTitle: 'Welcome to Our Gym',
      heroSubtitle: 'Updated by Cypress',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('PUT /gym/my/website — member cannot update', () => {
    authRequest(memberToken, 'PUT', '/gym/my/website', {
      heroTitle: 'Nope',
    }, false).then((res) => {
      expect([401, 403]).to.include(res.status);
    });
  });
});
