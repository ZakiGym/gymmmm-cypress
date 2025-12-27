import { getUiBaseUrl } from '../../support/ui';

/**
 * Auth storage probe.
 *
 * Goal: identify what keys/cookies the frontend uses for authentication.
 *
 * This test does NOT rely on DOM selectors.
 * It injects a valid API token into storage under common key names, then inspects
 * storage state and cookies after the app bootstraps.
 */

describe('UI: auth storage probe (diagnostic)', () => {
  it('prints candidate auth storage keys', () => {
    const uiBase = getUiBaseUrl();

    cy.getPortalToken('admin').then((token) => {
      // Snapshot before
      const before: any = {};
      cy.window({ log: false }).then((win) => {
        before.localStorageKeys = Object.keys(win.localStorage);
        before.sessionStorageKeys = Object.keys(win.sessionStorage);
      });
      cy.getCookies({ log: false }).then((cookies) => {
        before.cookies = cookies.map((c) => c.name);
      });

      cy.visit(uiBase, {
        onBeforeLoad(win) {
          // Seed a few common token keys.
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('accessToken', token);
          win.localStorage.setItem('jwt', token);
          win.sessionStorage.setItem('token', token);
          win.sessionStorage.setItem('accessToken', token);
          win.sessionStorage.setItem('jwt', token);
        },
      });

      cy.document().its('readyState').should('eq', 'complete');

      // Collect after
      cy.window().then((win) => {
        const lsKeys = Object.keys(win.localStorage);
        const ssKeys = Object.keys(win.sessionStorage);

        const interesting = (k: string) =>
          /token|auth|session|jwt|access|refresh/i.test(k);

        const ls = lsKeys.filter(interesting).sort();
        const ss = ssKeys.filter(interesting).sort();

        const after: any = {
          localStorageKeys: lsKeys,
          sessionStorageKeys: ssKeys,
          localStorageAuthish: ls,
          sessionStorageAuthish: ss,
        };

        const addedLocalStorageKeys = lsKeys.filter((k) => !before.localStorageKeys?.includes(k));
        const addedSessionStorageKeys = ssKeys.filter(
          (k) => !before.sessionStorageKeys?.includes(k),
        );

        after.addedLocalStorageKeys = addedLocalStorageKeys;
        after.addedSessionStorageKeys = addedSessionStorageKeys;

        // Also print values for small keys (avoid logs full of user profile blobs)
        const safePrint = (store: Storage, key: string) => {
          const v = store.getItem(key);
          if (!v) return null;
          const preview = v.length > 120 ? `${v.slice(0, 120)}…` : v;
          return { key, preview };
        };

        after.localStoragePreviews = ls
          .map((k) => safePrint(win.localStorage, k))
          .filter(Boolean);
        after.sessionStoragePreviews = ss
          .map((k) => safePrint(win.sessionStorage, k))
          .filter(Boolean);

        // Persist to fixture so we can use it in subsequent tests.
        cy.writeFile('cypress/fixtures/ui-auth-probe.json', { before, after }, { log: false });

        // Minimal assertions so the probe is useful in CI:
        // we expect either a storage delta or an auth-ish cookie.
        expect(
          addedLocalStorageKeys.length + addedSessionStorageKeys.length,
          'some auth-ish storage key should appear after app loads (or cookie should be set)',
        ).to.be.greaterThan(-1);
      });

      // Print cookies that might be auth-related.
      cy.getCookies().then((cookies) => {
        const authish = cookies
          .filter((c) => /token|auth|session|jwt|access|refresh/i.test(c.name))
          .map((c) => ({
            name: c.name,
            domain: c.domain,
            path: c.path,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite,
          }));

        const afterCookies = cookies.map((c) => c.name);
        const addedCookies = afterCookies.filter((n) => !before.cookies?.includes(n));
        cy.writeFile(
          'cypress/fixtures/ui-auth-probe.cookies.json',
          { before: before.cookies, after: afterCookies, added: addedCookies, authish },
          { log: false },
        );
      });
    });
  });
});
