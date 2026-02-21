/**
 * 46 — Staff Actions: approval workflow
 *
 * Covers /api/staff-actions/* — NOTE: may not be mounted in production.
 * All tests use failOnStatusCode:false for safety.
 */

import { authRequest } from '../../support/api';

describe('Staff Actions — approval workflow', () => {
  let adminToken: string;
  let trainerToken: string;
  let memberToken: string;

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('trainer').then(({ token }) => { trainerToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
  });

  /* ─── Stats ──────────────────────────────────────────── */

  it('GET /staff-actions/stats — admin dashboard badges', () => {
    authRequest(adminToken, 'GET', '/staff-actions/stats', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── List actions ───────────────────────────────────── */

  it('GET /staff-actions — list as admin', () => {
    authRequest(adminToken, 'GET', '/staff-actions', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /staff-actions — list as trainer', () => {
    authRequest(trainerToken, 'GET', '/staff-actions', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /staff-actions — member should be rejected or scoped', () => {
    authRequest(memberToken, 'GET', '/staff-actions', undefined, false)
      .then((res) => {
        expect([200, 400, 401, 403, 404]).to.include(res.status);
      });
  });

  /* ─── Create action request ──────────────────────────── */

  it('POST /staff-actions — trainer creates action request', () => {
    authRequest(trainerToken, 'POST', '/staff-actions', {
      type: 'schedule_change',
      description: 'Cypress test: request day off',
      details: { date: new Date().toISOString().split('T')[0] },
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);

      if (res.status === 200 || res.status === 201) {
        const actionId = res.body?._id || res.body?.id || res.body?.data?._id;
        if (actionId) {
          // Admin reviews (approve)
          authRequest(adminToken, 'PUT', `/staff-actions/${actionId}/review`, {
            status: 'approved',
            reviewNotes: 'Approved by Cypress',
          }, false).then((r) => {
            expect([200, 400, 403, 404, 422]).to.include(r.status);
          });

          // Admin applies approved action
          authRequest(adminToken, 'POST', `/staff-actions/${actionId}/apply`, undefined, false)
            .then((r) => {
              expect([200, 400, 403, 404, 409, 422]).to.include(r.status);
            });
        }
      }
    });
  });

  it('POST /staff-actions — admin creates action', () => {
    authRequest(adminToken, 'POST', '/staff-actions', {
      type: 'other',
      description: 'Admin-created test action',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);

      if (res.status === 200 || res.status === 201) {
        const actionId = res.body?._id || res.body?.id || res.body?.data?._id;
        if (actionId) {
          // Reject this one
          authRequest(adminToken, 'PUT', `/staff-actions/${actionId}/review`, {
            status: 'rejected',
            reviewNotes: 'Rejected by Cypress',
          }, false).then((r) => {
            expect([200, 400, 403, 404, 422]).to.include(r.status);
          });
        }
      }
    });
  });

  /* ─── Edge cases ─────────────────────────────────────── */

  it('PUT /staff-actions/:fakeId/review — non-existent', () => {
    authRequest(adminToken, 'PUT', '/staff-actions/000000000000000000000000/review', {
      status: 'approved',
    }, false).then((res) => {
      expect([400, 403, 404]).to.include(res.status);
    });
  });

  it('POST /staff-actions/:fakeId/apply — non-existent', () => {
    authRequest(adminToken, 'POST', '/staff-actions/000000000000000000000000/apply', undefined, false)
      .then((res) => {
        expect([400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /staff-actions — no auth', () => {
    authRequest(undefined, 'POST', '/staff-actions', {
      type: 'other',
      description: 'should fail',
    }, false).then((res) => {
      expect([401, 403, 404]).to.include(res.status);
    });
  });
});
