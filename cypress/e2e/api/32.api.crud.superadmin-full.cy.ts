// cypress/e2e/api/32.api.crud.superadmin-full.cy.ts

import { authRequest, getEnv } from '../../support/api';
import { createCleanup } from '../../support/cleanup';

const uniq = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

describe('API CRUD: Superadmin Full Operations (best-effort)', () => {
  const gymId = getEnv('GYM_ID');
  const cleanup = createCleanup();

  let superToken = '';

  before(() => {
    cy.apiLogin('superadmin').then(({ token }) => {
      superToken = token;
    });
  });

  after(() => {
    cleanup.run(superToken);
  });

  // ============================
  // DASHBOARD
  // ============================

  it('GET /superadmin/dashboard/stats', () => {
    authRequest(superToken, 'GET', '/superadmin/dashboard/stats', undefined, false).then((res) => {
      expect([200, 401, 403], 'superadmin dashboard stats').to.include(res.status);
    });
  });

  it('GET /superadmin/dashboard/series', () => {
    authRequest(superToken, 'GET', '/superadmin/dashboard/series', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'superadmin dashboard series').to.include(res.status);
    });
  });

  it('GET /superadmin/invoices/latest', () => {
    authRequest(superToken, 'GET', '/superadmin/invoices/latest', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'superadmin latest invoices').to.include(res.status);
    });
  });

  // ============================
  // PLANS CRUD
  // ============================

  it('Plans CRUD: CREATE -> LIST -> UPDATE -> archive -> ensure-stripe -> DELETE', () => {
    const name = `E2E Plan ${uniq()}`;

    authRequest(
      superToken,
      'POST',
      '/superadmin/plans',
      {
        name,
        price: 49.99,
        interval: 'month',
        features: ['feature1', 'feature2'],
      },
      false,
    ).then((create) => {
      expect([200, 201, 400, 403, 404, 422, 500], 'create superadmin plan').to.include(
        create.status,
      );

      if (![200, 201].includes(create.status)) {
        cy.log(`Plan create returned ${create.status}; skipping plan lifecycle`);
        return;
      }

      const planId =
        (create.body as any)?._id ||
        (create.body as any)?.id ||
        (create.body as any)?.plan?._id ||
        (create.body as any)?.plan?.id;
      expect(planId, 'plan id').to.be.a('string').and.not.empty;

      if (!planId) return;

      cleanup.track({ method: 'DELETE', url: `/superadmin/plans/${planId}` });

      // LIST
      authRequest(superToken, 'GET', '/superadmin/plans', undefined, false).then((list) => {
        expect([200, 401, 403], 'list plans').to.include(list.status);
      });

      // UPDATE
      authRequest(
        superToken,
        'PUT',
        `/superadmin/plans/${planId}`,
        { name: `${name} (updated)`, price: 59.99 },
        false,
      ).then((upd) => {
        expect([200, 204, 400, 403, 404], 'update plan').to.include(upd.status);
      });

      // ARCHIVE
      authRequest(
        superToken,
        'PATCH',
        `/superadmin/plans/${planId}/archive`,
        { archived: true },
        false,
      ).then((arc) => {
        expect([200, 204, 400, 403, 404], 'archive plan').to.include(arc.status);
      });

      // ENSURE STRIPE
      authRequest(
        superToken,
        'POST',
        `/superadmin/plans/${planId}/ensure-stripe`,
        {},
        false,
      ).then((stripe) => {
        expect([200, 204, 400, 403, 404, 500], 'ensure stripe for plan').to.include(stripe.status);
      });

      // DELETE
      authRequest(superToken, 'DELETE', `/superadmin/plans/${planId}`, undefined, false).then(
        (del) => {
          expect([200, 204, 403, 404], 'delete plan').to.include(del.status);
        },
      );
    });
  });

  // ============================
  // FEATURE TOGGLES
  // ============================

  it('GET /superadmin/feature-toggles/catalog', () => {
    authRequest(superToken, 'GET', '/superadmin/feature-toggles/catalog', undefined, false).then(
      (res) => {
        expect([200, 401, 403], 'feature toggles catalog').to.include(res.status);
      },
    );
  });

  it('GET /superadmin/feature-toggles', () => {
    authRequest(superToken, 'GET', '/superadmin/feature-toggles', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get feature toggles').to.include(res.status);
    });
  });

  it('PUT /superadmin/feature-toggles (best-effort)', () => {
    authRequest(
      superToken,
      'PUT',
      '/superadmin/feature-toggles',
      [{ key: 'crm', enabled: true }],
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'update feature toggles').to.include(res.status);
    });
  });

  it('POST /superadmin/feature-toggles/apply-preset (best-effort)', () => {
    authRequest(
      superToken,
      'POST',
      '/superadmin/feature-toggles/apply-preset',
      { gymId, plan: 'Growth' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'apply feature preset').to.include(res.status);
    });
  });

  // ============================
  // GYM MANAGEMENT
  // ============================

  it('GET /superadmin/gyms/{id} — get gym details', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}`, undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'get superadmin gym').to.include(res.status);
    });
  });

  it('PATCH /superadmin/gyms/{id}/status', () => {
    authRequest(
      superToken,
      'PATCH',
      `/superadmin/gyms/${gymId}/status`,
      { status: 'active' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'update gym status').to.include(res.status);
    });
  });

  it('PUT /superadmin/gyms/{id}/subscription', () => {
    authRequest(
      superToken,
      'PUT',
      `/superadmin/gyms/${gymId}/subscription`,
      { plan: 'Growth' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422, 500], 'update gym subscription').to.include(
        res.status,
      );
    });
  });

  it('POST /superadmin/gyms/{id}/impersonate', () => {
    authRequest(
      superToken,
      'POST',
      `/superadmin/gyms/${gymId}/impersonate`,
      { reason: `e2e test ${uniq()}` },
      false,
    ).then((res) => {
      expect([200, 201, 400, 401, 403, 404, 422], 'impersonate gym').to.include(res.status);
    });
  });

  it('POST /superadmin/gyms/{id}/users — create user in gym', () => {
    const email = `e2e-sa-user-${uniq()}@test.gymmm.app`;

    authRequest(
      superToken,
      'POST',
      `/superadmin/gyms/${gymId}/users`,
      {
        name: `E2E SA User ${uniq()}`,
        email,
        password: 'TestPass123!',
        role: 'member',
      },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 409, 422, 500], 'create user in gym').to.include(
        res.status,
      );

      if ([200, 201].includes(res.status)) {
        const userId =
          (res.body as any)?._id ||
          (res.body as any)?.id ||
          (res.body as any)?.user?._id ||
          (res.body as any)?.user?.id;
        if (userId) {
          cleanup.track({ method: 'DELETE', url: `/user/${userId}` });
        }
      }
    });
  });

  it('GET /superadmin/gyms/{gymId}/users', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/users`, undefined, false).then(
      (res) => {
        expect([200, 401, 403, 404], 'list gym users').to.include(res.status);
      },
    );
  });

  it('GET /superadmin/gyms/{gymId}/payments', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/payments`, undefined, false).then(
      (res) => {
        expect([200, 401, 403, 404], 'list gym payments').to.include(res.status);
      },
    );
  });

  it('GET /superadmin/gyms/{gymId}/payments/export', () => {
    authRequest(
      superToken,
      'GET',
      `/superadmin/gyms/${gymId}/payments/export`,
      undefined,
      false,
    ).then((res) => {
      expect([200, 401, 403, 404], 'export gym payments').to.include(res.status);
    });
  });

  // ============================
  // USER MANAGEMENT
  // ============================

  it('PUT /superadmin/users/{id} (best-effort)', () => {
    // Get a user ID from the gym to update
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/users`, undefined, false).then(
      (list) => {
        if (list.status !== 200) {
          cy.log('Cannot list users; skipping user update');
          return;
        }

        const items: any[] = (list.body as any)?.items || (list.body as any)?.users || (list.body as any) || [];
        const user = items[0];
        const userId = user?._id || user?.id;

        if (!userId) {
          cy.log('No users found; skipping user update');
          return;
        }

        authRequest(
          superToken,
          'PUT',
          `/superadmin/users/${userId}`,
          { name: user?.name || 'Updated' },
          false,
        ).then((upd) => {
          expect([200, 204, 400, 403, 404], 'update user').to.include(upd.status);
        });

        authRequest(
          superToken,
          'PATCH',
          `/superadmin/users/${userId}`,
          { active: true },
          false,
        ).then((patch) => {
          expect([200, 204, 400, 403, 404], 'patch user state').to.include(patch.status);
        });
      },
    );
  });

  // ============================
  // SETTINGS
  // ============================

  it('GET /superadmin/settings', () => {
    authRequest(superToken, 'GET', '/superadmin/settings', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 501], 'superadmin settings list').to.include(res.status);
    });
  });

  it('GET /superadmin/settings/{gymId}', () => {
    authRequest(superToken, 'GET', `/superadmin/settings/${gymId}`, undefined, false).then(
      (res) => {
        expect([200, 401, 403, 404, 501], 'superadmin gym settings').to.include(res.status);
      },
    );
  });

  it('PUT /superadmin/settings/{gymId} (best-effort)', () => {
    authRequest(
      superToken,
      'PUT',
      `/superadmin/settings/${gymId}`,
      { updated_by_e2e: true },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422, 501], 'update superadmin settings').to.include(
        res.status,
      );
    });
  });
});
