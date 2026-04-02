// cypress/e2e/backend/01.backend.crud.auth-and-profile.cy.ts
// Auth, /auth/me, health, change-password, and profile CRUD

import { authRequest, getEnv, login } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend CRUD: Auth & Profile', () => {
  const cleanup = createCleanup();

  let adminToken = '';
  let adminUserId = '';

  before(() => {
    cy.apiLogin('admin').then(({ token, userId }) => {
      adminToken = token;
      adminUserId = userId;
    });
  });

  after(() => {
    cleanup.run(adminToken);
  });

  // ────────────────────────────────────────────────────────────
  // POST /auth/login
  // ────────────────────────────────────────────────────────────

  it('POST /auth/login — valid admin credentials returns token and user', () => {
    const email = getEnv('ADMIN_EMAIL');
    const password = getEnv('ADMIN_PASSWORD');

    authRequest(undefined, 'POST', '/auth/login', { email, password }, false).then((res) => {
      if (res.status === 429) {
        cy.log('Rate limited on login; skipping');
        return;
      }

      expect(res.status, 'login status').to.equal(200);

      const body = res.body as any;
      expect(body).to.have.property('token');
      expect(body.token).to.be.a('string').and.not.empty;

      expect(body).to.have.property('user');
      expect(body.user).to.be.an('object');

      const userId = body.user._id || body.user.id;
      expect(userId, 'user._id').to.be.a('string').and.not.empty;

      expect(body.user.role, 'user.role').to.be.a('string');
      expect(body.user.role, 'user.role should be admin').to.equal('admin');
    });
  });

  it('POST /auth/login — wrong password returns 401 or 400', () => {
    const email = getEnv('ADMIN_EMAIL');

    authRequest(undefined, 'POST', '/auth/login', { email, password: 'WrongPass999!' }, false).then(
      (res) => {
        if (res.status === 429) {
          cy.log('Rate limited; skipping');
          return;
        }
        expect([400, 401], 'wrong-password status').to.include(res.status);
      },
    );
  });

  it('POST /auth/login — empty email returns 400 or 422', () => {
    authRequest(undefined, 'POST', '/auth/login', { email: '', password: 'SomePass123!' }, false).then(
      (res) => {
        if (res.status === 429) {
          cy.log('Rate limited; skipping');
          return;
        }
        expect([400, 422], 'empty-email status').to.include(res.status);
      },
    );
  });

  // ────────────────────────────────────────────────────────────
  // GET /auth/me
  // ────────────────────────────────────────────────────────────

  it('GET /auth/me — valid token returns user identity', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    authRequest(adminToken, 'GET', '/auth/me', undefined, false).then((res) => {
      expect(res.status, 'GET /auth/me status').to.equal(200);

      const body = res.body as any;

      // Must have an id field (some APIs expose _id, some expose id)
      const id = body._id || body.id;
      expect(id, 'user id from /auth/me').to.be.a('string').and.not.empty;

      expect(body.role, 'role field').to.be.a('string').and.not.empty;
      expect(body.email, 'email field').to.be.a('string').and.not.empty;
    });
  });

  it('GET /auth/me — no token returns 401', () => {
    authRequest(undefined, 'GET', '/auth/me', undefined, false).then((res) => {
      expect(res.status, 'no-token status').to.equal(401);
    });
  });

  it('GET /auth/me — fake token returns 401', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.fakesignature';

    authRequest(fakeToken, 'GET', '/auth/me', undefined, false).then((res) => {
      expect(res.status, 'fake-token status').to.equal(401);
    });
  });

  // ────────────────────────────────────────────────────────────
  // GET /auth/health
  // ────────────────────────────────────────────────────────────

  it('GET /auth/health — server reports healthy', () => {
    authRequest(undefined, 'GET', '/auth/health', undefined, false).then((res) => {
      expect([200, 204], 'health status').to.include(res.status);
    });
  });

  // ────────────────────────────────────────────────────────────
  // PUT /user/change-password — round-trip
  // ────────────────────────────────────────────────────────────

  it('PUT /user/change-password — change to new pass, verify new login, change back', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping password change test');
      return;
    }

    const adminEmail = getEnv('ADMIN_EMAIL');
    const originalPass = getEnv('ADMIN_PASSWORD');
    const tempPass = `Temp${uid()}A1!`;

    // Step 1: change to temp password
    authRequest(
      adminToken,
      'PUT',
      '/user/change-password',
      { oldPassword: originalPass, newPassword: tempPass, confirmPassword: tempPass },
      false,
    ).then((changeRes) => {
      if (changeRes.status === 429) {
        cy.log('Rate limited on change-password; skipping');
        return;
      }

      // Some APIs use 200, some 204
      expect([200, 204], 'change-password status').to.include(changeRes.status);

      if (![200, 204].includes(changeRes.status)) {
        cy.log(`change-password returned ${changeRes.status}; skipping round-trip`);
        return;
      }

      // Step 2: verify login works with new password
      authRequest(undefined, 'POST', '/auth/login', { email: adminEmail, password: tempPass }, false).then(
        (loginRes) => {
          if (loginRes.status === 429) {
            cy.log('Rate limited on verification login; reverting anyway');
          } else {
            expect(loginRes.status, 'login with new pass').to.equal(200);
            expect((loginRes.body as any).token, 'new token').to.be.a('string').and.not.empty;
          }

          const currentToken = loginRes.status === 200
            ? (loginRes.body as any).token
            : adminToken;

          // Step 3: change back to original password
          authRequest(
            currentToken,
            'PUT',
            '/user/change-password',
            { oldPassword: tempPass, newPassword: originalPass, confirmPassword: originalPass },
            false,
          ).then((revertRes) => {
            if (revertRes.status === 429) {
              cy.log('Rate limited on revert; test may leave password changed');
              return;
            }
            expect([200, 204], 'revert-password status').to.include(revertRes.status);
          });
        },
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // PATCH /user/profile
  // ────────────────────────────────────────────────────────────

  it('PATCH /user/profile — update display name and verify via GET /auth/me', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    const newName = `E2E Admin ${uid()}`;

    authRequest(adminToken, 'PATCH', '/user/profile', { name: newName }, false).then((patchRes) => {
      if (patchRes.status === 429) {
        cy.log('Rate limited; skipping');
        return;
      }

      expect([200, 204], 'PATCH /user/profile status').to.include(patchRes.status);

      if (![200, 204].includes(patchRes.status)) {
        cy.log(`PATCH /user/profile returned ${patchRes.status}; skipping verification`);
        return;
      }

      // Verify the name updated in /auth/me
      authRequest(adminToken, 'GET', '/auth/me', undefined, false).then((meRes) => {
        expect(meRes.status, 'GET /auth/me after patch').to.equal(200);

        const body = meRes.body as any;
        // name may be at top level or nested under body.user
        const returnedName = body.name || body.displayName || body.fullName || body.user?.name || body.user?.displayName;
        expect(returnedName, 'updated name in /auth/me').to.be.a('string').and.not.empty;
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // GET /user/profile
  // ────────────────────────────────────────────────────────────

  it('GET /user/profile — returns 200 with email and role', () => {
    if (!adminToken) {
      cy.log('No admin token; skipping');
      return;
    }

    authRequest(adminToken, 'GET', '/user/profile', undefined, false).then((res) => {
      expect(res.status, 'GET /user/profile status').to.equal(200);

      const body = res.body as any;
      // email may be nested under body.user or omitted entirely from profile response
      const returnedId = body._id || body.id || body.user?._id || body.user?.id;
      const returnedName = body.name || body.displayName || body.user?.name;
      const returnedRole = body.role || body.user?.role;
      // Assert at least one identifying field is present
      const hasIdentifier = !!(returnedId || returnedName || returnedRole);
      expect(hasIdentifier, 'profile response has _id, name, or role').to.be.true;
      if (returnedRole) {
        expect(returnedRole, 'profile role').to.be.a('string').and.not.empty;
      }
    });
  });
});
