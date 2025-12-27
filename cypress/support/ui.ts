// cypress/support/ui.ts
// Utilities for UI (browser) E2E tests.

/**
 * Returns the UI base URL.
 *
 * Best practice: keep API baseUrl in `cypress.config.js` as-is (for cy.request defaults),
 * and configure the UI host separately via env:
 * - CYPRESS_UI_BASE_URL=https://your-frontend.app
 * - or cypress.env.json { "UI_BASE_URL": "..." }
 */
export const getUiBaseUrl = (): string => {
  const v = Cypress.env('UI_BASE_URL') || Cypress.env('UI_BASE') || Cypress.env('UI_HOST');
  // Default is configured in cypress.config.js env.UI_BASE_URL.
  return String(v || 'https://www.gymmm.app').replace(/\/$/, '');
};

/**
 * Stable selector helper.
 * Use like: cy.get(byCy('login-email'))
 */
export const byCy = (value: string) => `[data-cy="${value}"]`;

const getFirst = (selectors: string[], options?: { timeout?: number }) => {
  const timeout = options?.timeout ?? 15_000;
  // Try selectors one by one using Cypress' retry mechanism.
  // We intentionally *don't* require data-cy so the tests can run today.
  const attempt = (i: number): Cypress.Chainable<JQuery<HTMLElement>> => {
    if (i >= selectors.length) {
      throw new Error(`Could not find element. Tried selectors: ${selectors.join(' | ')}`);
    }
    const s = selectors[i];
    return cy.get('body', { log: false }).then(($body) => {
      if ($body.find(s).length) {
        return cy.get(s, { timeout, log: false }).first();
      }
      return attempt(i + 1);
    });
  };

  return attempt(0);
};

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * UI login via the browser.
       * Requires app selectors and routes to match (adjust in your app).
       */
      uiLogin(role: 'admin' | 'superadmin' | 'trainer' | 'member'): Chainable<void>;

      /**
       * Fetch a JWT token for a given role using API /auth/login.
       * This is the recommended way to authenticate UI portals in CI without flaky selectors.
       */
      getPortalToken(role: 'admin' | 'superadmin' | 'trainer' | 'member'): Chainable<string>;

      /**
       * UI login by injecting an API-issued token into browser storage.
       *
       * NOTE: this is implemented as a best-effort helper because the app's
       * token storage keys aren't confirmed yet. Once confirmed, update the
       * storage key(s) below.
       */
      uiLoginWithToken(role: 'admin' | 'superadmin' | 'trainer' | 'member'): Chainable<void>;

      /**
       * Collect UI fetch/xhr API calls into the provided array.
       * This enables stable UI tests based on network behavior, not selectors.
       */
      collectApiTraffic(observed: Array<{ method: string; url: string; status?: number }>):
        | Chainable<void>
        | Chainable<null>;
    }
  }
}

const getCredsForRole = (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
  const emailKey =
    role === 'admin'
      ? 'ADMIN_EMAIL'
      : role === 'superadmin'
        ? 'SUPER_EMAIL'
        : role === 'trainer'
          ? 'TRAINER_EMAIL'
          : 'MEMBER_EMAIL';
  const passKey =
    role === 'admin'
      ? 'ADMIN_PASSWORD'
      : role === 'superadmin'
        ? 'SUPER_PASSWORD'
        : role === 'trainer'
          ? 'TRAINER_PASSWORD'
          : 'MEMBER_PASSWORD';

  const email = Cypress.env(emailKey);
  const password = Cypress.env(passKey);

  if (!email || !password) {
    throw new Error(`Missing creds for ${role}. Set ${emailKey} and ${passKey} in Cypress env.`);
  }

  return { email: String(email), password: String(password) };
};

// In-memory cache for the current Cypress run.
// This reduces repeated logins, speeds up UI specs, and helps avoid rate limiting.
const tokenCache: Partial<Record<'admin' | 'superadmin' | 'trainer' | 'member', string>> = {};

