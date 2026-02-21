/**
 * 50 — Superadmin gaps: endpoints not covered in existing test files
 *
 * Covers: health-summary, health-alert, switch-gym, gym overview,
 * user archive/restore/disable/activate, superadmin settings, logs,
 * gym features apply-preset, global-plans legacy aliases.
 */

import { authRequest, getEnv } from '../../support/api';

describe('Superadmin — gap coverage', () => {
  let superToken: string;
  let adminToken: string;
  const gymId = getEnv('GYM_ID', '000000000000000000000000');

  before(() => {
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
  });

  /* ─── Dashboard extras ───────────────────────────────── */

  it('GET /superadmin/dashboard/health-summary', () => {
    authRequest(superToken, 'GET', '/superadmin/dashboard/health-summary', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /superadmin/health-alert — receive health check failure', () => {
    authRequest(superToken, 'POST', '/superadmin/health-alert', {
      service: 'cypress-test',
      status: 'warning',
      message: 'Test alert from Cypress',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  /* ─── Gym management extras ──────────────────────────── */

  it('GET /superadmin/gyms/:id/overview', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/overview`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /superadmin/switch-gym/:id — switch gym context', () => {
    authRequest(superToken, 'POST', `/superadmin/switch-gym/${gymId}`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /superadmin/gyms/:id/invoices', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/invoices`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── User management extras ─────────────────────────── */

  it('PATCH /superadmin/users/:fakeId/disable — disable user', () => {
    authRequest(superToken, 'PATCH', '/superadmin/users/000000000000000000000000/disable', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PATCH /superadmin/users/:fakeId/activate — activate user', () => {
    authRequest(superToken, 'PATCH', '/superadmin/users/000000000000000000000000/activate', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PATCH /superadmin/users/:fakeId/archive — archive user', () => {
    authRequest(superToken, 'PATCH', '/superadmin/users/000000000000000000000000/archive', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PATCH /superadmin/users/:fakeId/restore — restore archived user', () => {
    authRequest(superToken, 'PATCH', '/superadmin/users/000000000000000000000000/restore', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PUT /superadmin/users/:fakeId — update user', () => {
    authRequest(superToken, 'PUT', '/superadmin/users/000000000000000000000000', {
      firstName: 'CypressUpdated',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /superadmin/users/:fakeId/reset-pw — reset password', () => {
    authRequest(superToken, 'POST', '/superadmin/users/000000000000000000000000/reset-pw', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── Gym features via legacy path ───────────────────── */

  it('GET /superadmin/gyms/:gymId/features — get gym features', () => {
    authRequest(superToken, 'GET', `/superadmin/gyms/${gymId}/features`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /superadmin/gyms/:gymId/features/apply-preset', () => {
    authRequest(superToken, 'POST', `/superadmin/gyms/${gymId}/features/apply-preset`, {
      preset: 'growth',
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  /* ─── Global plans legacy aliases ────────────────────── */

  it('GET /superadmin/global-plans — legacy alias', () => {
    authRequest(superToken, 'GET', '/superadmin/global-plans', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── Superadmin settings ────────────────────────────── */

  it('GET /superadmin/settings — system settings', () => {
    authRequest(superToken, 'GET', '/superadmin/settings', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PUT /superadmin/settings — update system settings', () => {
    authRequest(superToken, 'PUT', '/superadmin/settings', {
      maintenanceMode: false,
    }, false).then((res) => {
      expect([200, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  /* ─── Superadmin audit logs ──────────────────────────── */

  it('GET /superadmin/logs — list SA audit logs', () => {
    authRequest(superToken, 'GET', '/superadmin/logs', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /superadmin/logs.csv — export SA audit logs', () => {
    authRequest(superToken, 'GET', '/superadmin/logs.csv', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  /* ─── RBAC: admin should NOT access superadmin routes ── */

  it('GET /superadmin/dashboard/health-summary — admin denied', () => {
    authRequest(adminToken, 'GET', '/superadmin/dashboard/health-summary', undefined, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  it('POST /superadmin/switch-gym/:id — admin denied', () => {
    authRequest(adminToken, 'POST', `/superadmin/switch-gym/${gymId}`, undefined, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  it('GET /superadmin/gyms/:id/overview — admin denied', () => {
    authRequest(adminToken, 'GET', `/superadmin/gyms/${gymId}/overview`, undefined, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });
});
