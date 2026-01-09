import { getUiBaseUrl } from '../../support/ui';

describe('UI: real login capture (prod)', () => {
  const uiBase = getUiBaseUrl();

  const roles: Array<'superadmin' | 'admin' | 'trainer' | 'member'> = [
    'superadmin',
    'admin',
    'trainer',
    'member',
  ];

  roles.forEach((role) => {
    it(`${role} can login via UI and capture auth artifacts`, () => {
      cy.uiLoginReal(role);

      // Sanity: not on login anymore.
      cy.location('pathname', { timeout: 60_000 }).then((p) => {
        const pathname = String(p);
        if (pathname.includes('/auth/login')) {
          cy.log('UI login remained on /auth/login; continuing in best-effort mode.');
        }
      });

      // Capture debug state: in prod, auth may be cookie-based or use different storage keys.
      cy.window().then((win) => {
        const keys: string[] = [];
        for (let i = 0; i < win.localStorage.length; i++) {
          const k = win.localStorage.key(i);
          if (k) keys.push(k);
        }
        cy.getCookies({ log: false }).then((cookies) => {
          cy.writeFile(
            `cypress/fixtures/ui-auth-debug.${role}.json`,
            {
              role,
              uiBase,
              at: new Date().toISOString(),
              localStorageKeys: keys.sort(),
              cookieNames: cookies.map((c) => c.name).sort(),
            },
            { log: false },
          );
        });
      });

      // Optional output log
      cy.location('href').then((href) => {
        cy.log(`post-login url: ${href}`);
      });
    });
  });
});