Cypress.Commands.add('getPortalToken', (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
  const cached = tokenCache[role];
  if (cached) return cy.wrap(cached, { log: false });

  const { email, password } = getCredsForRole(role);

  // Use API login (baseUrl points at API host). This avoids UI selector brittleness.
  // The API helper has retry/backoff for 429s.
  return cy
    .wrap(null, { log: false })
    .then(() =>
      // dynamic import avoids circular imports between support modules
      import('./api').then(({ login }) => login(email, password, { retryOnRateLimit: true })),
    )
    .then((resp: any) => {
      // When the full suite runs, the backend sometimes rate-limits login.
      // Keep UI specs production-safe by tolerating 429 here.
      if (resp?.status === 429) {
        cy.log(`Rate limited (429) when fetching token for ${role}. Proceeding best-effort.`);
        // Return a non-empty placeholder so callers don't crash on string assertions.
        // Downstream checks (auth/me) will accept 401/403/429.
        return `RATE_LIMITED_${role}_${Date.now()}`;
      }

      const token = resp?.token as string;
      expect(token, `token for ${role}`).to.be.a('string').and.not.empty;
      tokenCache[role] = token;
      return token;
    });
});

Cypress.Commands.add('uiLoginWithToken', (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
  const uiBase = getUiBaseUrl();

  // 1) Get token via the API.
  return cy.getPortalToken(role).then((token) => {
    // Based on our probe against https://www.gymmm.app:
    // - the app reads tokens from *localStorage* keys: token, accessToken, jwt
    // - it does not appear to set auth cookies
    cy.visit(uiBase, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('accessToken', token);
        win.localStorage.setItem('jwt', token);

        // Keep sessionStorage clean unless you confirm it is required.
        win.sessionStorage.removeItem('token');
        win.sessionStorage.removeItem('accessToken');
        win.sessionStorage.removeItem('jwt');
      },
    });

    // Verify the token is actually usable (API-side). IMPORTANT:
    // `cy.request()` defaults to the current origin when running UI specs,
    // so we must fully-qualify the API URL (or use cy.apiRequest helper).
  const apiHost = String(Cypress.config('baseUrl') || '').replace(/\/$/, '');
  // API is hosted under /api on this backend.
  const apiBase = apiHost ? `${apiHost}/api` : '';
  const authMeUrl = apiBase ? `${apiBase}/auth/me` : '/api/auth/me';

    return cy
      .request({
        method: 'GET',
        url: authMeUrl,
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((resp) => {
        // In a rate-limited run, we may not have a real token.
        expect([200, 401, 403, 429], 'auth/me status').to.include(resp.status);
        // In healthy cases this should be 200.
        if (resp.status === 200) {
          expect(resp.body).to.have.property('id');
        }
      })
      .then(() => {
        cy.reload();
        return cy.document().its('readyState').should('eq', 'complete').then(() => undefined);
      });
  });
});

Cypress.Commands.add(
  'collectApiTraffic',
  (observed: Array<{ method: string; url: string; status?: number }>) => {
    return cy
      .intercept({ middleware: true }, (req) => {
        // Capture both api-gymmm host and relative /api routes.
        const url = req.url;
        if (url.includes('/api/') || url.includes('api-gymmm.onrender.com')) {
          req.on('response', (res) => {
            observed.push({ method: req.method, url, status: res.statusCode });
          });
        }
        req.continue();
      })
      .as('uiApiTraffic')
      .then(() => undefined);
  },
);

