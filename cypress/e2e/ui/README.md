# UI E2E Test Plan (Gymmm)

This folder is for **frontend UI** end-to-end tests (browser-driven) and is intentionally
separated from API specs under `cypress/e2e/api/`.

## Scope & goals

- Catch **real user-facing bugs** (broken flows, RBAC leaks, validation gaps, date/time issues).
- Stay **stable in CI** by using deterministic selectors (`data-cy`) and avoiding flaky waits.
- Support long-term growth: clear layering (helpers/commands → specs), minimal coupling to UI markup.

## Prerequisites (best practice)

### 1) Add stable selectors
Add `data-cy` attributes to interactive elements in the web app.

Examples:
- Login email input: `data-cy="login-email"`
- Login password input: `data-cy="login-password"`
- Login submit button: `data-cy="login-submit"`

### 2) Configure UI baseUrl
Set the UI host separately from the API host.

Options:
- Put `CYPRESS_UI_BASE_URL` in your shell/CI env.
- Or add `UI_BASE_URL` in `cypress.env.json` (not recommended for secrets).

Suggested (in `cypress.config.js`):
- `baseUrl` should remain API if you want API `cy.request()` defaults.
- For UI tests, use `Cypress.env('UI_BASE_URL')` and build URLs explicitly.

### 3) Test accounts & seed data
UI flows should use dedicated test accounts/tenants if possible.

## Recommended test suite (high bug-finding ROI)

Below is a structured list of UI test cases. Start with P0 and expand gradually.

### P0 (must-have smoke)

1. **Login success (admin)** → dashboard renders
2. **Logout** → cannot access protected page after refresh
3. **Protected route guard** → direct URL redirects to login
4. **RBAC menu** → admin does not see superadmin-only entries
5. **Locations CRUD happy path** (create → edit → delete)
6. **Create class type + create class** → appears on schedule
7. **Member booking lifecycle** (book → my bookings → cancel)
8. **Notifications list** loads + unread count behaves
9. **CRM contacts create** → appears in list + delete works
10. **Public pages** (public classes, lead form) load without auth

### P1 (common production bugs)

11. **Login invalid password** shows expected error (no 500)
12. **Form validation**: required fields and email format
13. **Double-submit protection** (double click submit doesn’t double-create)
14. **Timezone sanity**: created class time rendering is consistent after refresh
15. **Class capacity full** → booking becomes waitlist/blocked (expected UX)
16. **Attendance update** persists after reload
17. **Coupon apply** valid vs invalid coupon UI state
18. **Payment failure UX** (card declined) shows actionable message

### P2 (harder/edge cases)

19. **Offline/slow backend**: loading states and error boundaries
20. **Export CSV** downloads and handles failures
21. **Feature toggle** changes reflect immediately and persist
22. **Webhook UI** (if exists) validates secrets / shows delivery status

## How to add new UI specs

- Put specs in `cypress/e2e/ui/*.cy.{js,ts}`.
- Prefer **one feature per spec**.
- Use `data-cy` selectors.
- Avoid `cy.wait(time)`; instead wait on visible UI state or network intercepts.

## Notes

These UI tests are scaffolding-friendly but need your frontend routes + selectors.
Once you share the web app URL and a few key selectors, we can generate runnable specs.
