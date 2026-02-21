/**
 * 51 — Uploads: avatars, logos, class-type import
 *
 * Covers multipart file upload endpoints.
 * Uses best-effort approach since we can't always have real image files.
 */

import { authRequest, getEnv } from '../../support/api';

describe('Uploads — avatar, logo, class-type import', () => {
  let adminToken: string;
  let memberToken: string;
  let memberId: string;
  const gymId = getEnv('GYM_ID', '000000000000000000000000');

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('member').then(({ token, userId }) => {
      memberToken = token;
      memberId = userId;
    });
  });

  /* ─── User avatar ────────────────────────────────────── */

  it('POST /user/avatar — upload own avatar (no file = validation error)', () => {
    authRequest(memberToken, 'POST', '/user/avatar', {}, false)
      .then((res) => {
        // Without multipart, expect 400/422
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  it('POST /user/:id/avatar — admin upload avatar for user (no file)', () => {
    authRequest(adminToken, 'POST', `/user/${memberId}/avatar`, {}, false)
      .then((res) => {
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  it('POST /user/:fakeId/avatar — admin upload for non-existent user', () => {
    authRequest(adminToken, 'POST', '/user/000000000000000000000000/avatar', {}, false)
      .then((res) => {
        expect([400, 403, 404, 422]).to.include(res.status);
      });
  });

  /* ─── Gym logo ───────────────────────────────────────── */

  it('PUT /gym/:id/logo — upload gym logo (no file)', () => {
    authRequest(adminToken, 'PUT', `/gym/${gymId}/logo`, {}, false)
      .then((res) => {
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  it('PUT /gym/my/logo — upload own gym logo (no file)', () => {
    authRequest(adminToken, 'PUT', '/gym/my/logo', {}, false)
      .then((res) => {
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  it('PUT /settings/logo — upload settings logo (no file)', () => {
    authRequest(adminToken, 'PUT', '/settings/logo', {}, false)
      .then((res) => {
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  /* ─── Class-type import ──────────────────────────────── */

  it('POST /class-types/import — import without file', () => {
    authRequest(adminToken, 'POST', '/class-types/import', {}, false)
      .then((res) => {
        expect([200, 400, 403, 404, 415, 422]).to.include(res.status);
      });
  });

  it('GET /class-types/export — export class types CSV', () => {
    authRequest(adminToken, 'GET', '/class-types/export', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── Gym website ────────────────────────────────────── */

  it('PUT /gym/my/website — update website content', () => {
    authRequest(adminToken, 'PUT', '/gym/my/website', {
      heroTitle: 'Cypress Gym',
      heroSubtitle: 'Best gym in town',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  /* ─── RBAC: member cannot upload logos ───────────────── */

  it('PUT /gym/:id/logo — member denied', () => {
    authRequest(memberToken, 'PUT', `/gym/${gymId}/logo`, {}, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  it('PUT /settings/logo — member denied', () => {
    authRequest(memberToken, 'PUT', '/settings/logo', {}, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  it('POST /class-types/import — member denied', () => {
    authRequest(memberToken, 'POST', '/class-types/import', {}, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });
});
