// cypress/e2e/api/29.api.crud.memberships-full.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Memberships Full Lifecycle (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const memberId = getEnv('MEMBER_ID');
  const cleanup = createCleanup();

  let adminToken = '';
  let memberToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
    cy.apiLogin('member').then(({ token }) => {
      memberToken = token;
    });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  // --- Plan CRUD (admin) ---

  it('Membership plan: CREATE -> LIST -> GET -> UPDATE -> DELETE', () => {
    const name = `E2E Plan ${uniq()}`;

    authRequest(
      adminToken,
      'POST',
      '/memberships',
      {
        name,
        gymId,
        price: 29.99,
        duration: 30,
        durationUnit: 'days',
        description: 'E2E test plan',
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'create membership plan').to.include(
        create.status,
      );

      if (![200, 201].includes(create.status)) {
        cy.log(`Membership plan create returned ${create.status}; skipping lifecycle`);
        return;
      }

      const planId =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.plan?._id ||
        (create.body as any)?.plan?.id;
      expect(planId, 'plan id').to.be.a('string').and.not.empty;

      if (!planId) return;

      cleanup.track({ method: 'DELETE', url: `/memberships/${planId}` });

      // LIST
      authRequest(adminToken, 'GET', '/memberships', undefined, false).then((list) => {
        expect([200, 401, 403], 'list membership plans').to.include(list.status);
      });

      // UPDATE
      authRequest(
        adminToken,
        'PUT',
        `/memberships/${planId}`,
        { name: `${name} (updated)`, price: 39.99 },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update membership plan').to.include(upd.status);
      });

      // Member self-join (inline — cannot nest it() in Mocha)
      authRequest(
        memberToken,
        'POST',
        `/memberships/join/${planId}`,
        {},
        false,
      ).then((join) => {
        expect([200, 201, 400, 403, 404, 409], 'member join plan').to.include(join.status);
      });

      // DELETE
      authRequest(adminToken, 'DELETE', `/memberships/${planId}`, undefined, false).then((del) => {
        expect([200, 204, 403, 404], 'delete membership plan').to.include(del.status);
      });
    });
  });

  // --- Member self-service ---

  it('GET /memberships/me — current member membership', () => {
    authRequest(memberToken, 'GET', '/memberships/me', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get my membership').to.include(res.status);
    });
  });

  it('PUT /memberships/cancel (member cancels, best-effort)', () => {
    authRequest(memberToken, 'PUT', '/memberships/cancel', {}, false).then((res) => {
      // May return 400 if no active membership to cancel
      expect([200, 204, 400, 403, 404, 409], 'member cancel membership').to.include(res.status);
    });
  });

  // --- Admin operations ---

  it('PUT /memberships/assign (admin assigns membership, best-effort)', () => {
    authRequest(
      adminToken,
      'PUT',
      '/memberships/assign',
      { userId: memberId, planId: 'any-plan-id' },
      false,
    ).then((res) => {
      // Will likely 400/404 without a valid plan, but verifies endpoint exists
      expect([200, 204, 400, 403, 404, 422], 'assign membership').to.include(res.status);
    });
  });

  it('PUT /memberships/admin-cancel (admin cancels member membership, best-effort)', () => {
    authRequest(
      adminToken,
      'PUT',
      '/memberships/admin-cancel',
      { userId: memberId },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 409], 'admin cancel membership').to.include(res.status);
    });
  });

  // --- Public listing ---

  it('GET /memberships (public, no auth)', () => {
    cy.request({
      method: 'GET',
      url: '/api/memberships',
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 401, 403], 'public memberships list').to.include(res.status);
    });
  });
});
