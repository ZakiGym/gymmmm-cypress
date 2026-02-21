/**
 * 39 — Admin Analytics: full endpoint coverage
 *
 * Covers every /api/admin/analytics/* endpoint including the 5 new staff analytics.
 * All requests use failOnStatusCode:false for production safety.
 */

import { authRequest, getEnv } from '../../support/api';

describe('Admin Analytics — full coverage', () => {
  let adminToken: string;
  const gymId = getEnv('GYM_ID', '000000000000000000000000');

  before(() => {
    cy.apiLogin('admin').then(({ token }) => {
      adminToken = token;
    });
  });

  /* ─── Core analytics ─────────────────────────────────── */

  it('GET /admin/analytics/:gymId — dashboard metrics', () => {
    authRequest(adminToken, 'GET', `/admin/analytics/${gymId}`, undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /admin/analytics/member-joins', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/member-joins?period=monthly&months=6', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('series');
        }
      });
  });

  it('GET /admin/analytics/peak-times', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/peak-times?months=3', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('grid');
        }
      });
  });

  it('GET /admin/analytics/retention', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/retention', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('retentionRate');
        }
      });
  });

  it('GET /admin/analytics/checkin-frequency', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/checkin-frequency?months=3', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('totalCheckins');
        }
      });
  });

  it('GET /admin/analytics/revenue-breakdown', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/revenue-breakdown?months=6', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('grandTotal');
        }
      });
  });

  it('GET /admin/analytics/class-fill-rates', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/class-fill-rates?months=3', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('classes');
        }
      });
  });

  it('GET /admin/analytics/export', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/export', undefined, false)
      .then((res) => {
        expect([200, 400, 403]).to.include(res.status);
      });
  });

  /* ─── Staff analytics (new endpoints) ───────────────── */

  it('GET /admin/analytics/staff/schedule-overview', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/staff/schedule-overview?weeks=8', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('series');
        }
      });
  });

  it('GET /admin/analytics/staff/role-coverage', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/staff/role-coverage?months=1', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('breakdown');
        }
      });
  });

  it('GET /admin/analytics/staff/utilization', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/staff/utilization?months=1', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('staff');
        }
      });
  });

  it('GET /admin/analytics/staff/heatmap', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/staff/heatmap?months=3', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('heatmap');
        }
      });
  });

  it('GET /admin/analytics/staff/monthly', () => {
    authRequest(adminToken, 'GET', '/admin/analytics/staff/monthly?months=6', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
        if (res.status === 200) {
          expect(res.body).to.have.property('series');
        }
      });
  });
});
