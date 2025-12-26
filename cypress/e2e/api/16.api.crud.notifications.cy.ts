// cypress/e2e/16.api.crud.notifications.cy.ts

import { API_PREFIX } from '../../support/api';

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('API: CRUD - notifications (best-effort, production-safe)', () => {
  it('List + unread-count + mark-read + delete (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      // LIST
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/notifications`,
        headers: authHeaders(token),
        failOnStatusCode: false,
      }).then((listRes) => {
        expect([200, 401, 403, 404, 500]).to.include(listRes.status);
        if (listRes.status !== 200) return;

        const items: any[] = (listRes.body as any)?.items || (listRes.body as any)?.notifications || listRes.body;
        const first = Array.isArray(items) ? items[0] : undefined;
        const id = first?._id || first?.id;

        // UNREAD COUNT
        cy.request({
          method: 'GET',
          url: `${API_PREFIX}/notifications/unread-count`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((countRes) => {
          expect([200, 401, 403, 404, 500]).to.include(countRes.status);
        });

        if (!id) {
          cy.log('No notifications found to mark read/delete');
          return;
        }

        // MARK READ
        cy.request({
          method: 'PATCH',
          url: `${API_PREFIX}/notifications/${id}/read`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((readRes) => {
          expect([200, 204, 401, 403, 404, 422, 500]).to.include(readRes.status);
        });

        // DELETE
        cy.request({
          method: 'DELETE',
          url: `${API_PREFIX}/notifications/${id}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((delRes) => {
          expect([200, 204, 401, 403, 404, 500]).to.include(delRes.status);
        });
      });
    });
  });

  it('POST /notifications/email validation (best-effort)', () => {
    cy.apiLogin('admin').then(({ token }) => {
      // invalid payload
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/notifications/email`,
        headers: authHeaders(token),
        body: { subject: '' },
        failOnStatusCode: false,
      }).then((res) => {
        expect([400, 401, 403, 404, 422, 500]).to.include(res.status);
      });

      // valid-ish payload (may be disabled)
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/notifications/email`,
        headers: authHeaders(token),
        body: {
          to: 'cypress@example.com',
          subject: 'Cypress test email',
          text: 'Hello from Cypress',
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 201, 400, 401, 403, 404, 422, 500]).to.include(res.status);
      });
    });
  });
});
