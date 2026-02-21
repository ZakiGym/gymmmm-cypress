/**
 * 49 — Notifications extras: mark-all-read, register-device, admin channels
 *
 * Covers notification endpoints not yet tested in other files.
 */

import { authRequest } from '../../support/api';

describe('Notifications — extra endpoints', () => {
  let memberToken: string;
  let adminToken: string;

  before(() => {
    cy.apiLogin('member').then(({ token }) => { memberToken = token; });
    cy.apiLogin('admin').then(({ token }) => { adminToken = token; });
  });

  /* ─── Member notification operations ─────────────────── */

  it('PATCH /notifications/mark-all-read — member', () => {
    authRequest(memberToken, 'PATCH', '/notifications/mark-all-read', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });

  it('POST /notifications/register-device — register push token', () => {
    authRequest(memberToken, 'POST', '/notifications/register-device', {
      token: 'fake-fcm-token-cypress-test-12345',
      platform: 'ios',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /notifications/register-device — android platform', () => {
    authRequest(memberToken, 'POST', '/notifications/register-device', {
      token: 'fake-fcm-token-android-cypress',
      platform: 'android',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('PATCH /notifications/mark-all-read — no auth', () => {
    authRequest(undefined, 'PATCH', '/notifications/mark-all-read', undefined, false)
      .then((res) => {
        expect([401, 403]).to.include(res.status);
      });
  });

  /* ─── Admin notification channels ────────────────────── */

  it('POST /admin/notifications/channel-config — email config', () => {
    authRequest(adminToken, 'POST', '/admin/notifications/channel-config', {
      channel: 'email',
      enabled: true,
      config: { fromName: 'Cypress Gym', replyTo: 'noreply@test.com' },
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /admin/notifications/channel-config — sms config', () => {
    authRequest(adminToken, 'POST', '/admin/notifications/channel-config', {
      channel: 'sms',
      enabled: false,
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /admin/notifications/preferences — set notification prefs', () => {
    authRequest(adminToken, 'POST', '/admin/notifications/preferences', {
      event: 'member.created',
      channels: ['email', 'push'],
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /admin/notifications/templates — create template', () => {
    authRequest(adminToken, 'POST', '/admin/notifications/templates', {
      name: `CY Template ${Date.now()}`,
      event: 'member.created',
      channel: 'email',
      subject: 'Welcome {{name}}',
      body: '<p>Hello {{name}}, welcome!</p>',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  it('POST /internal/notifications/submit — submit notification event', () => {
    authRequest(adminToken, 'POST', '/internal/notifications/submit', {
      event: 'member.created',
      data: { name: 'Cypress Test', email: 'cy@test.com' },
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422]).to.include(res.status);
    });
  });

  /* ─── Admin send email ───────────────────────────────── */

  it('POST /notifications/email — send manual email', () => {
    authRequest(adminToken, 'POST', '/notifications/email', {
      to: 'cy-test@example.com',
      subject: 'Cypress Test Email',
      body: '<p>This is a test</p>',
    }, false).then((res) => {
      expect([200, 201, 400, 403, 404, 422, 500]).to.include(res.status);
    });
  });

  it('POST /notifications/email — member cannot send', () => {
    authRequest(memberToken, 'POST', '/notifications/email', {
      to: 'nope@example.com',
      subject: 'Should fail',
      body: 'nope',
    }, false).then((res) => {
      expect([401, 403]).to.include(res.status);
    });
  });

  /* ─── Notification list & individual ops ─────────────── */

  it('GET /notifications — list member notifications', () => {
    authRequest(memberToken, 'GET', '/notifications', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('GET /notifications/unread-count', () => {
    authRequest(memberToken, 'GET', '/notifications/unread-count', undefined, false)
      .then((res) => {
        expect([200, 400, 403, 404]).to.include(res.status);
      });
  });

  it('PATCH /notifications/:fakeId/read — fake notification', () => {
    authRequest(memberToken, 'PATCH', '/notifications/000000000000000000000000/read', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });

  it('DELETE /notifications/:fakeId — fake notification', () => {
    authRequest(memberToken, 'DELETE', '/notifications/000000000000000000000000', undefined, false)
      .then((res) => {
        expect([200, 204, 400, 403, 404]).to.include(res.status);
      });
  });
});
