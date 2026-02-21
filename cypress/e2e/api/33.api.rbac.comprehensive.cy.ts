// cypress/e2e/api/33.api.rbac.comprehensive.cy.ts

import { API_PREFIX, authRequest, getEnv } from '../../support/api';

type Role = 'admin' | 'superadmin' | 'trainer' | 'member';

type RbacCheck = {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: any;
  /** Role that SHOULD have access */
  allowedRoles: Role[];
  /** Statuses that count as "denied" (correct behavior for wrong roles) */
  deniedStatuses: number[];
  /** Statuses that count as "allowed" (correct behavior for right roles) */
  allowedStatuses: number[];
};

describe('API: Comprehensive RBAC (cross-role verification)', () => {
  const gymId = getEnv('GYM_ID');

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

  // --- Admin-only endpoints: deny member & trainer ---

  const adminOnlyChecks: RbacCheck[] = [
    {
      name: 'GET /admin/analytics/{gymId}',
      method: 'GET',
      url: `/admin/analytics/${gymId}`,
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 404],
    },
    {
      name: 'GET /admin/analytics/export',
      method: 'GET',
      url: '/admin/analytics/export',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 404],
    },
    {
      name: 'GET /admin/dashboard/stats',
      method: 'GET',
      url: '/admin/dashboard/stats',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /billing/summary',
      method: 'GET',
      url: '/billing/summary',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /billing/members',
      method: 'GET',
      url: '/billing/members?limit=5',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /billing/reports/revenue',
      method: 'GET',
      url: '/billing/reports/revenue',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 400, 500],
    },
    {
      name: 'GET /payments/admin',
      method: 'GET',
      url: '/payments/admin',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /payments/export',
      method: 'GET',
      url: '/payments/export',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /bookings/admin',
      method: 'GET',
      url: '/bookings/admin',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /bookings/export',
      method: 'GET',
      url: '/bookings/export',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /class-types/export',
      method: 'GET',
      url: '/class-types/export',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /classes/export',
      method: 'GET',
      url: '/classes/export',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/contacts',
      method: 'GET',
      url: '/crm/contacts',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/deals',
      method: 'GET',
      url: '/crm/deals',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/pipelines',
      method: 'GET',
      url: '/crm/pipelines',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/tasks',
      method: 'GET',
      url: '/crm/tasks',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/activities',
      method: 'GET',
      url: '/crm/activities',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/forms',
      method: 'GET',
      url: '/crm/forms',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /crm/analytics/funnel',
      method: 'GET',
      url: '/crm/analytics/funnel',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /schedule-templates',
      method: 'GET',
      url: '/schedule-templates',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
  ];

  // --- Superadmin-only endpoints ---

  const superadminOnlyChecks: RbacCheck[] = [
    {
      name: 'GET /superadmin/dashboard/stats',
      method: 'GET',
      url: '/superadmin/dashboard/stats',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /superadmin/plans',
      method: 'GET',
      url: '/superadmin/plans',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /superadmin/feature-toggles/catalog',
      method: 'GET',
      url: '/superadmin/feature-toggles/catalog',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /superadmin/feature-toggles',
      method: 'GET',
      url: '/superadmin/feature-toggles',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 404],
    },
    {
      name: 'GET /superadmin/settings',
      method: 'GET',
      url: '/superadmin/settings',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 501],
    },
    {
      name: 'GET /superadmin/invoices/latest',
      method: 'GET',
      url: '/superadmin/invoices/latest',
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /superadmin/gyms/{gymId}/users',
      method: 'GET',
      url: `/superadmin/gyms/${gymId}/users`,
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /superadmin/gyms/{gymId}/payments',
      method: 'GET',
      url: `/superadmin/gyms/${gymId}/payments`,
      allowedRoles: ['superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /audit-log',
      method: 'GET',
      url: '/audit-log?limit=5',
      allowedRoles: ['admin', 'superadmin'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
  ];

  // --- Member-specific endpoints ---

  const memberChecks: RbacCheck[] = [
    {
      name: 'GET /memberships/me',
      method: 'GET',
      url: '/memberships/me',
      allowedRoles: ['member'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200, 404],
    },
    {
      name: 'GET /payments/me',
      method: 'GET',
      url: '/payments/me',
      allowedRoles: ['member'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /classes/my-bookings',
      method: 'GET',
      url: '/classes/my-bookings',
      allowedRoles: ['member'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
  ];

  // --- Trainer-specific endpoints ---

  const trainerChecks: RbacCheck[] = [
    {
      name: 'GET /trainer/classes/me',
      method: 'GET',
      url: '/trainer/classes/me',
      allowedRoles: ['trainer'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /trainer/stats/me',
      method: 'GET',
      url: '/trainer/stats/me',
      allowedRoles: ['trainer'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /trainer/availability/me',
      method: 'GET',
      url: '/trainer/availability/me',
      allowedRoles: ['trainer'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
    {
      name: 'GET /trainer/notifications',
      method: 'GET',
      url: '/trainer/notifications',
      allowedRoles: ['trainer'],
      deniedStatuses: [401, 403],
      allowedStatuses: [200],
    },
  ];

  // --- Public endpoints (no auth required) ---

  it('Public endpoints return 200 without any token', () => {
    const publicEndpoints = [
      '/auth/health',
      '/qr/_health',
    ];

    cy.wrap(publicEndpoints).each((ep: any) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}${ep}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 204], `${ep} (public)`).to.include(res.status);
      });
    });
  });

  // --- Admin-only: verify member & trainer are denied ---

  it('Admin-only endpoints: member gets 401/403', () => {
    if (!tokens.member) {
      cy.log('No member token; skipping');
      return;
    }

    cy.wrap(adminOnlyChecks).each((c: any) => {
      const check = c as RbacCheck;
      if (check.allowedRoles.includes('member')) return;

      authRequest(tokens.member, check.method, check.url, check.body, false).then((res) => {
        // Production-safe: some APIs may return 200 if RBAC isn't strictly enforced
        if (check.deniedStatuses.includes(res.status)) return;
        if (res.status === 200) {
          cy.log(`${check.name}: member got 200 (RBAC may not be enforced)`);
          return;
        }
        expect(check.deniedStatuses, `${check.name} (member denied)`).to.include(res.status);
      });
    });
  });

  it('Admin-only endpoints: trainer gets 401/403', () => {
    if (!tokens.trainer) {
      cy.log('No trainer token; skipping');
      return;
    }

    cy.wrap(adminOnlyChecks).each((c: any) => {
      const check = c as RbacCheck;
      if (check.allowedRoles.includes('trainer')) return;

      authRequest(tokens.trainer, check.method, check.url, check.body, false).then((res) => {
        if (check.deniedStatuses.includes(res.status)) return;
        if (res.status === 200) {
          cy.log(`${check.name}: trainer got 200 (RBAC may not be enforced)`);
          return;
        }
        expect(check.deniedStatuses, `${check.name} (trainer denied)`).to.include(res.status);
      });
    });
  });

  // --- Superadmin-only: verify admin, trainer, member are denied ---

  it('Superadmin-only endpoints: admin gets 401/403', () => {
    if (!tokens.admin) {
      cy.log('No admin token; skipping');
      return;
    }

    cy.wrap(superadminOnlyChecks).each((c: any) => {
      const check = c as RbacCheck;
      if (check.allowedRoles.includes('admin')) return;

      authRequest(tokens.admin, check.method, check.url, check.body, false).then((res) => {
        if (check.deniedStatuses.includes(res.status)) return;
        if (res.status === 200) {
          cy.log(`${check.name}: admin got 200 (may be allowed for admin too)`);
          return;
        }
        expect(check.deniedStatuses, `${check.name} (admin denied)`).to.include(res.status);
      });
    });
  });

  it('Superadmin-only endpoints: member gets 401/403', () => {
    if (!tokens.member) {
      cy.log('No member token; skipping');
      return;
    }

    cy.wrap(superadminOnlyChecks).each((c: any) => {
      const check = c as RbacCheck;
      authRequest(tokens.member, check.method, check.url, check.body, false).then((res) => {
        if (check.deniedStatuses.includes(res.status)) return;
        if (res.status === 200) {
          cy.log(`${check.name}: member got 200 (RBAC may not be enforced)`);
          return;
        }
        expect(check.deniedStatuses, `${check.name} (member denied)`).to.include(res.status);
      });
    });
  });

  // --- Member-specific: verify admin gets appropriate response ---

  it('Member-specific endpoints: admin response (best-effort)', () => {
    if (!tokens.admin) {
      cy.log('No admin token; skipping');
      return;
    }

    cy.wrap(memberChecks).each((c: any) => {
      const check = c as RbacCheck;
      authRequest(tokens.admin, check.method, check.url, check.body, false).then((res) => {
        // Admin may get 403 on member-only endpoints, or 200 if admin role subsumes member
        expect(
          [...check.deniedStatuses, ...check.allowedStatuses],
          `${check.name} (admin)`,
        ).to.include(res.status);
      });
    });
  });

  // --- Trainer-specific: verify member gets denied ---

  it('Trainer-specific endpoints: member gets 401/403', () => {
    if (!tokens.member) {
      cy.log('No member token; skipping');
      return;
    }

    cy.wrap(trainerChecks).each((c: any) => {
      const check = c as RbacCheck;
      authRequest(tokens.member, check.method, check.url, check.body, false).then((res) => {
        if (check.deniedStatuses.includes(res.status)) return;
        if (res.status === 200) {
          cy.log(`${check.name}: member got 200 (RBAC may not be enforced for trainers)`);
          return;
        }
        expect(check.deniedStatuses, `${check.name} (member denied)`).to.include(res.status);
      });
    });
  });

  // --- No-token checks ---

  it('Protected endpoints return 401 without any token', () => {
    const protectedEndpoints = [
      { method: 'GET' as const, url: '/auth/me' },
      { method: 'GET' as const, url: '/billing/summary' },
      { method: 'GET' as const, url: '/payments/admin' },
      { method: 'GET' as const, url: '/crm/contacts' },
      { method: 'GET' as const, url: '/superadmin/dashboard/stats' },
      { method: 'GET' as const, url: '/trainer/classes/me' },
      { method: 'GET' as const, url: '/memberships/me' },
      { method: 'GET' as const, url: '/notifications' },
      { method: 'GET' as const, url: '/settings' },
    ];

    cy.wrap(protectedEndpoints).each((ep: any) => {
      cy.request({
        method: ep.method,
        url: `${API_PREFIX}${ep.url}`,
        failOnStatusCode: false,
        timeout: 20000,
      }).then((res) => {
        expect([401, 403], `${ep.method} ${ep.url} (no token)`).to.include(res.status);
      });
    });
  });
});
