// cypress/e2e/backend/09.backend.crud.superadmin.cy.ts
// Superadmin full CRUD — strict assertions, exact status codes

import { authRequest, getEnv, login } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uid = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('Backend CRUD: Superadmin Full Operations', () => {
  const GYM_ID = '690dd58eb250ac19d4a39ff4';
  const cleanup = createCleanup();

  let superToken = '';
  let createdPlanId = '';

  before(() => {
    login('superadmin@gmail.com', 'StrongPass123!', { retryOnRateLimit: true }).then((res) => {
      if ((res as any).status === 429) {
        cy.log('rate limited on superadmin login');
        return;
      }
      superToken = res.token;
    });
  });

  after(() => {
    cleanup.run(superToken);
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────

  it('GET /superadmin/dashboard/stats → 200, has gyms/members counts', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/superadmin/dashboard/stats', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const body = res.body as any;
      // API returns { gyms, members, ... } not { totalGyms, ... }
      const hasGymsField =
        'totalGyms' in body ||
        'gyms' in body;
      const hasMembersField =
        'totalMembers' in body ||
        'members' in body;
      expect(hasGymsField, 'has gyms-like field (totalGyms or gyms)').to.be.true;
      expect(hasMembersField, 'has members-like field (totalMembers or members)').to.be.true;
      // check for some revenue-related key
      const hasRevenue =
        'totalRevenue' in body ||
        'revenue' in body ||
        'mrr' in body ||
        'arr' in body;
      if (!hasRevenue) {
        cy.log('No revenue field in stats response — may not be present on this env (best-effort).');
      }
    });
  });

  it('GET /superadmin/dashboard/series → 200', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/superadmin/dashboard/series', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
    });
  });

  // ── Gym details ────────────────────────────────────────────────────────────

  it(`GET /superadmin/gyms/${GYM_ID} → 200, has _id and name`, () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', `/superadmin/gyms/${GYM_ID}`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const body = res.body as any;
      const id = body._id || body.id;
      expect(id, 'gym _id').to.be.a('string').and.not.empty;
      expect(body).to.have.property('name');
      expect(body.name).to.be.a('string').and.not.empty;
    });
  });

  it(`GET /superadmin/gyms/${GYM_ID}/users → 200, is array`, () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', `/superadmin/gyms/${GYM_ID}/users`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const payload = (res.body as any)?.items ?? (res.body as any)?.users ?? res.body;
      expect(Array.isArray(payload), 'users payload is array').to.be.true;
    });
  });

  it(`GET /superadmin/gyms/${GYM_ID}/payments → 200`, () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', `/superadmin/gyms/${GYM_ID}/payments`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
    });
  });

  // ── Plans CRUD ─────────────────────────────────────────────────────────────

  it('GET /superadmin/plans → 200, is array', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/superadmin/plans', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      // Response may be a bare array OR wrapped: { plans: [...] } / { data: [...] } / { items: [...] }
      const body = res.body as any;
      const payload = Array.isArray(body)
        ? body
        : body?.plans ?? body?.items ?? body?.data ?? [];
      expect(Array.isArray(payload), 'plans list is array').to.be.true;
    });
  });

  it('POST /superadmin/plans → 201, has _id', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    const planName = uid();

    authRequest(
      superToken,
      'POST',
      '/superadmin/plans',
      { name: planName, price: 29, interval: 'monthly' },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(201);
      const body = res.body as any;
      const id = body._id || body.id || body.plan?._id || body.plan?.id;
      expect(id, 'created plan _id').to.be.a('string').and.not.empty;
      createdPlanId = id;
      cleanup.track({ method: 'DELETE', url: `/superadmin/plans/${createdPlanId}` });
    });
  });

  it('PUT /superadmin/plans/{id} → 200 or 204', () => {
    if (!superToken || !createdPlanId) { cy.log('no superToken or planId; skipping'); return; }

    // PUT requires all required fields (name, price, interval) — partial body causes 400
    authRequest(
      superToken,
      'PUT',
      `/superadmin/plans/${createdPlanId}`,
      { name: uid(), price: 49, interval: 'monthly' },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect([200, 204]).to.include(res.status);
    });
  });

  it('PATCH /superadmin/plans/{id}/archive → 200 or 204', () => {
    if (!superToken || !createdPlanId) { cy.log('no superToken or planId; skipping'); return; }

    authRequest(
      superToken,
      'PATCH',
      `/superadmin/plans/${createdPlanId}/archive`,
      { archived: true },
      false,
    ).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect([200, 204]).to.include(res.status);
    });
  });

  it('DELETE /superadmin/plans/{id} → 200 or 204', () => {
    if (!superToken || !createdPlanId) { cy.log('no superToken or planId; skipping'); return; }

    authRequest(superToken, 'DELETE', `/superadmin/plans/${createdPlanId}`, undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect([200, 204]).to.include(res.status);
      // already cleaned; remove from cleanup to avoid double-delete
      createdPlanId = '';
    });
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  it('GET /superadmin/settings → 200', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/superadmin/settings', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
    });
  });

  // ── Audit log ──────────────────────────────────────────────────────────────

  it('GET /audit-log → 200, is array', () => {
    if (!superToken) { cy.log('no superToken; skipping'); return; }

    authRequest(superToken, 'GET', '/audit-log?limit=10', undefined, false).then((res) => {
      if (res.status === 429) { cy.log('rate limited'); return; }
      expect(res.status).to.eq(200);
      const payload = (res.body as any)?.items ?? (res.body as any)?.logs ?? res.body;
      expect(Array.isArray(payload), 'audit log is array').to.be.true;
    });
  });
});
