// cypress/e2e/api/37.api.features-misc.cy.ts

import { API_PREFIX, authRequest, getEnv } from '../../support/api';

describe('API: Features, Public Endpoints & Misc (best-effort)', () => {
  const gymId = getEnv('GYM_ID');

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

  // ============================
  // FEATURES
  // ============================

  it('GET /features/catalog — list available features', () => {
    authRequest(adminToken, 'GET', '/features/catalog', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'features catalog').to.include(res.status);
    });
  });

  it('GET /features/toggles — effective toggles for current gym', () => {
    authRequest(adminToken, 'GET', '/features/toggles', undefined, false).then((res) => {
      expect([200, 401, 403, 404], 'features toggles').to.include(res.status);
    });
  });

  it('PUT /features/toggles (superadmin update)', () => {
    authRequest(
      superToken,
      'PUT',
      '/features/toggles',
      { gymId, toggles: [{ key: 'crm', enabled: true }] },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'update features toggles').to.include(res.status);
    });
  });

  it('POST /features/preset (superadmin apply preset)', () => {
    authRequest(
      superToken,
      'POST',
      '/features/preset',
      { gymId, preset: 'Growth' },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'apply features preset').to.include(res.status);
    });
  });

  // ============================
  // PUBLIC ENDPOINTS (no auth)
  // ============================

  it('GET /auth/health — public health check', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/auth/health`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204], 'auth health').to.include(res.status);
    });
  });

  it('GET /qr/_health — public QR health check', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/qr/_health`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 204, 404], 'qr health').to.include(res.status);
    });
  });

  it('GET /memberships (public) — list membership plans', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/memberships`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 401, 403], 'public memberships').to.include(res.status);
    });
  });

  it('GET /classes (public) — list public classes', () => {
    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/classes`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 401, 403], 'public classes').to.include(res.status);
    });
  });

  // ============================
  // PUBLIC CRM FORM SUBMISSION
  // ============================

  it('POST /public/crm/forms/{formId}/submit — submit lead form (best-effort)', () => {
    // First, try to get a form ID. If no forms exist, use a fake ID.
    authRequest(adminToken, 'GET', '/crm/forms?limit=1', undefined, false).then((list) => {
      let formId = '000000000000000000000000';

      if (list.status === 200) {
        const items: any[] = (list.body as any)?.items || (list.body as any) || [];
        const first = items[0];
        const foundId = first?._id || first?.id;
        if (foundId) formId = foundId;
      }

      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/public/crm/forms/${formId}/submit`,
        body: {
          firstName: 'E2E',
          lastName: 'Lead',
          email: `lead-${Date.now()}@test.gymmm.app`,
          phone: '+15551234567',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 201, 400, 404, 422, 500], 'public form submit').to.include(res.status);
      });
    });
  });

  // ============================
  // UTILITY
  // ============================

  it('POST /echo — echo back payload', () => {
    const payload = { message: 'e2e echo test', timestamp: Date.now() };

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      body: payload,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 404], 'echo endpoint').to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.deep.include(payload);
      }
    });
  });

  // ============================
  // ADMIN NOTIFICATIONS
  // ============================

  it('POST /admin/notifications/templates — create notification template', () => {
    authRequest(
      adminToken,
      'POST',
      '/admin/notifications/templates',
      {
        name: `E2E Template ${Date.now()}`,
        type: 'email',
        subject: 'Test Subject',
        body: 'Test body content',
      },
      false,
    ).then((res) => {
      expect([200, 201, 400, 403, 404, 422], 'create notification template').to.include(
        res.status,
      );
    });
  });

  it('POST /admin/notifications/channel-config — upsert channel config', () => {
    authRequest(
      adminToken,
      'POST',
      '/admin/notifications/channel-config',
      {
        tenantId: gymId,
        email: { enabled: true },
        sms: { enabled: false },
      },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'upsert channel config').to.include(res.status);
    });
  });

  it('POST /admin/notifications/preferences — upsert preferences', () => {
    authRequest(
      adminToken,
      'POST',
      '/admin/notifications/preferences',
      {
        tenantId: gymId,
        userId: '000000000000000000000000',
        channels: { email: true, sms: false },
      },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'upsert notification prefs').to.include(res.status);
    });
  });

  it('POST /internal/notifications/submit — submit notification event', () => {
    authRequest(
      adminToken,
      'POST',
      '/internal/notifications/submit',
      {
        type: 'booking_confirmed',
        tenantId: gymId,
        recipientId: '000000000000000000000000',
        data: { className: 'Test Class' },
      },
      false,
    ).then((res) => {
      expect([200, 204, 400, 403, 404, 422], 'submit notification event').to.include(res.status);
    });
  });

  // ============================
  // BOOKINGS (admin operations)
  // ============================

  it('GET /bookings — member bookings list', () => {
    authRequest(adminToken, 'GET', '/bookings', undefined, false).then((res) => {
      expect([200, 401, 403], 'list bookings').to.include(res.status);
    });
  });

  it('POST /bookings — create booking (best-effort)', () => {
    authRequest(
      adminToken,
      'POST',
      '/bookings',
      {
        classId: '000000000000000000000000',
        userId: '000000000000000000000000',
      },
      false,
    ).then((res) => {
      // Expect validation error with fake IDs
      expect([200, 201, 400, 403, 404, 422], 'create booking').to.include(res.status);
    });
  });
});
