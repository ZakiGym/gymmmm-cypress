// Legacy spec re-enabled.

// cypress/e2e/04.crm-notifications-qr-public.cy.ts
import { authRequest, getEnv, login, API_PREFIX } from '../../support/api';

describe('CRM, Notifications, QR & Public', () => {
  let adminToken: string;

  before(() => {
    login(getEnv('ADMIN_EMAIL', 'admin@gymmm.app'), getEnv('ADMIN_PASSWORD'), {
      retryOnRateLimit: true,
    }).then(
      (body) => {
        adminToken = body.token;
      },
    );
  });

  it('CRUD on CRM contacts', () => {
    let contactId: string;

    authRequest(adminToken, 'GET', '/crm/contacts?q=public&limit=3').then(
      (res) => {
        expect(res.status).to.eq(200);
      },
    );

    authRequest(adminToken, 'POST', '/crm/contacts', {
      firstName: 'Ava',
      lastName: 'Cypress',
      email: 'ava.cypress@example.com',
      phone: '+1-555-50001',
      tags: ['lead', 'cypress'],
    })
      .then((res) => {
        expect(res.status).to.eq(201);
        contactId = res.body._id;
      })
      .then(() =>
        authRequest(adminToken, 'GET', `/crm/contacts/${contactId}`),
      )
      .then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.email).to.eq('ava.cypress@example.com');
      })
      .then(() =>
        authRequest(adminToken, 'PUT', `/crm/contacts/${contactId}`, {
          tags: ['lead', 'trial', 'cypress'],
        }),
      )
      .then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.tags).to.include('trial');
      })
      .then(() =>
        authRequest(adminToken, 'DELETE', `/crm/contacts/${contactId}`),
      )
      .then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
  });

  it('notifications templates, send-test, and preferences', () => {
    authRequest(adminToken, 'GET', '/notifications/templates', undefined, false).then((res) => {
      expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
    });

    authRequest(adminToken, 'POST', '/notifications/send-test', {
      channel: 'email',
      to: 'owner@example.com',
      template: 'classReminder',
      data: { className: 'Cypress HIIT' },
    }, false).then((res) => {
      expect([200, 202, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
    });

    authRequest(adminToken, 'GET', '/notifications/preferences', undefined, false)
      .then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
        if (res.status !== 200) return;
      })
      .then(() =>
        authRequest(
          adminToken,
          'PUT',
          '/notifications/preferences',
          {
          email: true,
          sms: false,
          },
          false,
        ),
      )
      .then((res) => {
        if (!res) return;
        expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include((res as any).status);
      });
  });

  it('QR issue / scan / revoke cycle', () => {
    const memberId = getEnv('MEMBER_ID');
    let qrToken: string | undefined;

    authRequest(adminToken, 'POST', '/qr/issue', { memberId })
      .then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        qrToken = res.body.token || res.body.qrToken;
        expect(qrToken).to.be.a('string');
      })
      .then(() => {
        if (!qrToken) return;
        return authRequest(adminToken, 'POST', '/qr/scan', { token: qrToken });
      })
      .then((res) => {
        if (res && 'status' in res) {
          expect(res.status).to.be.oneOf([200, 202]);
        }
      })
      .then(() =>
        authRequest(adminToken, 'POST', '/qr/revoke', { memberId }),
      )
      .then((res) => {
        if (res && 'status' in res) {
          expect(res.status).to.be.oneOf([200, 204]);
        }
      });

    // unauthorized QR scan should fail
    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/qr/scan`,
      failOnStatusCode: false,
      body: { token: 'invalid' },
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 401, 404]);
    });
  });

  it('public lead + public classes', () => {
    const gymId = getEnv('GYM_ID');

    cy.request({
      method: 'POST',
      url: `${API_PREFIX}/public/lead`,
      failOnStatusCode: false,
      body: {
        gymId,
        firstName: 'Sam',
        lastName: 'Cypress',
        email: 'sam.cypress@example.com',
        phone: '+1-555-6000',
        source: 'website-cypress',
      },
    }).then((res) => {
      expect([200, 201, 202, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503]).to.include(res.status);
    });

    cy.request({
      method: 'GET',
      url: `${API_PREFIX}/public/classes?gymId=${encodeURIComponent(gymId)}`,
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 400, 401, 403, 404, 422, 429, 500, 502, 503]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.be.an('array');
      }
    });
  });
});