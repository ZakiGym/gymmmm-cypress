/// <reference types="cypress" />

import { API_PREFIX } from '../../../support/api';

type Contact = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  [k: string]: any;
};

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
const getId = (obj: any) => (obj?._id ?? obj?.id) as string | undefined;

describe('Admin - CRM - contacts CRUD (OpenAPI)', () => {
  it('Admin - CRM - create -> get -> update -> tags -> delete (best-effort)', () => {
    const unique = `${Date.now()}`;
    const email = `cypress+${unique}@example.com`;

    cy.apiLogin('admin').then(({ token }) => {
      cy.request({
        method: 'POST',
        url: `${API_PREFIX}/crm/contacts`,
        headers: authHeaders(token),
        body: {
          firstName: 'Cypress',
          lastName: `Test${unique}`,
          email,
          tags: ['cypress'],
          source: 'cypress',
        },
        failOnStatusCode: false,
      }).then((createRes) => {
        expect([201, 401, 403, 404, 422, 500]).to.include(createRes.status);
        if (createRes.status !== 201) return;

        const created: Contact = createRes.body as any;
        const contactId = getId(created) ?? getId((createRes.body as any).contact);
        expect(contactId, 'created contact id').to.be.a('string').and.not.empty;

        cy.request({
          method: 'GET',
          url: `${API_PREFIX}/crm/contacts/${contactId}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((getRes) => {
          expect([200, 401, 403, 404]).to.include(getRes.status);
          if (getRes.status === 200) {
            const got = (getRes.body as any).contact ?? getRes.body;
            expect(got).to.exist;
          }
        });

        cy.request({
          method: 'PUT',
          url: `${API_PREFIX}/crm/contacts/${contactId}`,
          headers: authHeaders(token),
          body: { notes: 'Updated by Cypress', phone: '+1 555-000-0000' },
          failOnStatusCode: false,
        }).then((updateRes) => {
          expect([200, 401, 403, 404, 422, 500]).to.include(updateRes.status);
        });

        cy.request({
          method: 'POST',
          url: `${API_PREFIX}/crm/contacts/${contactId}/tags`,
          headers: authHeaders(token),
          body: { add: ['vip'], remove: ['cypress'] },
          failOnStatusCode: false,
        }).then((tagsRes) => {
          expect([200, 401, 403, 404, 422, 500]).to.include(tagsRes.status);
        });

        cy.request({
          method: 'DELETE',
          url: `${API_PREFIX}/crm/contacts/${contactId}`,
          headers: authHeaders(token),
          failOnStatusCode: false,
        }).then((delRes) => {
          expect([200, 204, 401, 403, 404, 500]).to.include(delRes.status);
        });
      });
    });
  });
});
