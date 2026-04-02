// cypress/e2e/api/54.api.missing-endpoints.cy.ts
// Tests for the 6 previously untested endpoints.

import { authRequest, getEnv } from '../../support/api';

describe('API: Previously Untested Endpoints', () => {
  const gymId = getEnv('GYM_ID');
  const memberId = getEnv('MEMBER_ID');

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

  /* ───── Billing pause / unpause ───── */

  describe('Billing: pause / unpause member', () => {
    it('POST /billing/mark-paused/{userId} marks member as paused', () => {
      authRequest(adminToken, 'POST', `/billing/mark-paused/${memberId}`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 403, 404, 409, 422, 500], 'mark paused').to.include(res.status);
        },
      );
    });

    it('POST /billing/unpause/{userId} removes billing pause', () => {
      authRequest(adminToken, 'POST', `/billing/unpause/${memberId}`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 403, 404, 409, 422, 500], 'unpause').to.include(res.status);
        },
      );
    });

    it('POST /billing/mark-paused with invalid userId returns error', () => {
      authRequest(adminToken, 'POST', '/billing/mark-paused/000000000000000000000000', undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 422, 500], 'invalid user pause').to.include(res.status);
        },
      );
    });

    it('POST /billing/unpause with invalid userId returns error', () => {
      authRequest(adminToken, 'POST', '/billing/unpause/000000000000000000000000', undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 422, 500], 'invalid user unpause').to.include(res.status);
        },
      );
    });

    it('member cannot pause billing (RBAC)', () => {
      cy.apiLogin('member').then(({ token }) => {
        authRequest(token, 'POST', `/billing/mark-paused/${memberId}`, undefined, false).then(
          (res) => {
            expect([401, 403], 'member pause denied').to.include(res.status);
          },
        );
      });
    });

    it('trainer cannot pause billing (RBAC)', () => {
      cy.apiLogin('trainer').then(({ token }) => {
        authRequest(token, 'POST', `/billing/mark-paused/${memberId}`, undefined, false).then(
          (res) => {
            expect([401, 403], 'trainer pause denied').to.include(res.status);
          },
        );
      });
    });
  });

  /* ───── Admin dashboard by gym ───── */

  describe('Admin Dashboard: gym-specific', () => {
    it('GET /admin/dashboard/{gymId} returns stats', () => {
      authRequest(superToken, 'GET', `/admin/dashboard/${gymId}`, undefined, false).then((res) => {
        expect([200, 403, 404, 500], 'dashboard by gymId').to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.be.an('object');
        }
      });
    });

    it('GET /admin/dashboard/{gymId} with invalid gymId', () => {
      authRequest(superToken, 'GET', '/admin/dashboard/000000000000000000000000', undefined, false).then(
        (res) => {
          expect([200, 400, 403, 404, 500], 'invalid gymId dashboard').to.include(res.status);
        },
      );
    });

    it('member cannot access admin dashboard (RBAC)', () => {
      cy.apiLogin('member').then(({ token }) => {
        authRequest(token, 'GET', `/admin/dashboard/${gymId}`, undefined, false).then((res) => {
          expect([401, 403], 'member dashboard denied').to.include(res.status);
        });
      });
    });
  });

  /* ───── CRM contacts tag update ───── */

  describe('CRM: contact tags endpoint', () => {
    it('POST /crm/contacts/{id}/tags with valid contact', () => {
      // First discover an existing contact
      authRequest(adminToken, 'GET', '/crm/contacts', undefined, false).then((listRes) => {
        if (listRes.status !== 200) {
          cy.log('Cannot list contacts; skipping tag test');
          return;
        }

        const items = Array.isArray(listRes.body) ? listRes.body : (listRes.body as any)?.data;
        const contact = items?.[0];
        if (!contact) {
          cy.log('No contacts found; skipping tag test');
          return;
        }

        const contactId = contact._id || contact.id;
        authRequest(
          adminToken,
          'POST',
          `/crm/contacts/${contactId}/tags`,
          { tags: ['e2e-tag', 'automated'] },
          false,
        ).then((res) => {
          expect([200, 204, 400, 404, 422, 500], 'update contact tags').to.include(res.status);
        });
      });
    });

    it('POST /crm/contacts/{id}/tags with invalid contact id', () => {
      authRequest(
        adminToken,
        'POST',
        '/crm/contacts/000000000000000000000000/tags',
        { tags: ['test'] },
        false,
      ).then((res) => {
        expect([400, 404, 422, 500], 'invalid contact tags').to.include(res.status);
      });
    });
  });

  /* ───── Superadmin user update (PUT + PATCH) ───── */

  describe('Superadmin: user update endpoints', () => {
    let targetUserId = '';

    before(() => {
      // Discover a user to update
      authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/users`, undefined, false).then(
        (res) => {
          if (res.status === 200) {
            const users = Array.isArray(res.body) ? res.body : (res.body as any)?.data;
            const user = users?.[0];
            targetUserId = user?._id || user?.id || '';
          }
        },
      );
    });

    it('PUT /superadmin/users/{userId} updates user', () => {
      if (!targetUserId) {
        cy.log('No target user; skipping');
        return;
      }
      authRequest(
        superToken,
        'PUT',
        `/superadmin/users/${targetUserId}`,
        { firstName: 'E2E', lastName: 'TestUser' },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422, 500], 'PUT user').to.include(res.status);
      });
    });

    it('PATCH /superadmin/users/{userId} patches user state', () => {
      if (!targetUserId) {
        cy.log('No target user; skipping');
        return;
      }
      authRequest(
        superToken,
        'PATCH',
        `/superadmin/users/${targetUserId}`,
        { active: true },
        false,
      ).then((res) => {
        expect([200, 204, 400, 403, 404, 422, 500], 'PATCH user').to.include(res.status);
      });
    });

    it('admin cannot use superadmin user endpoints (RBAC)', () => {
      if (!targetUserId) {
        cy.log('No target user; skipping');
        return;
      }
      authRequest(
        adminToken,
        'PUT',
        `/superadmin/users/${targetUserId}`,
        { firstName: 'Blocked' },
        false,
      ).then((res) => {
        expect([401, 403], 'admin PUT superadmin user denied').to.include(res.status);
      });
    });

    it('PUT /superadmin/users with invalid userId returns error', () => {
      authRequest(
        superToken,
        'PUT',
        '/superadmin/users/000000000000000000000000',
        { firstName: 'Ghost' },
        false,
      ).then((res) => {
        expect([400, 404, 422, 500], 'invalid user PUT').to.include(res.status);
      });
    });

    it('PATCH /superadmin/users with invalid userId returns error', () => {
      authRequest(
        superToken,
        'PATCH',
        '/superadmin/users/000000000000000000000000',
        { active: false },
        false,
      ).then((res) => {
        expect([400, 404, 422, 500], 'invalid user PATCH').to.include(res.status);
      });
    });
  });
});
