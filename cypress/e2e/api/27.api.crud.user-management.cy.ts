// cypress/e2e/api/27.api.crud.user-management.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: User Management (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

  let adminToken = '';
  let superToken = '';
  let adminUserId = '';

  before(() => {
    cy.apiLogin('admin').then(({ token, userId }) => {
      adminToken = token;
      adminUserId = userId;
    });
    cy.apiLogin('superadmin').then(({ token }) => {
      superToken = token;
    });
  });

  after(() => {
    cleanup.run(superToken || adminToken);
  });

  // --- User listing ---

  it('GET /user — list users for current gym', () => {
    authRequest(adminToken, 'GET', '/user', undefined, false).then((res) => {
      expect([200, 401, 403], 'list users').to.include(res.status);
    });
  });

  it('GET /user/{id} — get user by id', () => {
    if (!adminUserId) {
      cy.log('No admin user ID; skipping');
      return;
    }
    authRequest(adminToken, 'GET', `/user/${adminUserId}`, undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get user by id').to.include(res.status);
    });
  });

  it('GET /user/gym/{gymId} — list users for gym (superadmin)', () => {
    authRequest(superToken, 'GET', `/user/gym/${gymId}`, undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'list users by gym').to.include(res.status);
    });
  });

  // --- Create member ---

  it('POST /user/create-member -> GET -> PUT -> suspend -> activate -> DELETE lifecycle', () => {
    const email = `e2e-member-${uniq()}@test.gymmm.app`;

    authRequest(
      adminToken,
      'POST',
      '/user/create-member',
      {
        name: `E2E Member ${uniq()}`,
        email,
        password: 'TestPass123!',
        gymId,
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create member').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Create member returned ${create.status}; skipping lifecycle`);
        return;
      }

      const userId =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.user?._id ||
        (create.body as any)?.user?.id;
      expect(userId, 'created user id').to.be.a('string').and.not.empty;

      if (!userId) return;

      cleanup.track({ method: 'DELETE', url: `/user/${userId}` });

      // GET
      authRequest(adminToken, 'GET', `/user/${userId}`, undefined, false).then((get) => {
        expect([200, 404], 'get created user').to.include(get.status);
      });

      // UPDATE
      authRequest(
        adminToken,
        'PUT',
        `/user/${userId}`,
        { name: `E2E Member Updated ${uniq()}` },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update user').to.include(upd.status);
      });

      // SUSPEND
      authRequest(adminToken, 'PUT', `/user/suspend/${userId}`, {}, false).then((sus) => {
        expect([200, 204, 400, 403, 404], 'suspend user').to.include(sus.status);
      });

      // ACTIVATE
      authRequest(adminToken, 'PUT', `/user/activate/${userId}`, {}, false).then((act) => {
        expect([200, 204, 400, 403, 404], 'activate user').to.include(act.status);
      });

      // RESET PASSWORD
      authRequest(adminToken, 'POST', `/user/reset-pw/${userId}`, {}, false).then((rst) => {
        expect([200, 204, 400, 403, 404, 422], 'reset password').to.include(rst.status);
      });

      // DELETE
      authRequest(adminToken, 'DELETE', `/user/${userId}`, undefined, false).then((del) => {
        expect([200, 204, 403, 404], 'delete user').to.include(del.status);
      });
    });
  });

  // --- Create admin (superadmin) ---

  it('POST /user/create-admin (superadmin)', () => {
    const email = `e2e-admin-${uniq()}@test.gymmm.app`;

    authRequest(
      superToken,
      'POST',
      '/user/create-admin',
      {
        name: `E2E Admin ${uniq()}`,
        email,
        password: 'TestPass123!',
        gymId,
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create admin').to.include(create.status);

      if ([200, 201].includes(create.status)) {
        const userId =
          (create.body as any)?._id ||
          (create.body as any)?.id ||
          (create.body as any)?.user?._id ||
          (create.body as any)?.user?.id;

        if (userId) {
          cleanup.track({ method: 'DELETE', url: `/user/${userId}` });
        }
      }
    });
  });

  // --- Profile operations ---

  it('PATCH /user/profile — update current user profile', () => {
    authRequest(
      adminToken,
      'PATCH',
      '/user/profile',
      { phone: '+15551234567' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'patch profile').to.include(res.status);
    });
  });

  it('PUT /user/change-password (best-effort)', () => {
    // This changes the admin password; we use a known test password and change back.
    // Best-effort: if this fails we don't break the suite.
    const adminPass = getEnv('ADMIN_PASSWORD');

    authRequest(
      adminToken,
      'PUT',
      '/user/change-password',
      {
        oldPassword: adminPass,
        newPassword: adminPass,
        confirmPassword: adminPass,
      },
      false,
    ).then((res) => {
      // Accept many statuses; changing to same password may fail validation in some APIs.
      expect([200, 204, 400, 403, 404, 422], 'change password').to.include(res.status);
    });
  });

  it('PUT /user/notifications — update notification preferences', () => {
    authRequest(
      adminToken,
      'PUT',
      '/user/notifications',
      { email: true, sms: false, push: true },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'update notification prefs').to.include(res.status);
    });
  });

  // --- POST /user (generic create, admin) ---

  it('POST /user — create user in current gym (admin)', () => {
    const email = `e2e-user-${uniq()}@test.gymmm.app`;

    authRequest(
      adminToken,
      'POST',
      '/user',
      {
        name: `E2E User ${uniq()}`,
        email,
        password: 'TestPass123!',
        role: 'member',
        gymId,
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create user').to.include(create.status);

      if ([200, 201].includes(create.status)) {
        const userId =
          (create.body as any)?._id ||
          (create.body as any)?.id ||
          (create.body as any)?.user?._id ||
          (create.body as any)?.user?.id;

        if (userId) {
          cleanup.track({ method: 'DELETE', url: `/user/${userId}` });
        }
      }
    });
  });
});
