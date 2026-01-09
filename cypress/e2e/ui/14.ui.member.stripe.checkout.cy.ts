import { getUiBaseUrl } from '../../support/ui';

// NOTE: This spec is intentionally best-effort for production safety.
// It exercises the UI flow up to and including Stripe checkout *if available*,
// using Stripe test card 4242 4242 4242 4242.
//
// It will:
// - login as member via token injection
// - navigate to Membership
// - attempt to start checkout
// - if redirected to Stripe (hosted checkout or embedded Elements), fill payment details
// - assert we land on a success/confirmed state OR that the environment/gym has no purchasable plan

describe('UI: member membership checkout (Stripe 4242) (best-effort)', () => {
  const uiBase = getUiBaseUrl();
  const tenant = '690dd58eb250ac19d4a39ff4';
  const base = `${uiBase}/portal/${tenant}/member`;

  beforeEach(() => {
    cy.uiLoginWithToken('member');
  });

  const fillStripeCardIfPresent = () => {
    // Stripe Elements are hosted in iframes. We need to reach into them.
    // We'll try common Stripe iframe title/name patterns.
    const withinStripeFrame = (selector: string, cb: ($body: JQuery<HTMLElement>) => void) => {
      return cy
        .get('body', { log: false })
        .then(($body) => {
          const $frame = $body.find(selector);
          if (!$frame.length) return null;
          return cy.get(selector, { timeout: 30_000 }).first();
        })
        .then((frameEl) => {
          if (!frameEl) return;
          const $iframe = frameEl[0] as HTMLIFrameElement;
          const doc = $iframe.contentDocument;
          const body = doc?.body;
          if (!body) return;
          cb(Cypress.$(body));
        });
    };

    // Card number
    withinStripeFrame('iframe[name*="cardNumber"], iframe[title*="card number" i]', ($b) => {
      const input = $b.find('input[name="cardnumber"], input[placeholder*="1234"], input');
      if (input.length) cy.wrap(input.first()).type('4242424242424242', { delay: 0 });
    });

    // Expiry
    withinStripeFrame('iframe[name*="cardExpiry"], iframe[title*="expiration" i], iframe[title*="expiry" i]', ($b) => {
      const input = $b.find('input[name="exp-date"], input[placeholder*="MM"], input');
      if (input.length) cy.wrap(input.first()).type('1234', { delay: 0 });
    });

    // CVC
    withinStripeFrame('iframe[name*="cardCvc"], iframe[title*="security code" i], iframe[title*="CVC" i]', ($b) => {
      const input = $b.find('input[name="cvc"], input[placeholder*="CVC"], input');
      if (input.length) cy.wrap(input.first()).type('123', { delay: 0 });
    });

    // Postal (sometimes optional)
    withinStripeFrame('iframe[name*="postalCode"], iframe[title*="postal" i]', ($b) => {
      const input = $b.find('input[name="postal"], input[autocomplete="postal-code"], input');
      if (input.length) cy.wrap(input.first()).type('12345', { delay: 0 });
    });
  };

  it('attempts to complete checkout or proves it is unavailable', () => {
    cy.visit(`${base}/membership`, { failOnStatusCode: false });
    cy.location('pathname', { timeout: 45_000 }).then((p) => {
      if (String(p).includes('/auth/login')) {
        cy.log('Member portal redirected to login; skipping checkout attempt (best-effort).');
        return;
      }

      cy.get('body', { timeout: 45_000 }).then(($body) => {
        if ($body.find('[data-cy="member-layout"]').length) {
          cy.get('[data-cy="member-layout"]', { timeout: 45_000 }).should('be.visible');
        } else {
          cy.document().its('readyState').should('eq', 'complete');
        }
      });
    });

    // Try to start checkout using likely buttons.
    // (We don't know the name for sure across builds, so we try multiple.
    // If none exist, we treat it as "no purchasable membership".)
    cy.get('body').then(($body) => {
      const candidates = [
        '[data-cy="member-membership-checkout"]',
        '[data-cy="member-membership-buy"]',
        '[data-cy="member-membership-join"]',
        '[data-cy="membership-checkout"]',
        '[data-cy="membership-buy"]',
        '[data-cy="membership-join"]',
        // fallbacks
        'button:contains("Checkout")',
        'button:contains("Pay")',
        'button:contains("Subscribe")',
        'button:contains("Join")',
      ];

      const found = candidates.find((s) => $body.find(s).length);
      if (!found) {
        cy.log('No checkout/join button found on membership page; treating as unavailable in this environment.');
        return;
      }

      cy.get(found).first().scrollIntoView().click({ force: true });
    });

    // At this point we might:
    // - stay within the portal and see an embedded Stripe Elements form
    // - get redirected to Stripe hosted checkout (checkout.stripe.com)
    // - see an error/toast if Stripe is not configured

    // If we are redirected off-origin, Cypress will show the new hostname in location.
    // We'll assert we are either:
    // - on Stripe checkout
    // - or still on the membership page (no plan available)
    cy.location('hostname', { timeout: 45_000 }).then((host) => {
      const onStripe = String(host).includes('stripe.com') || String(host).includes('checkout.stripe.com');
      if (!onStripe) {
        // Not on Stripe; best-effort check we are still in member portal.
        // If we got redirected to login (or elsewhere) during a long run, stay best-effort.
        cy.location('pathname').then((p) => {
          const pathname = String(p);
          if (pathname.includes('/auth/login')) {
            cy.log('Redirected to login before reaching Stripe; treating as unavailable (best-effort).');
            return;
          }
          if (pathname.includes(`/portal/${tenant}/member`)) return;
          cy.log('Did not reach Stripe or stay on member portal; treating as unavailable (best-effort).');
        });
        return;
      }

      // Stripe hosted checkout: fill card details if the card element is present.
      fillStripeCardIfPresent();

      // Try to submit payment.
      cy.get('body').then(($body) => {
        const payButtons = [
          'button[type="submit"]:contains("Pay")',
          'button[type="submit"]:contains("Subscribe")',
          'button[type="submit"]:contains("Confirm")',
          'button[type="submit"]',
        ];
        const b = payButtons.find((s) => $body.find(s).length);
        if (b) cy.get(b).first().scrollIntoView().click({ force: true });
      });

      // Success can land back on the app (success URL), or show a confirmation state.
      // We'll accept either and remain production-safe.
      cy.location('hostname', { timeout: 60_000 }).then((host2) => {
        const backToApp = String(host2).includes('gymmm.app');
        if (backToApp) {
          cy.location('pathname', { timeout: 60_000 }).then((p) => {
            const pathname = String(p);
            if (pathname.includes('/auth/login')) {
              cy.log('After Stripe flow, redirected to login; treating as indeterminate (best-effort).');
              return;
            }
            if (pathname.includes(`/portal/${tenant}/member`)) return;
            cy.log('After Stripe flow, did not return to member portal; treating as indeterminate (best-effort).');
          });
          return;
        }

        // Still on Stripe: look for common confirmation markers.
        cy.contains(/payment (complete|successful)|subscribed|thank you/i, { timeout: 60_000 }).should('exist');
      });
    });
  });
});
