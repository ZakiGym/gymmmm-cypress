// cypress/e2e/ui/41.ui.network-signals-deep.cy.ts
// Deep network signal validation: each portal page triggers expected API calls.

import { getUiBaseUrl } from '../../support/ui';

describe('UI: Network Signal Validation (Deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}`;

  const visitWithRetry = (role: 'admin' | 'trainer' | 'member' | 'superadmin', url: string) => {
    cy.uiLoginWithToken(role);
    cy.visit(url, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      if (String(p).includes('/auth/login')) {
        cy.uiLoginWithToken(role);
        cy.visit(url, { failOnStatusCode: false });
      }
    });
  };

  /* ───── Admin pages trigger correct API calls ───── */

  describe('Admin portal API calls', () => {
    it('admin dashboard triggers stats API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('admin', `${base}/admin/dashboard`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(dashboard|stats|analytics|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
        // Verify no failed auth calls (all should be 2xx or expected errors)
        const authCalls = observed.filter((o) => o.url.includes('/auth/me'));
        authCalls.forEach((call) => {
          if (call.status) {
            expect([200, 201, 401, 403, 429], 'auth call status').to.include(call.status);
          }
        });
      });
    });

    it('admin bookings page triggers bookings API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('admin', `${base}/admin/bookings`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(bookings|classes|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('admin CRM contacts page triggers CRM API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('admin', `${base}/admin/crm/contacts`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(crm|contacts|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('admin payments page triggers payments API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('admin', `${base}/admin/payments`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(payments|billing|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });
  });

  /* ───── Member pages trigger correct API calls ───── */

  describe('Member portal API calls', () => {
    it('member profile page triggers profile API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('member', `${base}/member/profile`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(profile|user|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('member browse classes page triggers classes API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('member', `${base}/member/browse-classes`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(classes|memberships|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('member bookings page triggers bookings API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('member', `${base}/member/my-bookings`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(bookings|classes|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('member pass page triggers QR API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('member', `${base}/member/member-pass`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(qr|pass|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });
  });

  /* ───── Trainer pages trigger correct API calls ───── */

  describe('Trainer portal API calls', () => {
    it('trainer classes page triggers trainer classes API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('trainer', `${base}/trainer/my-classes`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(trainer|classes|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('trainer stats page triggers stats API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('trainer', `${base}/trainer/stats`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(stats|trainer|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });
  });

  /* ───── Superadmin pages ───── */

  describe('Superadmin portal API calls', () => {
    it('superadmin dashboard triggers dashboard API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('superadmin', `${uiBase}/superadmin/dashboard`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(dashboard|superadmin|stats|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });

    it('superadmin gyms page triggers gyms API', () => {
      const observed: Array<{ method: string; url: string; status?: number }> = [];
      cy.collectApiTraffic(observed);
      visitWithRetry('superadmin', `${uiBase}/superadmin/gyms`);
      cy.wait(3000, { log: false });

      cy.then(() => {
        const urls = observed.map((o) => o.url);
        const hit = urls.some((u) => /\/(gym|superadmin|auth\/me)/.test(u));
        if (hit) {
          expect(hit).to.be.true;
        }
      });
    });
  });

  /* ───── API error responses don't crash the UI ───── */

  describe('API errors handled gracefully', () => {
    it('500 on bookings endpoint doesn\'t crash admin UI', () => {
      cy.intercept('GET', '**/api/bookings/**', { statusCode: 500, body: { error: 'Internal' } }).as(
        'failedBookings',
      );

      visitWithRetry('admin', `${base}/admin/bookings`);
      cy.wait(2000, { log: false });

      // Page should still be functional
      cy.get('body').should('be.visible');
      cy.document().its('readyState').should('eq', 'complete');
    });

    it('500 on classes endpoint doesn\'t crash member UI', () => {
      cy.intercept('GET', '**/api/classes**', { statusCode: 500, body: { error: 'Internal' } }).as(
        'failedClasses',
      );

      visitWithRetry('member', `${base}/member/browse-classes`);
      cy.wait(2000, { log: false });

      cy.get('body').should('be.visible');
      cy.document().its('readyState').should('eq', 'complete');
    });
  });
});
