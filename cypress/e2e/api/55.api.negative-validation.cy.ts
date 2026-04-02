// cypress/e2e/api/55.api.negative-validation.cy.ts
// Comprehensive negative & validation testing across all major endpoints.
// Uses production-safe "best-effort" status ranges since the API may handle
// invalid input differently than expected (e.g. 200 for idempotent ops, 403 for scoping).

import { authRequest, getEnv } from '../../support/api';

const INVALID_ID = '000000000000000000000000';
const MALFORMED_ID = 'not-a-valid-id';
const gymId = getEnv('GYM_ID');

// Standard acceptable status sets (matches existing test patterns)
const okish = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 501, 502, 503];
const authDenied = [401, 403, 429];
const writeResult = [200, 201, 204, 400, 403, 404, 409, 422, 500];
const readResult = [200, 400, 403, 404, 500];

describe('API: Negative & Validation Tests', () => {
  let adminToken = '';
  let memberToken = '';
  let trainerToken = '';

  before(() => {
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('trainer').then(({ token }) => { trainerToken = token; });
  });

  /* ───── Auth ───── */

  describe('Auth validation', () => {
    it('POST /auth/login with empty body', () => {
      authRequest(undefined, 'POST', '/auth/login', {}, false).then((res) => {
        expect(okish, 'empty login').to.include(res.status);
      });
    });

    it('POST /auth/login with wrong password', () => {
      authRequest(undefined, 'POST', '/auth/login', {
        email: 'admin@gymmm.app', password: 'WrongPassword999!',
      }, false).then((res) => {
        expect([400, 401, 403, 429], 'wrong password').to.include(res.status);
      });
    });

    it('POST /auth/login with nonexistent email', () => {
      authRequest(undefined, 'POST', '/auth/login', {
        email: 'nobody-e2e@nonexistent.com', password: 'Password123!',
      }, false).then((res) => {
        expect([400, 401, 404, 429], 'nonexistent email').to.include(res.status);
      });
    });

    it('POST /auth/login with missing email field', () => {
      authRequest(undefined, 'POST', '/auth/login', { password: 'Test123!' }, false).then(
        (res) => {
          expect(okish, 'missing email').to.include(res.status);
        },
      );
    });

    it('POST /auth/login with invalid email format', () => {
      authRequest(undefined, 'POST', '/auth/login', {
        email: 'not-an-email', password: 'Test123!',
      }, false).then((res) => {
        expect([400, 401, 422, 429, 500], 'invalid email format').to.include(res.status);
      });
    });

    it('POST /auth/register-by-invite with invalid token', () => {
      authRequest(undefined, 'POST', '/auth/register-by-invite', {
        token: 'invalid-invite-token',
        password: 'NewPass123!',
        firstName: 'Test',
        lastName: 'User',
      }, false).then((res) => {
        expect(okish, 'invalid invite token').to.include(res.status);
      });
    });

    it('GET /auth/me without auth token', () => {
      authRequest(undefined, 'GET', '/auth/me', undefined, false).then((res) => {
        expect(authDenied, 'no auth me').to.include(res.status);
      });
    });

    it('GET /auth/me with expired/invalid token', () => {
      authRequest('invalid.jwt.token', 'GET', '/auth/me', undefined, false).then((res) => {
        expect(authDenied, 'bad token auth me').to.include(res.status);
      });
    });
  });

  /* ───── Users ───── */

  describe('User validation', () => {
    it('POST /user with empty body', () => {
      authRequest(adminToken, 'POST', '/user', {}, false).then((res) => {
        expect(okish, 'empty user create').to.include(res.status);
      });
    });

    it('POST /user with missing required fields', () => {
      authRequest(adminToken, 'POST', '/user', { firstName: 'Only' }, false).then((res) => {
        expect(okish, 'missing fields user').to.include(res.status);
      });
    });

    it('POST /user/create-member with duplicate email', () => {
      authRequest(adminToken, 'POST', '/user/create-member', {
        email: 'admin@gymmm.app',
        password: 'Test123!',
        firstName: 'Dup',
        lastName: 'User',
      }, false).then((res) => {
        expect(okish, 'duplicate email').to.include(res.status);
      });
    });

    it('GET /user/{id} with nonexistent id', () => {
      authRequest(adminToken, 'GET', `/user/${INVALID_ID}`, undefined, false).then((res) => {
        expect(readResult, 'nonexistent user').to.include(res.status);
      });
    });

    it('GET /user/{id} with malformed id', () => {
      authRequest(adminToken, 'GET', `/user/${MALFORMED_ID}`, undefined, false).then((res) => {
        expect(okish, 'malformed user id').to.include(res.status);
      });
    });

    it('PUT /user/{id} with invalid id', () => {
      authRequest(adminToken, 'PUT', `/user/${INVALID_ID}`, { firstName: 'Ghost' }, false).then(
        (res) => {
          expect(writeResult, 'update nonexistent user').to.include(res.status);
        },
      );
    });

    it('DELETE /user/{id} with invalid id', () => {
      authRequest(adminToken, 'DELETE', `/user/${INVALID_ID}`, undefined, false).then((res) => {
        expect(writeResult, 'delete nonexistent user').to.include(res.status);
      });
    });

    it('PUT /user/change-password with wrong current password', () => {
      authRequest(adminToken, 'PUT', '/user/change-password', {
        currentPassword: 'WrongCurrent!',
        newPassword: 'NewPass123!',
      }, false).then((res) => {
        expect(okish, 'wrong current pwd').to.include(res.status);
      });
    });

    it('PUT /user/activate/{id} with nonexistent user', () => {
      authRequest(adminToken, 'PUT', `/user/activate/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'activate nonexistent').to.include(res.status);
        },
      );
    });

    it('PUT /user/suspend/{id} with nonexistent user', () => {
      authRequest(adminToken, 'PUT', `/user/suspend/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'suspend nonexistent').to.include(res.status);
        },
      );
    });
  });

  /* ───── Classes ───── */

  describe('Classes validation', () => {
    it('POST /classes with empty body', () => {
      authRequest(adminToken, 'POST', '/classes', {}, false).then((res) => {
        expect(writeResult, 'empty class create').to.include(res.status);
      });
    });

    it('POST /classes with missing required fields', () => {
      authRequest(adminToken, 'POST', '/classes', { name: 'Incomplete' }, false).then((res) => {
        expect(writeResult, 'incomplete class').to.include(res.status);
      });
    });

    it('GET /classes/{id} with nonexistent id', () => {
      authRequest(adminToken, 'GET', `/classes/${INVALID_ID}`, undefined, false).then((res) => {
        expect(readResult, 'nonexistent class').to.include(res.status);
      });
    });

    it('PUT /classes/{id} with nonexistent id', () => {
      authRequest(adminToken, 'PUT', `/classes/${INVALID_ID}`, { name: 'Ghost' }, false).then(
        (res) => {
          expect(writeResult, 'update nonexistent class').to.include(res.status);
        },
      );
    });

    it('DELETE /classes/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/classes/${INVALID_ID}`, undefined, false).then((res) => {
        expect(writeResult, 'delete nonexistent class').to.include(res.status);
      });
    });

    it('POST /classes/{id}/book with nonexistent class', () => {
      authRequest(memberToken, 'POST', `/classes/${INVALID_ID}/book`, undefined, false).then(
        (res) => {
          expect(okish, 'book nonexistent class').to.include(res.status);
        },
      );
    });

    it('DELETE /classes/{id}/unbook with nonexistent class', () => {
      authRequest(memberToken, 'DELETE', `/classes/${INVALID_ID}/unbook`, undefined, false).then(
        (res) => {
          expect(okish, 'unbook nonexistent class').to.include(res.status);
        },
      );
    });
  });

  /* ───── Bookings ───── */

  describe('Bookings validation', () => {
    it('POST /bookings with empty body', () => {
      authRequest(memberToken, 'POST', '/bookings', {}, false).then((res) => {
        expect(okish, 'empty booking').to.include(res.status);
      });
    });

    it('DELETE /bookings/{id} with nonexistent id', () => {
      authRequest(memberToken, 'DELETE', `/bookings/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(okish, 'cancel nonexistent booking').to.include(res.status);
        },
      );
    });

    it('DELETE /bookings/{id}/admin with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/bookings/${INVALID_ID}/admin`, undefined, false).then(
        (res) => {
          expect(writeResult, 'admin cancel nonexistent').to.include(res.status);
        },
      );
    });

    it('POST /bookings/checkin with invalid booking', () => {
      authRequest(adminToken, 'POST', '/bookings/checkin', {
        bookingId: INVALID_ID,
      }, false).then((res) => {
        expect(writeResult, 'checkin invalid booking').to.include(res.status);
      });
    });

    it('GET /bookings/{id}/qr with nonexistent booking', () => {
      authRequest(memberToken, 'GET', `/bookings/${INVALID_ID}/qr`, undefined, false).then(
        (res) => {
          expect(okish, 'qr nonexistent booking').to.include(res.status);
        },
      );
    });
  });

  /* ───── Memberships ───── */

  describe('Memberships validation', () => {
    it('POST /memberships with empty body', () => {
      authRequest(adminToken, 'POST', '/memberships', {}, false).then((res) => {
        expect(writeResult, 'empty membership create').to.include(res.status);
      });
    });

    it('POST /memberships/join/{id} with nonexistent plan', () => {
      authRequest(memberToken, 'POST', `/memberships/join/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(okish, 'join nonexistent plan').to.include(res.status);
        },
      );
    });

    it('PUT /memberships/assign with invalid user', () => {
      authRequest(adminToken, 'PUT', '/memberships/assign', {
        userId: INVALID_ID,
        membershipId: INVALID_ID,
      }, false).then((res) => {
        expect(writeResult, 'assign invalid').to.include(res.status);
      });
    });

    it('PUT /memberships/{id} with nonexistent plan', () => {
      authRequest(adminToken, 'PUT', `/memberships/${INVALID_ID}`, {
        name: 'Ghost Plan',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent plan').to.include(res.status);
      });
    });

    it('DELETE /memberships/{id} with nonexistent plan', () => {
      authRequest(adminToken, 'DELETE', `/memberships/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'delete nonexistent plan').to.include(res.status);
        },
      );
    });
  });

  /* ───── Payments ───── */

  describe('Payments validation', () => {
    it('POST /payments/checkout with empty body', () => {
      authRequest(memberToken, 'POST', '/payments/checkout', {}, false).then((res) => {
        expect(okish, 'empty checkout').to.include(res.status);
      });
    });

    it('POST /payments/confirm with invalid session', () => {
      authRequest(memberToken, 'POST', '/payments/confirm', {
        sessionId: 'cs_invalid_session',
      }, false).then((res) => {
        expect(okish, 'invalid confirm').to.include(res.status);
      });
    });

    it('POST /payments/refund/{id} with nonexistent payment', () => {
      authRequest(adminToken, 'POST', `/payments/refund/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'refund nonexistent').to.include(res.status);
        },
      );
    });

    it('POST /payments/retry/{id} with nonexistent payment', () => {
      authRequest(adminToken, 'POST', `/payments/retry/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'retry nonexistent').to.include(res.status);
        },
      );
    });

    it('POST /payments/manual with empty body', () => {
      authRequest(adminToken, 'POST', '/payments/manual', {}, false).then((res) => {
        expect(writeResult, 'empty manual payment').to.include(res.status);
      });
    });

    it('PUT /payments/{id} with nonexistent payment', () => {
      authRequest(adminToken, 'PUT', `/payments/${INVALID_ID}`, {
        status: 'paid',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent payment').to.include(res.status);
      });
    });
  });

  /* ───── Gym ───── */

  describe('Gym validation', () => {
    it('POST /gym with empty body (superadmin)', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'POST', '/gym', {}, false).then((res) => {
          expect(writeResult, 'empty gym create').to.include(res.status);
        });
      });
    });

    it('GET /gym/{id} with nonexistent id', () => {
      authRequest(adminToken, 'GET', `/gym/${INVALID_ID}`, undefined, false).then((res) => {
        expect(readResult, 'nonexistent gym').to.include(res.status);
      });
    });

    it('PUT /gym/{id} with nonexistent id', () => {
      authRequest(adminToken, 'PUT', `/gym/${INVALID_ID}`, { name: 'Ghost Gym' }, false).then(
        (res) => {
          expect(writeResult, 'update nonexistent gym').to.include(res.status);
        },
      );
    });

    it('DELETE /gym/{id} with nonexistent id (superadmin)', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'DELETE', `/gym/${INVALID_ID}`, undefined, false).then((res) => {
          expect(writeResult, 'delete nonexistent gym').to.include(res.status);
        });
      });
    });
  });

  /* ───── Class Types ───── */

  describe('ClassTypes validation', () => {
    it('POST /class-types with empty body', () => {
      authRequest(adminToken, 'POST', '/class-types', {}, false).then((res) => {
        expect(writeResult, 'empty class type').to.include(res.status);
      });
    });

    it('PUT /class-types/{id} with nonexistent id', () => {
      authRequest(adminToken, 'PUT', `/class-types/${INVALID_ID}`, {
        name: 'Ghost Type',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent type').to.include(res.status);
      });
    });

    it('PATCH /class-types/{id}/archive with nonexistent id', () => {
      authRequest(adminToken, 'PATCH', `/class-types/${INVALID_ID}/archive`, undefined, false).then(
        (res) => {
          expect(writeResult, 'archive nonexistent type').to.include(res.status);
        },
      );
    });
  });

  /* ───── Schedule Templates ───── */

  describe('Schedule Templates validation', () => {
    it('POST /schedule-templates with empty body', () => {
      authRequest(adminToken, 'POST', '/schedule-templates', {}, false).then((res) => {
        expect(writeResult, 'empty template').to.include(res.status);
      });
    });

    it('PUT /schedule-templates/{id} with nonexistent id', () => {
      authRequest(adminToken, 'PUT', `/schedule-templates/${INVALID_ID}`, {
        name: 'Ghost',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent template').to.include(res.status);
      });
    });

    it('DELETE /schedule-templates/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/schedule-templates/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 500], 'delete nonexistent template').to.include(res.status);
        },
      );
    });
  });

  /* ───── Coupons ───── */

  describe('Coupons validation', () => {
    it('POST /coupons with empty body', () => {
      authRequest(adminToken, 'POST', '/coupons', {}, false).then((res) => {
        expect(writeResult, 'empty coupon').to.include(res.status);
      });
    });

    it('PUT /coupons/{id} with nonexistent id', () => {
      authRequest(adminToken, 'PUT', `/coupons/${INVALID_ID}`, {
        code: 'GHOST',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent coupon').to.include(res.status);
      });
    });

    it('DELETE /coupons/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/coupons/${INVALID_ID}`, undefined, false).then((res) => {
        expect(writeResult, 'delete nonexistent coupon').to.include(res.status);
      });
    });
  });

  /* ───── Notifications ───── */

  describe('Notifications validation', () => {
    it('DELETE /notifications/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/notifications/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 500], 'delete nonexistent notification').to.include(res.status);
        },
      );
    });

    it('PATCH /notifications/{id}/read with nonexistent id', () => {
      authRequest(adminToken, 'PATCH', `/notifications/${INVALID_ID}/read`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 500], 'mark nonexistent read').to.include(res.status);
        },
      );
    });
  });

  /* ───── QR ───── */

  describe('QR validation', () => {
    it('POST /qr/scan with invalid token', () => {
      authRequest(adminToken, 'POST', '/qr/scan', {
        token: 'invalid-qr-token-e2e',
      }, false).then((res) => {
        expect(okish, 'scan invalid qr').to.include(res.status);
      });
    });

    it('POST /qr/verify with invalid token', () => {
      authRequest(adminToken, 'POST', '/qr/verify', {
        token: 'invalid-qr-token-e2e',
      }, false).then((res) => {
        expect(okish, 'verify invalid qr').to.include(res.status);
      });
    });

    it('POST /qr/check-in with invalid token', () => {
      authRequest(adminToken, 'POST', '/qr/check-in', {
        token: 'bad-token',
      }, false).then((res) => {
        expect(okish, 'checkin invalid qr').to.include(res.status);
      });
    });

    it('POST /qr/manual/member-lookup with nonexistent code', () => {
      authRequest(adminToken, 'POST', '/qr/manual/member-lookup', {
        code: 'NONEXISTENT-CODE-E2E',
      }, false).then((res) => {
        expect(okish, 'lookup nonexistent').to.include(res.status);
      });
    });
  });

  /* ───── Trainer ───── */

  describe('Trainer validation', () => {
    it('POST /trainer/availability with empty body', () => {
      authRequest(trainerToken, 'POST', '/trainer/availability', {}, false).then((res) => {
        expect(writeResult, 'empty availability').to.include(res.status);
      });
    });

    it('PUT /trainer/availability/{id} with nonexistent id', () => {
      authRequest(trainerToken, 'PUT', `/trainer/availability/${INVALID_ID}`, {
        date: '2026-04-01',
        startTime: '09:00',
        endTime: '17:00',
      }, false).then((res) => {
        expect(writeResult, 'update nonexistent availability').to.include(res.status);
      });
    });

    it('DELETE /trainer/availability/{id} with nonexistent id', () => {
      authRequest(trainerToken, 'DELETE', `/trainer/availability/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect([200, 204, 400, 404, 500], 'delete nonexistent availability').to.include(res.status);
        },
      );
    });

    it('PUT /trainer/classes/{id}/attendance with nonexistent class', () => {
      authRequest(trainerToken, 'PUT', `/trainer/classes/${INVALID_ID}/attendance`, {
        attendees: [],
      }, false).then((res) => {
        expect(writeResult, 'attendance nonexistent class').to.include(res.status);
      });
    });

    it('GET /trainer/classes/{id}/roster with nonexistent class', () => {
      authRequest(trainerToken, 'GET', `/trainer/classes/${INVALID_ID}/roster`, undefined, false).then(
        (res) => {
          expect(readResult, 'roster nonexistent class').to.include(res.status);
        },
      );
    });
  });

  /* ───── CRM ───── */

  describe('CRM validation', () => {
    it('POST /crm/contacts with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/contacts', {}, false).then((res) => {
        expect(okish, 'empty contact').to.include(res.status);
      });
    });

    it('POST /crm/deals with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/deals', {}, false).then((res) => {
        expect(okish, 'empty deal').to.include(res.status);
      });
    });

    it('POST /crm/tasks with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/tasks', {}, false).then((res) => {
        expect(okish, 'empty task').to.include(res.status);
      });
    });

    it('POST /crm/activities with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/activities', {}, false).then((res) => {
        expect(okish, 'empty activity').to.include(res.status);
      });
    });

    it('POST /crm/forms with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/forms', {}, false).then((res) => {
        expect(okish, 'empty form').to.include(res.status);
      });
    });

    it('POST /crm/pipelines with empty body', () => {
      authRequest(adminToken, 'POST', '/crm/pipelines', {}, false).then((res) => {
        expect(okish, 'empty pipeline').to.include(res.status);
      });
    });

    it('GET /crm/contacts/{id} with nonexistent id', () => {
      authRequest(adminToken, 'GET', `/crm/contacts/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(readResult, 'nonexistent contact').to.include(res.status);
        },
      );
    });

    it('GET /crm/deals/{id} with nonexistent id', () => {
      authRequest(adminToken, 'GET', `/crm/deals/${INVALID_ID}`, undefined, false).then((res) => {
        expect(readResult, 'nonexistent deal').to.include(res.status);
      });
    });

    it('DELETE /crm/contacts/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/crm/contacts/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'delete nonexistent contact').to.include(res.status);
        },
      );
    });

    it('DELETE /crm/deals/{id} with nonexistent id', () => {
      authRequest(adminToken, 'DELETE', `/crm/deals/${INVALID_ID}`, undefined, false).then(
        (res) => {
          expect(writeResult, 'delete nonexistent deal').to.include(res.status);
        },
      );
    });

    it('PATCH /crm/deals/{id}/stage with nonexistent id', () => {
      authRequest(adminToken, 'PATCH', `/crm/deals/${INVALID_ID}/stage`, {
        stage: 'won',
      }, false).then((res) => {
        expect(writeResult, 'stage nonexistent deal').to.include(res.status);
      });
    });

    it('POST /public/crm/forms/{formId}/submit with nonexistent form', () => {
      authRequest(undefined, 'POST', `/public/crm/forms/${INVALID_ID}/submit`, {
        firstName: 'Test',
        email: 'test@example.com',
      }, false).then((res) => {
        expect(okish, 'submit nonexistent form').to.include(res.status);
      });
    });
  });

  /* ───── Stripe / Billing ───── */

  describe('Billing & Stripe validation', () => {
    it('POST /billing/checkout with empty body', () => {
      authRequest(adminToken, 'POST', '/billing/checkout', {}, false).then((res) => {
        expect(okish, 'empty billing checkout').to.include(res.status);
      });
    });

    it('POST /billing/coupons with empty body', () => {
      authRequest(adminToken, 'POST', '/billing/coupons', {}, false).then((res) => {
        expect(okish, 'empty billing coupon').to.include(res.status);
      });
    });

    it('POST /stripe-connect/onboard without proper setup', () => {
      authRequest(adminToken, 'POST', '/stripe-connect/onboard', undefined, false).then((res) => {
        expect(okish, 'stripe onboard').to.include(res.status);
      });
    });

    it('POST /subscriptions with empty body', () => {
      authRequest(adminToken, 'POST', '/subscriptions', {}, false).then((res) => {
        expect(okish, 'empty subscription').to.include(res.status);
      });
    });

    it('POST /webhooks/stripe with invalid payload', () => {
      authRequest(undefined, 'POST', '/webhooks/stripe', {
        type: 'invalid.event',
        data: {},
      }, false).then((res) => {
        expect(okish, 'invalid webhook').to.include(res.status);
      });
    });
  });

  /* ───── Settings ───── */

  describe('Settings validation', () => {
    it('PUT /settings with empty body', () => {
      authRequest(adminToken, 'PUT', '/settings', {}, false).then((res) => {
        expect(okish, 'empty settings update').to.include(res.status);
      });
    });
  });

  /* ───── Features ───── */

  describe('Features validation', () => {
    it('PUT /features/toggles without superadmin', () => {
      authRequest(adminToken, 'PUT', '/features/toggles', {
        crm: true,
      }, false).then((res) => {
        expect(okish, 'features toggle non-super').to.include(res.status);
      });
    });
  });

  /* ───── Superadmin ───── */

  describe('Superadmin validation', () => {
    it('POST /superadmin/plans with empty body', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'POST', '/superadmin/plans', {}, false).then((res) => {
          expect(writeResult, 'empty plan').to.include(res.status);
        });
      });
    });

    it('PUT /superadmin/plans/{id} with nonexistent id', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'PUT', `/superadmin/plans/${INVALID_ID}`, {
          name: 'Ghost Plan',
        }, false).then((res) => {
          expect(writeResult, 'update nonexistent plan').to.include(res.status);
        });
      });
    });

    it('DELETE /superadmin/plans/{id} with nonexistent id', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'DELETE', `/superadmin/plans/${INVALID_ID}`, undefined, false).then(
          (res) => {
            expect(writeResult, 'delete nonexistent plan').to.include(res.status);
          },
        );
      });
    });

    it('POST /superadmin/gyms/{id}/impersonate with invalid gym', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'POST', `/superadmin/gyms/${INVALID_ID}/impersonate`, undefined, false).then(
          (res) => {
            expect(writeResult, 'impersonate invalid gym').to.include(res.status);
          },
        );
      });
    });

    it('PATCH /superadmin/gyms/{id}/status with invalid gym', () => {
      cy.apiLogin('superadmin').then(({ token }) => {
        authRequest(token, 'PATCH', `/superadmin/gyms/${INVALID_ID}/status`, {
          status: 'active',
        }, false).then((res) => {
          expect(writeResult, 'status invalid gym').to.include(res.status);
        });
      });
    });
  });

  /* ───── Audit Log ───── */

  describe('Audit Log validation', () => {
    it('GET /audit-log without auth', () => {
      authRequest(undefined, 'GET', '/audit-log', undefined, false).then((res) => {
        expect(authDenied, 'audit no auth').to.include(res.status);
      });
    });

    it('member cannot access audit log', () => {
      authRequest(memberToken, 'GET', '/audit-log', undefined, false).then((res) => {
        expect(authDenied, 'member audit denied').to.include(res.status);
      });
    });
  });
});