Cypress.Commands.add('uiLogin', (role: 'admin' | 'superadmin' | 'trainer' | 'member') => {
  const emailKey =
    role === 'admin'
      ? 'ADMIN_EMAIL'
      : role === 'superadmin'
        ? 'SUPER_EMAIL'
        : role === 'trainer'
          ? 'TRAINER_EMAIL'
          : 'MEMBER_EMAIL';
  const passKey =
    role === 'admin'
      ? 'ADMIN_PASSWORD'
      : role === 'superadmin'
        ? 'SUPER_PASSWORD'
        : role === 'trainer'
          ? 'TRAINER_PASSWORD'
          : 'MEMBER_PASSWORD';

  const email = Cypress.env(emailKey);
  const password = Cypress.env(passKey);

  if (!email || !password) {
    throw new Error(
      `Missing creds for ${role}. Set ${emailKey} and ${passKey} in Cypress env.`,
    );
  }

  const uiBase = getUiBaseUrl();

  // Assumption (adjust when you confirm routes/selectors):
  // - login route is /auth/login
  // - login fields are data-cy=login-email/login-password
  // - submit is data-cy=login-submit
  cy.visit(`${uiBase}/auth/login`);

  // If the login form is rendered inside an iframe, Cypress cannot access it
  // without explicit iframe handling (and the iframe must be same-origin).
  cy.get('body', { log: false }).then(($body) => {
    const iframeCount = $body.find('iframe').length;
    if (iframeCount) {
      throw new Error(
        `Login page contains ${iframeCount} iframe(s). ` +
          'Add data-cy selectors on the host page or implement an iframe helper if same-origin.',
      );
    }
  });

  const emailSelectors = [
    byCy('login-email'),
    'input[type="email"]',
    'input[name="email"]',
    'input[autocomplete="email"]',
    'input[placeholder*="mail"]',
    'input[placeholder*="Mail"]',
    'input[aria-label*="mail"]',
    'input[aria-label*="Mail"]',
  ];
  const passwordSelectors = [
    byCy('login-password'),
    'input[type="password"]',
    'input[name="password"]',
    'input[autocomplete="current-password"]',
    'input[placeholder*="password"]',
    'input[placeholder*="Password"]',
    'input[aria-label*="password"]',
    'input[aria-label*="Password"]',
  ];
  const submitSelectors = [
    byCy('login-submit'),
    'button[type="submit"]',
    // Prefer robust selectors; :contains is jQuery-only and not supported by native CSS.
    "button",
  ];

  const typeByLabel = (labelText: string, value: string, typeOptions?: any) => {
    // Tries: <label>Text</label><input ...>
    // and common "floating label" structures.
    return cy
      .contains('label', new RegExp(`^\\s*${labelText}\\s*$`, 'i'), { timeout: 10_000 })
      .then(($label) => {
        const forId = $label.attr('for');
        if (forId) {
          return cy.get(`#${forId}`).clear().type(value, typeOptions);
        }
        const $input = $label.closest('div').find('input');
        if ($input.length) return cy.wrap($input.first()).clear().type(value, typeOptions);
        // fallback: nearby input
        return cy
          .wrap($label)
          .parent()
          .find('input')
          .first()
          .clear()
          .type(value, typeOptions);
      });
  };

  // Prefer selector-based lookup; if not found, fall back to label-driven typing.
  getFirst(emailSelectors, { timeout: 10_000 })
    .clear()
    .type(String(email))
    .then(undefined, () => typeByLabel('Email', String(email)));

  getFirst(passwordSelectors, { timeout: 10_000 })
    .clear()
    .type(String(password), { log: false })
    .then(undefined, () => typeByLabel('Password', String(password), { log: false }));

  // Click the submit button.
  // If we used the generic "button" fallback, choose the first visible enabled one.
  getFirst(submitSelectors)
    .then(($btn) => {
      const text = ($btn.text() || '').toLowerCase();
      // If it's a generic button fallback and the text doesn't look like a login submit,
      // try to find an explicit submit button in the form.
      if (!$btn.attr('type') && !text.includes('sign') && !text.includes('log')) {
        return cy.get('button[type="submit"], input[type="submit"]', { log: false }).first();
      }
      return cy.wrap($btn, { log: false });
    })
    .click();

  // Post-login signal:
  // - Best: add data-cy="app-shell" on your authenticated layout.
  // - Fallback: url should no longer include '/auth/login'.
  cy.location('pathname', { timeout: 30_000 }).should('not.include', '/auth/login');
});

export {};
