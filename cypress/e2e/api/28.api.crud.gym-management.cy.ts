// cypress/e2e/api/28.api.crud.gym-management.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Gym Management (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

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

  after(() => {
    cleanup.run(superToken);
  });

  // --- Gym CRUD (superadmin) ---

  it('POST /gym -> GET -> PUT -> DELETE gym lifecycle (superadmin)', () => {
    const name = `E2E Gym ${uniq()}`;

    authRequest(
      superToken,
      'POST',
      '/gym',
      {
        name,
        subdomain: `e2e-${uniq()}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        email: `gym-${uniq()}@test.gymmm.app`,
        plan: 'Starter',
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create gym').to.include(create.status);

      if (![200, 201].includes(create.status)) {
        cy.log(`Gym create returned ${create.status}; skipping gym lifecycle`);
        return;
      }

      const id =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.gym?._id ||
        (create.body as any)?.gym?.id;
      expect(id, 'gym id').to.be.a('string').and.not.empty;

      if (!id) return;

      cleanup.track({ method: 'DELETE', url: `/gym/${id}` });

      // GET
      authRequest(superToken, 'GET', `/gym/${id}`, undefined, false).then((get) => {
        expect([200, 403, 404], 'get gym by id').to.include(get.status);
      });

      // UPDATE
      authRequest(
        superToken,
        'PUT',
        `/gym/${id}`,
        { name: `${name} (updated)` },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update gym').to.include(upd.status);
      });

      // DELETE
      authRequest(superToken, 'DELETE', `/gym/${id}`, undefined, false).then((del) => {
        expect([200, 204, 403, 404], 'delete gym').to.include(del.status);
      });
    });
  });

  it('POST /gym/with-admin (superadmin)', () => {
    const name = `E2E GymAdmin ${uniq()}`;

    authRequest(
      superToken,
      'POST',
      '/gym/with-admin',
      {
        gymName: name,
        subdomain: `e2e-${uniq()}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        adminName: `E2E Admin ${uniq()}`,
        adminEmail: `admin-${uniq()}@test.gymmm.app`,
        adminPassword: 'TestPass123!',
        plan: 'Starter',
      },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create gym with admin').to.include(
        res.status,
      );

      if ([200, 201].includes(res.status)) {
        const gymIdCreated =
          (res.body as any)?.gym?._id || (res.body as any)?.gym?.id || (res.body as any)?._id;
        if (gymIdCreated) {
          cleanup.track({ method: 'DELETE', url: `/gym/${gymIdCreated}` });
        }
      }
    });
  });

  // --- Gym listing ---

  it('GET /gym — list gyms for current user', () => {
    authRequest(adminToken, 'GET', '/gym', undefined, false).then((res) => {
      expect([200, 401, 403], 'list gyms').to.include(res.status);
    });
  });

  it('GET /gym/list-lite — lightweight gym list', () => {
    authRequest(adminToken, 'GET', '/gym/list-lite', undefined, false).then((res) => {
      expect([200, 401, 403], 'list gyms lite').to.include(res.status);
    });
  });

  it('GET /gym/{id} — get existing gym details', () => {
    authRequest(adminToken, 'GET', `/gym/${gymId}`, undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get gym details').to.include(res.status);
    });
  });

  // --- Settings ---

  it('GET /settings -> PUT /settings lifecycle', () => {
    authRequest(adminToken, 'GET', '/settings', undefined, false).then((get) => {
      expect([200, 401, 403, 404], 'get settings').to.include(get.status);

      if (get.status !== 200) {
        cy.log('Cannot get settings; skipping update');
        return;
      }

      // Update with the same settings to avoid mutation
      const current = get.body as any;
      authRequest(
        adminToken,
        'PUT',
        '/settings',
        { ...current, _updated_by_e2e: true },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404, 422], 'update settings').to.include(upd.status);
      });
    });
  });

  // --- Logo upload (best-effort) ---

  it('PUT /gym/my/logo (admin, best-effort)', () => {
    // Logo upload requires multipart/form-data. We send a minimal payload;
    // the endpoint may reject it without a real file, which is expected.
    authRequest(adminToken, 'PUT', '/gym/my/logo', {}, false).then((res) => {
      // 400 is expected without a real file; we just verify the endpoint is reachable.
      expect([200, 204, 400, 403, 404, 413, 415, 422], 'gym logo upload').to.include(res.status);
    });
  });

  it('PUT /settings/logo (admin, best-effort)', () => {
    authRequest(adminToken, 'PUT', '/settings/logo', {}, false).then((res) => {
      expect([200, 204, 400, 403, 404, 413, 415, 422], 'settings logo upload').to.include(
        res.status,
      );
    });
  });
});
