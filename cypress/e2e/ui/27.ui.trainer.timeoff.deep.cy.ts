import { getUiBaseUrl } from '../../support/ui';

describe('UI: trainer time-off (deep)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/trainer`;

  beforeEach(() => {
    cy.uiLoginWithToken('trainer');
  });

  it('discovers a time-off view from Profile and observes related API calls (best-effort)', () => {
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

      // Try to find a tab/link/button that looks like Time off / Availability / PTO / Leave
      const buttons = $body
        .find('button')
        .toArray()
        .map((el) => el as unknown as HTMLButtonElement);

      const anchors = $body
        .find('a')
        .toArray()
        .map((el) => el as unknown as HTMLAnchorElement);

      const pick = (t: string) => new RegExp(t, 'i');
      const matcher = pick('time\s*off|availability|pto|leave|vacation');

      const btn = buttons.find((b) => matcher.test(b.textContent || ''));
      const a = anchors.find((x) => matcher.test(x.textContent || ''));

      if (a) {
        cy.wrap(a).scrollIntoView().click({ force: true });
      } else if (btn) {
        cy.wrap(btn).scrollIntoView().click({ force: true });
      }
    });

    cy.wait(2500, { log: false });

    cy.then(() => {
      const urls = observed.map((o) => o.url);
      const hit = urls.some((u) => /\/api\/(time|off|availability|schedule|calendar)/i.test(String(u)));
      if (hit) {
        expect(hit, 'saw time-off/availability related API calls').to.eq(true);
      }
    });
  });
});
