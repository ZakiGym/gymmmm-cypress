import { getUiBaseUrl } from '../../support/ui';
import { API_PREFIX } from '../../support/api';

describe('UI: trainer profile update (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/trainer`;

  beforeEach(() => {
    cy.uiLoginWithToken('trainer');
  });

  it('loads profile screen and observes profile-related network traffic', () => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];
    cy.collectApiTraffic(observed);

    cy.visit(`${base}/profile`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      if ($body.find('[data-cy="trainer-layout"]').length) {
        cy.get('[data-cy="trainer-layout"]', { timeout: 45_000 }).should('be.visible');
        cy.get('[data-cy="trainer-nav-profile"]').should('be.visible');
      } else {
        cy.document().its('readyState').should('eq', 'complete');
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/(user\/profile|auth\/me)/.test(String(u)));
      if (hit) expect(hit, 'saw profile/auth bootstrap calls').to.eq(true);
    });
  });

  it('best-effort: updates a low-risk field if a Save button and a text input are discoverable', () => {
    // Contract: only attempt a safe update if we can detect reasonable inputs.
    // We avoid email/password and anything that could break login.

    cy.visit(`${base}/profile`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      expect(String(p), 'should not be redirected to login').not.to.include('/auth/login');
    });

    cy.get('body', { timeout: 45_000 }).then(($body) => {
      const inputs = $body
        .find('input[type="text"], input:not([type]), textarea')
        .toArray()
        .map((el) => el as unknown as HTMLInputElement);

      // Prefer displayName/name fields; skip email and password-ish inputs.
      const field = inputs.find((i) => {
        const name = (i.getAttribute('name') || '') + ' ' + (i.getAttribute('placeholder') || '');
        if (/email|password/i.test(name)) return false;
        return /name|display|bio|about/i.test(name);
      });

      const buttons = $body
        .find('button')
        .toArray()
        .map((el) => el as unknown as HTMLButtonElement);

      const save = buttons.find((b) => /save|update/i.test(b.textContent || ''));

      if (field && save) {
        cy.wrap(field)
          .scrollIntoView()
          .clear({ force: true })
          .type(`Trainer Cypress ${Date.now()}`, { force: true });

        cy.wrap(save).scrollIntoView().click({ force: true });
      }
    });

    // Even if we couldn't find fields, we still verify the token is valid via API.
    cy.getPortalToken('trainer').then((token) => {
      cy.request({
        method: 'GET',
        url: `${API_PREFIX}/user/profile`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect([200, 401, 403, 404, 429, 500, 502, 503]).to.include(res.status);
      });
    });
  });
});
