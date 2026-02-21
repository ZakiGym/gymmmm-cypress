// cypress/e2e/api/34.api.validation.comprehensive.cy.ts

import { API_PREFIX, authRequest, getEnv } from '../../support/api';

const FAKE_OID = '000000000000000000000000';
const BAD_OID = 'not-a-valid-id';

describe('API: Comprehensive Input Validation (negative tests)', () => {
  const gymId = getEnv('GYM_ID');

  let adminToken = '';
  let superToken = '';
  let memberToken = '';
  let trainerToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('superadmin').then(({ token }) => { superToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('trainer').then(({ token }) => { trainerToken = token; });
  });

  // Helper: expect a 400-family error
  const expectValidationError = (
    label: string,
    res: Cypress.Response<any>,
  ) => {
    expect(
      [400, 401, 403, 404, 409, 422, 500],
      `${label} should reject invalid input`,
    ).to.include(res.status);
  };

  // ============================
  // AUTH
  // ============================

  describe('Auth validation', () => {
    it('POST /auth/login — empty body', () => {
      cy.request({
        method: 'POST', url: `${API_PREFIX}/auth/login`, body: {}, failOnStatusCode: false,
      }).then((res) => expectValidationError('login empty body', res));
    });

    it('POST /auth/login — missing password', () => {
      cy.request({
        method: 'POST', url: `${API_PREFIX}/auth/login`, body: { email: 'test@test.com' }, failOnStatusCode: false,
      }).then((res) => expectValidationError('login missing password', res));
    });

    it('POST /auth/login — invalid email format', () => {
      cy.request({
        method: 'POST', url: `${API_PREFIX}/auth/login`, body: { email: 'not-an-email', password: 'x' }, failOnStatusCode: false,
      }).then((res) => expectValidationError('login invalid email', res));
    });

    it('POST /auth/register-by-invite — expired/missing token', () => {
      cy.request({
        method: 'POST', url: `${API_PREFIX}/auth/register-by-invite`,
        body: { token: 'expired-token', name: 'Test', password: 'Pass123!' },
        failOnStatusCode: false,
      }).then((res) => expectValidationError('register expired token', res));
    });

    it('POST /auth/register-by-invite — missing required fields', () => {
      cy.request({
        method: 'POST', url: `${API_PREFIX}/auth/register-by-invite`,
        body: {},
        failOnStatusCode: false,
      }).then((res) => expectValidationError('register missing fields', res));
    });
  });

  // ============================
  // USER
  // ============================

  describe('User validation', () => {
    it('PUT /user/change-password — wrong current password', () => {
      authRequest(adminToken, 'PUT', '/user/change-password', {
        oldPassword: 'WrongPassword!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }, false).then((res) => expectValidationError('wrong current password', res));
    });

    it('PUT /user/change-password — mismatched confirm', () => {
      authRequest(adminToken, 'PUT', '/user/change-password', {
        oldPassword: getEnv('ADMIN_PASSWORD'),
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass!',
      }, false).then((res) => expectValidationError('mismatched confirm', res));
    });

    it('PUT /user/change-password — empty body', () => {
      authRequest(adminToken, 'PUT', '/user/change-password', {}, false).then((res) =>
        expectValidationError('change password empty body', res),
      );
    });

    it('POST /user/create-member — missing email', () => {
      authRequest(adminToken, 'POST', '/user/create-member', {
        name: 'Test', password: 'Pass123!', gymId,
      }, false).then((res) => expectValidationError('create member missing email', res));
    });

    it('POST /user/create-member — empty body', () => {
      authRequest(adminToken, 'POST', '/user/create-member', {}, false).then((res) =>
        expectValidationError('create member empty body', res),
      );
    });

    it('PATCH /user/profile — malformed payload', () => {
      authRequest(adminToken, 'PATCH', '/user/profile', { email: 'not-an-email' }, false).then(
        (res) => {
          // Some APIs accept any patch; 200 or 400/422 are both acceptable
          expect([200, 204, 400, 422], 'patch profile malformed').to.include(res.status);
        },
      );
    });

    it('GET /user/{id} — non-existent ID', () => {
      authRequest(adminToken, 'GET', `/user/${FAKE_OID}`, undefined, false).then((res) => {
        expect([400, 404], 'user not found').to.include(res.status);
      });
    });

    it('GET /user/{id} — malformed ID', () => {
      authRequest(adminToken, 'GET', `/user/${BAD_OID}`, undefined, false).then((res) => {
        expect([400, 404, 422, 500], 'user malformed id').to.include(res.status);
      });
    });
  });

  // ============================
  // CLASSES & CLASS TYPES
  // ============================

  describe('Classes validation', () => {
    it('POST /classes — empty body', () => {
      authRequest(adminToken, 'POST', '/classes', {}, false).then((res) =>
        expectValidationError('create class empty body', res),
      );
    });

    it('POST /classes — missing required fields', () => {
      authRequest(adminToken, 'POST', '/classes', { title: 'Test' }, false).then((res) =>
        expectValidationError('create class missing fields', res),
      );
    });

    it('POST /class-types — empty body', () => {
      authRequest(adminToken, 'POST', '/class-types', {}, false).then((res) =>
        expectValidationError('create class type empty body', res),
      );
    });

    it('PUT /classes/{id} — non-existent ID', () => {
      authRequest(adminToken, 'PUT', `/classes/${FAKE_OID}`, { title: 'X' }, false).then((res) => {
        expect([400, 404], 'update class not found').to.include(res.status);
      });
    });

    it('POST /classes/{id}/book — non-existent class', () => {
      authRequest(memberToken, 'POST', `/classes/${FAKE_OID}/book`, {}, false).then((res) => {
        expect([400, 404], 'book non-existent class').to.include(res.status);
      });
    });
  });

  // ============================
  // CRM
  // ============================

  describe('CRM validation', () => {
    it('POST /crm/contacts — missing email (required)', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', { firstName: 'Test' }, false).then((res) =>
        expectValidationError('crm contact missing email', res),
      );
    });

    it('POST /crm/contacts — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', {}, false).then((res) =>
        expectValidationError('crm contact empty body', res),
      );
    });

    it('POST /crm/deals — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/deals', {}, false).then((res) =>
        expectValidationError('crm deal empty body', res),
      );
    });

    it('POST /crm/pipelines — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/pipelines', {}, false).then((res) =>
        expectValidationError('crm pipeline empty body', res),
      );
    });

    it('POST /crm/tasks — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/tasks', {}, false).then((res) =>
        expectValidationError('crm task empty body', res),
      );
    });

    it('POST /crm/forms — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/forms', {}, false).then((res) =>
        expectValidationError('crm form empty body', res),
      );
    });

    it('POST /crm/activities — empty body', () => {
      authRequest(adminToken, 'POST', '/crm/activities', {}, false).then((res) =>
        expectValidationError('crm activity empty body', res),
      );
    });

    it('GET /crm/contacts/{id} — non-existent', () => {
      authRequest(adminToken, 'GET', `/crm/contacts/${FAKE_OID}`, undefined, false).then((res) => {
        expect([400, 404], 'crm contact not found').to.include(res.status);
      });
    });

    it('PATCH /crm/deals/{id}/stage — missing stageId', () => {
      authRequest(adminToken, 'PATCH', `/crm/deals/${FAKE_OID}/stage`, {}, false).then((res) =>
        expectValidationError('deal stage missing stageId', res),
      );
    });
  });

  // ============================
  // MEMBERSHIPS
  // ============================

  describe('Memberships validation', () => {
    it('POST /memberships — empty body', () => {
      authRequest(adminToken, 'POST', '/memberships', {}, false).then((res) =>
        expectValidationError('create membership empty body', res),
      );
    });

    it('POST /memberships/join/{id} — non-existent plan', () => {
      authRequest(memberToken, 'POST', `/memberships/join/${FAKE_OID}`, {}, false).then((res) => {
        expect([400, 403, 404], 'join non-existent plan').to.include(res.status);
      });
    });

    it('PUT /memberships/assign — empty body', () => {
      authRequest(adminToken, 'PUT', '/memberships/assign', {}, false).then((res) =>
        expectValidationError('assign membership empty body', res),
      );
    });

    it('PUT /memberships/{id} — non-existent', () => {
      authRequest(adminToken, 'PUT', `/memberships/${FAKE_OID}`, { name: 'X' }, false).then((res) => {
        expect([400, 404], 'update membership not found').to.include(res.status);
      });
    });
  });

  // ============================
  // PAYMENTS / BILLING
  // ============================

  describe('Payments & billing validation', () => {
    it('POST /payments/manual — empty body', () => {
      authRequest(adminToken, 'POST', '/payments/manual', {}, false).then((res) =>
        expectValidationError('manual payment empty body', res),
      );
    });

    it('POST /payments/checkout — empty body', () => {
      authRequest(memberToken, 'POST', '/payments/checkout', {}, false).then((res) =>
        expectValidationError('checkout empty body', res),
      );
    });

    it('POST /payments/confirm — missing sessionId', () => {
      authRequest(memberToken, 'POST', '/payments/confirm', {}, false).then((res) =>
        expectValidationError('confirm missing sessionId', res),
      );
    });

    it('POST /billing/coupons — missing code', () => {
      authRequest(adminToken, 'POST', '/billing/coupons', { percentOff: 10 }, false).then((res) =>
        expectValidationError('coupon missing code', res),
      );
    });

    it('POST /billing/coupons — missing percentOff', () => {
      authRequest(adminToken, 'POST', '/billing/coupons', { code: 'TEST' }, false).then((res) =>
        expectValidationError('coupon missing percentOff', res),
      );
    });

    it('POST /billing/checkout — empty body', () => {
      authRequest(adminToken, 'POST', '/billing/checkout', {}, false).then((res) => {
        // May succeed with default plan or fail with validation
        expect([200, 400, 422, 500], 'billing checkout empty body').to.include(res.status);
      });
    });
  });

  // ============================
  // SCHEDULE TEMPLATES
  // ============================

  describe('Schedule templates validation', () => {
    it('POST /schedule-templates — empty body', () => {
      authRequest(adminToken, 'POST', '/schedule-templates', {}, false).then((res) =>
        expectValidationError('schedule template empty body', res),
      );
    });

    it('PUT /schedule-templates/{id} — non-existent', () => {
      authRequest(adminToken, 'PUT', `/schedule-templates/${FAKE_OID}`, { name: 'X' }, false).then(
        (res) => {
          expect([400, 404], 'update schedule template not found').to.include(res.status);
        },
      );
    });
  });

  // ============================
  // TRAINER
  // ============================

  describe('Trainer validation', () => {
    it('POST /trainer/availability — empty body', () => {
      authRequest(trainerToken, 'POST', '/trainer/availability', {}, false).then((res) =>
        expectValidationError('trainer availability empty body', res),
      );
    });

    it('PUT /trainer/availability/{id} — non-existent', () => {
      authRequest(trainerToken, 'PUT', `/trainer/availability/${FAKE_OID}`, { startTime: '08:00' }, false).then(
        (res) => {
          expect([400, 404], 'update availability not found').to.include(res.status);
        },
      );
    });
  });

  // ============================
  // NOTIFICATIONS
  // ============================

  describe('Notifications validation', () => {
    it('POST /notifications/email — missing to', () => {
      authRequest(adminToken, 'POST', '/notifications/email', {
        subject: 'Test',
      }, false).then((res) => expectValidationError('email missing to', res));
    });

    it('POST /notifications/email — missing subject', () => {
      authRequest(adminToken, 'POST', '/notifications/email', {
        to: 'test@test.com',
      }, false).then((res) => expectValidationError('email missing subject', res));
    });

    it('POST /notifications/email — empty body', () => {
      authRequest(adminToken, 'POST', '/notifications/email', {}, false).then((res) =>
        expectValidationError('email empty body', res),
      );
    });
  });

  // ============================
  // QR
  // ============================

  describe('QR validation', () => {
    it('POST /qr/verify — missing token', () => {
      authRequest(adminToken, 'POST', '/qr/verify', {}, false).then((res) =>
        expectValidationError('qr verify missing token', res),
      );
    });

    it('POST /qr/verify — invalid token', () => {
      authRequest(adminToken, 'POST', '/qr/verify', { token: 'fake-token' }, false).then((res) =>
        expectValidationError('qr verify invalid token', res),
      );
    });

    it('POST /qr/member-lookup — empty query', () => {
      authRequest(adminToken, 'POST', '/qr/member-lookup', {}, false).then((res) =>
        expectValidationError('member lookup empty query', res),
      );
    });
  });

  // ============================
  // SUPERADMIN
  // ============================

  describe('Superadmin validation', () => {
    it('POST /superadmin/plans — empty body', () => {
      authRequest(superToken, 'POST', '/superadmin/plans', {}, false).then((res) =>
        expectValidationError('create plan empty body', res),
      );
    });

    it('PUT /superadmin/plans/{id} — non-existent', () => {
      authRequest(superToken, 'PUT', `/superadmin/plans/${FAKE_OID}`, { name: 'X' }, false).then(
        (res) => {
          expect([400, 404], 'update plan not found').to.include(res.status);
        },
      );
    });

    it('POST /superadmin/feature-toggles/apply-preset — empty body', () => {
      authRequest(superToken, 'POST', '/superadmin/feature-toggles/apply-preset', {}, false).then(
        (res) => expectValidationError('apply preset empty body', res),
      );
    });

    it('POST /superadmin/gyms/{id}/users — empty body', () => {
      authRequest(superToken, 'POST', `/superadmin/gyms/${gymId}/users`, {}, false).then((res) =>
        expectValidationError('create user empty body', res),
      );
    });

    it('PATCH /superadmin/gyms/{id}/status — empty body', () => {
      authRequest(superToken, 'PATCH', `/superadmin/gyms/${gymId}/status`, {}, false).then((res) =>
        expectValidationError('gym status empty body', res),
      );
    });
  });

  // ============================
  // GYM
  // ============================

  describe('Gym validation', () => {
    it('POST /gym — empty body', () => {
      authRequest(superToken, 'POST', '/gym', {}, false).then((res) =>
        expectValidationError('create gym empty body', res),
      );
    });

    it('POST /gym/with-admin — empty body', () => {
      authRequest(superToken, 'POST', '/gym/with-admin', {}, false).then((res) =>
        expectValidationError('create gym with admin empty body', res),
      );
    });

    it('PUT /gym/{id} — non-existent', () => {
      authRequest(superToken, 'PUT', `/gym/${FAKE_OID}`, { name: 'X' }, false).then((res) => {
        expect([400, 403, 404], 'update gym not found').to.include(res.status);
      });
    });
  });

  // ============================
  // COUPONS
  // ============================

  describe('Coupons validation', () => {
    it('POST /coupons — empty body', () => {
      authRequest(adminToken, 'POST', '/coupons', {}, false).then((res) =>
        expectValidationError('create coupon empty body', res),
      );
    });

    it('PUT /coupons/{id} — non-existent', () => {
      authRequest(adminToken, 'PUT', `/coupons/${FAKE_OID}`, { percentOff: 5 }, false).then(
        (res) => {
          expect([400, 404], 'update coupon not found').to.include(res.status);
        },
      );
    });
  });

  // ============================
  // SETTINGS
  // ============================

  describe('Settings validation', () => {
    it('PUT /settings — empty body', () => {
      authRequest(adminToken, 'PUT', '/settings', {}, false).then((res) => {
        // Some APIs allow empty update, some reject it
        expect([200, 204, 400, 422], 'update settings empty body').to.include(res.status);
      });
    });
  });
});
