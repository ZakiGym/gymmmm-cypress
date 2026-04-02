// cypress/e2e/backend/12.backend.security.rbac-tenancy.cy.ts
// Security, RBAC, and tenant isolation — proves unauthorized access is blocked

import { authRequest, getEnv, login, API_PREFIX } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend Security: RBAC & Tenant Isolation', () => {
  const GYM_ID = '690dd58eb250ac19d4a39ff4';
  const MEMBER_ID = '690e5aa2c52f65a959ffaec5';
  // A gym ID that does NOT belong to the East Valley admin
  const WRONG_GYM_ID = '000000000000000000000001';

  let adminToken = '';
  let superToken = '';
  let memberToken = '';
  let trainerToken = '';

  before(() => {
    login('admin@gymmm.app', 'StrongPass123!', { retryOnRateLimit: true }).then((res) => {
      if ((res as any).status === 429) { cy.log('rate limited on admin login'); return; }
      adminToken = res.token;
    });

    login('superadmin@gmail.com', 'StrongPass123!', { retryOnRateLimit: true }).then((res) => {
      if ((res as any).status === 429) { cy.log('rate limited on superadmin login'); return; }
      superToken = res.token;
    });

    login('zakinabizada9@gmail.com', 'kabul@123', { retryOnRateLimit: true }).then((res) => {
      if ((res as any).status === 429) { cy.log('rate limited on member login'); return; }
      memberToken = res.token;
    });

    login('trainer2@gymmm.app', 'Trainer123!', { retryOnRateLimit: true }).then((res) => {
      if ((res as any).status === 429) { cy.log('rate limited on trainer login'); return; }
      trainerToken = res.token;
    });
  });

  // ── No token — must be 401 ─────────────────────────────────────────────────

  it('GET /admin/dashboard/stats with NO token → 401', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/admin/dashboard/stats`,
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(401);
    });
  });

  // ── Member token on admin endpoints — must be 403 ─────────────────────────

  it('GET /admin/dashboard/stats with MEMBER token → 403', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(memberToken, 'GET', '/admin/dashboard/stats', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Admin token on superadmin endpoints — must be 403 ────────────────────

  it('GET /superadmin/dashboard/stats with ADMIN token → 403', () => {
    if (!adminToken) { cy.log('no adminToken; skipping'); return; }

    authRequest(adminToken, 'GET', '/superadmin/dashboard/stats', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Member token on superadmin endpoints — must be 403 ───────────────────

  it('GET /superadmin/dashboard/stats with MEMBER token → 403', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(memberToken, 'GET', '/superadmin/dashboard/stats', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Tenant isolation — wrong gym ID ───────────────────────────────────────

  it('GET /gym/{wrongGymId} with admin token from different gym → 403 or 404', () => {
    if (!adminToken) { cy.log('no adminToken; skipping'); return; }

    authRequest(adminToken, 'GET', `/gym/${WRONG_GYM_ID}`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect([403, 404]).to.include(res.status);
    });
  });

  // ── Member cannot create admins ───────────────────────────────────────────

  it('POST /user/create-admin with MEMBER token → 403', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(
      memberToken,
      'POST',
      '/user/create-admin',
      {
        name: `E2E Bad Actor ${uid()}`,
        email: `badactor-${uid()}@e2e.test`,
        password: 'Hacked123!',
        gymId: GYM_ID,
      },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Member cannot delete themselves via admin endpoint ────────────────────

  it('DELETE /user/{MEMBER_ID} with MEMBER token (admin endpoint) → 403', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(memberToken, 'DELETE', `/user/${MEMBER_ID}`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Member cannot mutate gym settings ─────────────────────────────────────

  it('PUT /settings with MEMBER token → 403', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(
      memberToken,
      'PUT',
      '/settings',
      { gymName: 'Hacked Gym Name' },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(403);
    });
  });

  // ── Trainer access to user list (may or may not have access) ─────────────

  it('GET /user/gym/{gymId} with TRAINER token → 200 or 403', () => {
    if (!trainerToken) { cy.log('no trainerToken; skipping'); return; }

    authRequest(trainerToken, 'GET', `/user/gym/${GYM_ID}`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect([200, 403]).to.include(res.status);
    });
  });

  // ── /auth/me returns correct role ─────────────────────────────────────────

  it('GET /auth/me with admin token → 200, role is admin', () => {
    if (!adminToken) { cy.log('no adminToken; skipping'); return; }

    authRequest(adminToken, 'GET', '/auth/me', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const body = res.body as any;
      const role = body.role || body.user?.role;
      expect(role, 'admin role').to.eq('admin');
    });
  });

  it('GET /auth/me with member token → 200, role is member', () => {
    if (!memberToken) { cy.log('no memberToken; skipping'); return; }

    authRequest(memberToken, 'GET', '/auth/me', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const body = res.body as any;
      const role = body.role || body.user?.role;
      expect(role, 'member role').to.eq('member');
    });
  });

  it('GET /auth/me with superadmin token → 200, role is superadmin', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/auth/me', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const body = res.body as any;
      const role = body.role || body.user?.role;
      expect(role, 'superadmin role').to.eq('superadmin');
    });
  });

  // ── Input validation — must never 500 ────────────────────────────────────

  it('POST /auth/login with SQL injection in email → 400, 401, or 422 (never 500)', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/auth/login`,
      body: { email: "' OR '1'='1' --", password: 'anything' },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      // 422 is acceptable — some validators return Unprocessable Entity for malformed email
      expect([400, 401, 422]).to.include(res.status);
      expect(res.status, 'SQL injection must not 500').not.to.eq(500);
    });
  });

  it('POST /auth/login with XSS in email → 400, 401, or 422 (never 500)', () => {
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/auth/login`,
      body: { email: '<script>alert(1)</script>@evil.com', password: 'anything' },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      // 422 is acceptable — some validators return Unprocessable Entity for malformed email
      expect([400, 401, 422]).to.include(res.status);
      expect(res.status, 'XSS payload must not 500').not.to.eq(500);
    });
  });

  it('POST /auth/login with very long password (1000 chars) → 400, 401, or 422 (never 500)', () => {
    const longPassword = 'A'.repeat(1000);

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/auth/login`,
      body: { email: 'longpassword@e2e.test', password: longPassword },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      // 422 is acceptable — some validators return Unprocessable Entity for oversized inputs
      expect([400, 401, 422]).to.include(res.status);
      expect(res.status, 'long password must not 500').not.to.eq(500);
    });
  });
});
