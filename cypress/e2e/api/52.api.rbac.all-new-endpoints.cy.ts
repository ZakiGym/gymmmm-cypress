/**
 * 52 — Comprehensive RBAC for ALL new endpoints (files 39-51)
 *
 * Tests role-based access control for every new endpoint added.
 * Validates: member denied from admin routes, admin denied from SA routes,
 * no-auth denied from protected routes, trainer access scoping.
 */

import { authRequest, getEnv } from '../../support/api';

describe('RBAC — comprehensive for new endpoints', () => {
  let memberToken: string;
  let trainerToken: string;
  let adminToken: string;
  let superToken: string;
  const gymId = getEnv('GYM_ID', '000000000000000000000000');

  before(() => {
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('trainer').then(({ token }) => { trainerToken = token; });
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
  });

  /* ================================================================
   * NO AUTH — should always get 401/403
   * ================================================================ */

  describe('No auth → protected endpoints', () => {
    const protectedGets = [
      '/admin/analytics/member-joins',
      '/admin/analytics/peak-times',
      '/admin/analytics/retention',
      '/admin/analytics/checkin-frequency',
      '/admin/analytics/revenue-breakdown',
      '/admin/analytics/class-fill-rates',
      '/admin/analytics/staff/schedule-overview',
      '/admin/analytics/staff/role-coverage',
      '/admin/analytics/staff/utilization',
      '/admin/analytics/staff/heatmap',
      '/admin/analytics/staff/monthly',
      '/reporting/overview',
      '/reporting/revenue-chart',
      '/reporting/member-growth',
      '/reporting/attendance',
      '/reporting/retention',
      '/reporting/top-classes',
      '/marketing/stats',
      '/marketing/campaigns',
      '/staff-management/stats',
      '/staff-management/directory',
      '/staff-management/schedules',
      '/integrations/catalog',
      '/integrations',
      '/member/stats',
      '/chat/status',
    ];

    protectedGets.forEach((path) => {
      it(`GET ${path} — no auth denied`, () => {
        authRequest(undefined, 'GET', path, undefined, false)
          .then((res) => {
            expect([401, 403, 404]).to.include(res.status);
          });
      });
    });
  });

  /* ================================================================
   * MEMBER → admin-only endpoints
   * ================================================================ */

  describe('Member → admin-only endpoints denied', () => {
    const adminOnlyGets = [
      '/admin/analytics/member-joins',
      '/admin/analytics/retention',
      '/admin/analytics/staff/schedule-overview',
      '/reporting/overview',
      '/reporting/revenue-chart',
      '/marketing/stats',
      '/marketing/campaigns',
      '/staff-management/stats',
      '/staff-management/directory',
      '/staff-management/schedules',
      '/integrations/catalog',
      '/integrations',
      '/billing/summary',
      '/billing/members',
      '/settings',
    ];

    adminOnlyGets.forEach((path) => {
      it(`GET ${path} — member denied`, () => {
        authRequest(memberToken, 'GET', path, undefined, false)
          .then((res) => {
            expect([401, 403]).to.include(res.status);
          });
      });
    });

    it('POST /marketing/campaigns — member denied', () => {
      authRequest(memberToken, 'POST', '/marketing/campaigns', {
        name: 'nope',
      }, false).then((res) => {
        expect([401, 403]).to.include(res.status);
      });
    });

    it('POST /staff-management/schedules — member denied', () => {
      authRequest(memberToken, 'POST', '/staff-management/schedules', {
        staffId: '000000000000000000000000',
        date: '2025-01-01',
        shiftStart: '09:00',
        shiftEnd: '17:00',
      }, false).then((res) => {
        expect([401, 403]).to.include(res.status);
      });
    });

    it('POST /integrations — member denied', () => {
      authRequest(memberToken, 'POST', '/integrations', {
        type: 'webhook',
        name: 'nope',
      }, false).then((res) => {
        expect([401, 403]).to.include(res.status);
      });
    });

    it('POST /invites — member denied', () => {
      authRequest(memberToken, 'POST', '/invites', {
        email: 'nope@test.com',
        role: 'member',
      }, false).then((res) => {
        expect([401, 403]).to.include(res.status);
      });
    });
  });

  /* ================================================================
   * TRAINER → admin-only endpoints
   * ================================================================ */

  describe('Trainer → admin-only endpoints denied', () => {
    const trainerDenied = [
      '/marketing/stats',
      '/marketing/campaigns',
      '/staff-management/stats',
      '/staff-management/directory',
      '/integrations/catalog',
      '/integrations',
    ];

    trainerDenied.forEach((path) => {
      it(`GET ${path} — trainer denied`, () => {
        authRequest(trainerToken, 'GET', path, undefined, false)
          .then((res) => {
            expect([401, 403]).to.include(res.status);
          });
      });
    });
  });

  /* ================================================================
   * ADMIN → superadmin-only endpoints
   * ================================================================ */

  describe('Admin → superadmin-only endpoints denied', () => {
    const superOnly = [
      '/superadmin/dashboard/health-summary',
      '/superadmin/gyms',
      '/superadmin/users',
      '/superadmin/settings',
      '/superadmin/plans',
      '/superadmin/global-plans',
      '/superadmin/logs',
      '/superadmin/invoices/latest',
    ];

    superOnly.forEach((path) => {
      it(`GET ${path} — admin denied`, () => {
        authRequest(adminToken, 'GET', path, undefined, false)
          .then((res) => {
            expect([401, 403]).to.include(res.status);
          });
      });
    });

    it('POST /superadmin/switch-gym — admin denied', () => {
      authRequest(adminToken, 'POST', `/superadmin/switch-gym/${gymId}`, undefined, false)
        .then((res) => {
          expect([401, 403]).to.include(res.status);
        });
    });

    it('POST /superadmin/health-alert — admin denied', () => {
      authRequest(adminToken, 'POST', '/superadmin/health-alert', {
        service: 'test',
        status: 'ok',
      }, false).then((res) => {
        expect([401, 403]).to.include(res.status);
      });
    });

    it('PATCH /superadmin/users/:id/archive — admin denied', () => {
      authRequest(adminToken, 'PATCH', '/superadmin/users/000000000000000000000000/archive', undefined, false)
        .then((res) => {
          expect([401, 403]).to.include(res.status);
        });
    });

    it('PATCH /superadmin/users/:id/restore — admin denied', () => {
      authRequest(adminToken, 'PATCH', '/superadmin/users/000000000000000000000000/restore', undefined, false)
        .then((res) => {
          expect([401, 403]).to.include(res.status);
        });
    });
  });

  /* ================================================================
   * ADMIN → analytics endpoints (should be ALLOWED)
   * ================================================================ */

  describe('Admin → analytics endpoints allowed', () => {
    const adminAllowed = [
      '/admin/analytics/member-joins',
      '/admin/analytics/peak-times',
      '/admin/analytics/retention',
      '/admin/analytics/checkin-frequency',
      '/admin/analytics/revenue-breakdown',
      '/admin/analytics/class-fill-rates',
      '/admin/analytics/staff/schedule-overview',
      '/reporting/overview',
      '/reporting/revenue-chart',
    ];

    adminAllowed.forEach((path) => {
      it(`GET ${path} — admin allowed`, () => {
        authRequest(adminToken, 'GET', path, undefined, false)
          .then((res) => {
            // Should NOT get 401/403
            expect([200, 400, 404, 500]).to.include(res.status);
          });
      });
    });
  });

  /* ================================================================
   * SUPERADMIN → everything allowed
   * ================================================================ */

  describe('Superadmin → all endpoints accessible', () => {
    const superAllowed = [
      '/superadmin/dashboard/health-summary',
      '/superadmin/dashboard/stats',
      '/superadmin/dashboard/series',
      '/superadmin/invoices/latest',
      '/superadmin/gyms',
      '/superadmin/users',
      '/superadmin/plans',
      '/superadmin/settings',
      '/superadmin/logs',
      `/superadmin/gyms/${gymId}/overview`,
      `/superadmin/gyms/${gymId}/features`,
      `/superadmin/gyms/${gymId}/users`,
      `/superadmin/gyms/${gymId}/invoices`,
    ];

    superAllowed.forEach((path) => {
      it(`GET ${path} — superadmin allowed`, () => {
        authRequest(superToken, 'GET', path, undefined, false)
          .then((res) => {
            expect([200, 400, 404, 500]).to.include(res.status);
          });
      });
    });
  });

  /* ================================================================
   * MEMBER → member-accessible endpoints (should work)
   * ================================================================ */

  describe('Member → member endpoints accessible', () => {
    it('GET /member/stats — member allowed', () => {
      authRequest(memberToken, 'GET', '/member/stats', undefined, false)
        .then((res) => {
          expect([200, 400, 404]).to.include(res.status);
        });
    });

    it('GET /chat/status — member allowed', () => {
      authRequest(memberToken, 'GET', '/chat/status', undefined, false)
        .then((res) => {
          expect([200, 400, 404, 503]).to.include(res.status);
        });
    });

    it('GET /notifications — member allowed', () => {
      authRequest(memberToken, 'GET', '/notifications', undefined, false)
        .then((res) => {
          expect([200, 400, 404]).to.include(res.status);
        });
    });

    it('PATCH /notifications/mark-all-read — member allowed', () => {
      authRequest(memberToken, 'PATCH', '/notifications/mark-all-read', undefined, false)
        .then((res) => {
          expect([200, 204, 400, 404]).to.include(res.status);
        });
    });
  });
});
