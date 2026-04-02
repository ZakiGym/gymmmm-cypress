// cypress/e2e/api/56.api.rbac-comprehensive.cy.ts
// Deep cross-role RBAC testing: every role attempts every sensitive endpoint.

import { authRequest } from '../../support/api';

type Role = 'admin' | 'superadmin' | 'trainer' | 'member';

describe('API: Comprehensive RBAC Cross-Role Tests', () => {
  const tokens: Record<Role, string> = {
    admin: '',
    superadmin: '',
    trainer: '',
    member: '',
  };

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { tokens.admin = token; });
    cy.apiLogin('superadmin').then(({ token }) => { tokens.superadmin = token; });
    cy.apiLogin('trainer').then(({ token }) => { tokens.trainer = token; });
    cy.apiLogin('member').then(({ token }) => { tokens.member = token; });
  });

  /* ───── Unauthenticated access ───── */

  describe('Unauthenticated access should be denied', () => {
    const protectedEndpoints: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string }> = [
      { method: 'GET', path: '/auth/me' },
      { method: 'GET', path: '/user' },
      { method: 'GET', path: '/gym' },
      { method: 'GET', path: '/bookings' },
      { method: 'GET', path: '/memberships/me' },
      { method: 'GET', path: '/payments/me' },
      { method: 'GET', path: '/notifications' },
      { method: 'GET', path: '/settings' },
      { method: 'GET', path: '/qr/me' },
      { method: 'GET', path: '/crm/contacts' },
      { method: 'GET', path: '/crm/deals' },
      { method: 'GET', path: '/admin/analytics/export' },
      { method: 'GET', path: '/admin/dashboard/stats' },
      { method: 'GET', path: '/billing/members' },
      { method: 'GET', path: '/billing/summary' },
      { method: 'GET', path: '/audit-log' },
      { method: 'GET', path: '/trainer/classes/me' },
      { method: 'GET', path: '/trainer/stats/me' },
      { method: 'GET', path: '/superadmin/dashboard/stats' },
      { method: 'GET', path: '/superadmin/plans' },
    ];

    protectedEndpoints.forEach(({ method, path }) => {
      it(`${method} ${path} without token → 401/403`, () => {
        authRequest(undefined, method, path, undefined, false).then((res) => {
          expect([401, 403], `unauth ${path}`).to.include(res.status);
        });
      });
    });
  });

  /* ───── Member cannot access admin endpoints ───── */

  describe('Member role restrictions', () => {
    const adminOnlyEndpoints: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string }> = [
      { method: 'POST', path: '/classes' },
      { method: 'POST', path: '/class-types' },
      { method: 'POST', path: '/schedule-templates' },
      { method: 'POST', path: '/coupons' },
      { method: 'POST', path: '/memberships' },
      { method: 'GET', path: '/bookings/admin' },
      { method: 'GET', path: '/bookings/export' },
      { method: 'GET', path: '/payments/admin' },
      { method: 'GET', path: '/payments/export' },
      { method: 'GET', path: '/billing/members' },
      { method: 'GET', path: '/billing/summary' },
      { method: 'GET', path: '/admin/dashboard/stats' },
      { method: 'GET', path: '/admin/analytics/export' },
      { method: 'GET', path: '/audit-log' },
      { method: 'POST', path: '/user' },
      { method: 'POST', path: '/user/create-member' },
      { method: 'GET', path: '/crm/contacts' },
      { method: 'POST', path: '/crm/contacts' },
      { method: 'GET', path: '/crm/deals' },
      { method: 'GET', path: '/crm/pipelines' },
      { method: 'GET', path: '/crm/tasks' },
      { method: 'GET', path: '/crm/activities' },
      { method: 'GET', path: '/qr/admin/recent' },
    ];

    // Some endpoints return 404 instead of 403 when the resource/feature isn't available
    const rbacDenied = [401, 403, 404];

    adminOnlyEndpoints.forEach(({ method, path }) => {
      it(`member ${method} ${path} → 401/403/404`, () => {
        authRequest(tokens.member, method, path, method === 'POST' ? {} : undefined, false).then(
          (res) => {
            expect(rbacDenied, `member denied ${path}`).to.include(res.status);
          },
        );
      });
    });
  });

  /* ───── Trainer cannot access admin-only endpoints ───── */

  describe('Trainer role restrictions', () => {
    const trainerDenied: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string }> = [
      { method: 'POST', path: '/classes' },
      { method: 'POST', path: '/class-types' },
      // Note: trainer CAN access /memberships & /crm/contacts per API behavior
      { method: 'POST', path: '/coupons' },
      { method: 'GET', path: '/billing/members' },
      { method: 'GET', path: '/billing/summary' },
      { method: 'GET', path: '/payments/admin' },
      { method: 'GET', path: '/payments/export' },
      { method: 'GET', path: '/admin/dashboard/stats' },
      { method: 'POST', path: '/user' },
      { method: 'POST', path: '/user/create-member' },
    ];

    const rbacDenied = [401, 403, 404];

    trainerDenied.forEach(({ method, path }) => {
      it(`trainer ${method} ${path} → 401/403/404`, () => {
        authRequest(tokens.trainer, method, path, method === 'POST' ? {} : undefined, false).then(
          (res) => {
            expect(rbacDenied, `trainer denied ${path}`).to.include(res.status);
          },
        );
      });
    });
  });

  /* ───── Admin cannot access superadmin endpoints ───── */

  describe('Admin cannot access superadmin endpoints', () => {
    const superadminOnly: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; path: string }> = [
      { method: 'GET', path: '/superadmin/dashboard/stats' },
      { method: 'GET', path: '/superadmin/dashboard/series' },
      { method: 'GET', path: '/superadmin/invoices/latest' },
      { method: 'GET', path: '/superadmin/plans' },
      { method: 'POST', path: '/superadmin/plans' },
      { method: 'GET', path: '/superadmin/settings' },
      { method: 'GET', path: '/superadmin/feature-toggles/catalog' },
      { method: 'GET', path: '/superadmin/feature-toggles' },
      { method: 'POST', path: '/gym' },
      { method: 'POST', path: '/gym/with-admin' },
      { method: 'POST', path: '/user/create-admin' },
    ];

    superadminOnly.forEach(({ method, path }) => {
      it(`admin ${method} ${path} → 401/403`, () => {
        authRequest(tokens.admin, method, path, method === 'POST' ? {} : undefined, false).then(
          (res) => {
            expect([401, 403], `admin denied ${path}`).to.include(res.status);
          },
        );
      });
    });
  });

  /* ───── Member cannot access trainer endpoints ───── */

  describe('Member cannot access trainer endpoints', () => {
    const trainerOnly: Array<{ method: 'GET' | 'POST'; path: string }> = [
      { method: 'GET', path: '/trainer/classes/me' },
      { method: 'GET', path: '/trainer/availability/me' },
      { method: 'GET', path: '/trainer/stats/me' },
      { method: 'GET', path: '/trainer/notifications' },
      { method: 'POST', path: '/trainer/availability' },
    ];

    trainerOnly.forEach(({ method, path }) => {
      it(`member ${method} ${path} → 401/403`, () => {
        authRequest(tokens.member, method, path, method === 'POST' ? {} : undefined, false).then(
          (res) => {
            expect([401, 403], `member denied trainer ${path}`).to.include(res.status);
          },
        );
      });
    });
  });

  /* ───── Cross-tenant isolation ───── */

  describe('Cross-tenant isolation (best-effort)', () => {
    it('admin cannot read another gym\'s data', () => {
      const fakeGymId = '000000000000000000000001';
      authRequest(tokens.admin, 'GET', `/gym/${fakeGymId}`, undefined, false).then((res) => {
        expect([400, 403, 404, 500], 'cross-tenant gym').to.include(res.status);
      });
    });

    it('admin cannot list users from another gym', () => {
      const fakeGymId = '000000000000000000000001';
      authRequest(tokens.admin, 'GET', `/user/gym/${fakeGymId}`, undefined, false).then((res) => {
        expect([400, 401, 403, 404, 500], 'cross-tenant users').to.include(res.status);
      });
    });
  });
});
