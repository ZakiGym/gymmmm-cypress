import { getUiBaseUrl } from '../../support/ui';

type Role = 'superadmin' | 'admin' | 'trainer' | 'member';

type PageInventory = {
  role: Role;
  url: string;
  pathname: string;
  title: string;
  dataCy: string[];
};

const collectDataCy = (role: Role, visited: Set<string>, out: PageInventory[]) => {
  const uiBase = getUiBaseUrl();

  const firstRouteForRole: Record<Role, string> = {
    superadmin: '/superadmin/dashboard',
    admin: '/portal/690dd58eb250ac19d4a39ff4/admin',
    trainer: '/portal/690dd58eb250ac19d4a39ff4/trainer',
    member: '/portal/690dd58eb250ac19d4a39ff4/member',
  };

  const visitAndCollect = (path: string) => {
    const full = path.startsWith('http') ? path : `${uiBase}${path}`;
    if (visited.has(full)) return;
    visited.add(full);

    cy.visit(full);
    cy.document().its('readyState').should('eq', 'complete');

    cy.title().then((title) => {
      cy.location().then((loc) => {
        cy.get('body', { log: false }).then(($body) => {
          const $els = $body.find('[data-cy]');
          const values = Array.from($els)
            .map((el) => (el as unknown as HTMLElement).getAttribute('data-cy'))
            .filter((v): v is string => Boolean(v))
            .map((v) => v.trim())
            .filter(Boolean);

          const uniq = Array.from(new Set(values)).sort();

          out.push({
            role,
            url: loc.href,
            pathname: loc.pathname,
            title,
            dataCy: uniq,
          });

          // Attempt to discover navigation targets.
          // Convention: nav links may have data-cy like nav-*, menu-*, sidebar-*.
          const selector = '[data-cy^="nav-"] a, [data-cy^="menu-"] a, [data-cy^="sidebar-"] a';
          const $links = $body.find(selector);
          if (!$links.length) return;

          const hrefs = Array.from($links)
            .map((a) => (a as unknown as HTMLAnchorElement).getAttribute('href'))
            .filter((h): h is string => Boolean(h))
            .filter((h) => h.startsWith('/'))
            .slice(0, 25); // avoid crawling forever

          hrefs.forEach((h) => visitAndCollect(h));
        });
      });
    });
  };

  // Start by authenticating.
  cy.uiLoginWithToken(role);

  // Collect from the role's known entry route first.
  // If the UI doesn't accept the injected token, this may redirect to /home or /auth/login;
  // that's still useful signal, and the inventory will reflect it.
  visitAndCollect(firstRouteForRole[role]);
};

describe('UI: data-cy inventory (role crawl)', () => {
  const roles: Role[] = ['superadmin', 'admin', 'trainer', 'member'];

  roles.forEach((role) => {
    it(`collects data-cy attributes for ${role}`, () => {
      const visited = new Set<string>();
      const out: PageInventory[] = [];

      collectDataCy(role, visited, out);

      cy.then(() => {
        const safeRole = role.replace(/[^a-z]/g, '');
        cy.writeFile(`cypress/fixtures/ui-data-cy.${safeRole}.json`, out, { log: false });

        // Minimal assertion: we should have at least recorded one page.
        // Some roles may be redirected to login due to UI auth rules; we keep this production-safe.
        expect(out.length, 'pages collected').to.be.greaterThan(0);
      });
    });
  });
});
