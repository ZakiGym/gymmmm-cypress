// cypress/support/e2e.ts
import './api';
import './ui';

import { waitForBackendReady } from './api';

// Capture ALL cy.request() calls (Node-side) for runtime endpoint coverage.
// This is the only reliable hook for API specs that call cy.request() directly.
Cypress.env('__runtimeNodeApiCalls', [] as Array<{ method: string; pathname: string }>);

Cypress.Commands.overwrite(
	'request',
	(originalFn, ...args: any[]) => {
		// Normalize overloads:
		// - cy.request(url)
		// - cy.request(method, url)
		// - cy.request(method, url, body)
		// - cy.request(options)
		let method = 'GET';
		let url = '';

		if (typeof args[0] === 'string') {
			if (typeof args[1] === 'string') {
				method = String(args[0] || 'GET').toUpperCase();
				url = String(args[1] || '');
			} else {
				url = String(args[0] || '');
			}
		} else if (args[0] && typeof args[0] === 'object') {
			method = String(args[0].method || 'GET').toUpperCase();
			url = String(args[0].url || '');
		}

		try {
			const u = new URL(url, (Cypress.config('baseUrl') as string) || 'http://localhost');
			if (u.pathname.startsWith('/api/')) {
				const buf = (Cypress.env('__runtimeNodeApiCalls') || []) as Array<{
					method: string;
					pathname: string;
				}>;
				buf.push({ method, pathname: u.pathname });
				Cypress.env('__runtimeNodeApiCalls', buf);
			}
		} catch {
			// ignore malformed URLs
		}

		// Continue original request.
		return (originalFn as any).apply(null, args as any);
	},
);

afterEach(() => {
	const buf = (Cypress.env('__runtimeNodeApiCalls') || []) as Array<{ method: string; pathname: string }>;
	if (!buf.length) return;
	Cypress.env('__runtimeNodeApiCalls', []);
	// Never let coverage recording break tests.
	try {
		cy.task('runtime:record', { batch: buf }, { log: false });
	} catch {
		// ignore
	}
});

// Runtime endpoint capture: record real HTTP calls to /api/** during Cypress runs.
// Used to generate OpenAPI vs runtime coverage reports.
before(() => {
	// Reset per spec; the node-side task will merge results into a single file.
	cy.task('runtime:reset', null, { log: false });
});

beforeEach(() => {
	// Capture browser traffic by patching fetch + XHR.
	cy.window({ log: false }).then((win) => {
		const seen: Array<{ method: string; pathname: string }> = [];

		// Patch fetch
		const origFetch = win.fetch.bind(win);
		win.fetch = ((input: any, init?: any) => {
			try {
				const urlStr = typeof input === 'string' ? input : String(input?.url || '');
				const url = new URL(urlStr, win.location.origin);
				const method = String(init?.method || 'GET').toUpperCase();
				if (url.pathname.startsWith('/api/')) seen.push({ method, pathname: url.pathname });
			} catch {
				// ignore
			}
			return origFetch(input, init);
		}) as any;

		// Patch XHR
		const origOpen = win.XMLHttpRequest.prototype.open;
		win.XMLHttpRequest.prototype.open = function (method: any, url: any, ...rest: any[]) {
			try {
				const u = new URL(String(url || ''), win.location.origin);
				const m = String(method || 'GET').toUpperCase();
				if (u.pathname.startsWith('/api/')) seen.push({ method: m, pathname: u.pathname });
			} catch {
				// ignore
			}
			// @ts-ignore
			return origOpen.call(this, method, url, ...rest);
		};

		// Store on window for access in afterEach.
		(win as any).__runtimeApiCalls = seen;
	});
});

afterEach(() => {
	// Disabled: accessing the AUT window in afterEach can trigger a Cypress runner
	// DOMException edge-case in production ("Cannot set property message...").
	// UI specs that need coverage signals should use cy.intercept watchers directly,
	// and API coverage is captured reliably via the cy.request overwrite above.
	return;
});

after(() => {
	// Write per spec; final file is cumulative.
	cy.task('runtime:write', null, { log: false });
});

// Render-style cold starts can take ~60s.
// Warm the server once before the first spec runs.
before(() => {
	waitForBackendReady({ timeoutMs: 75_000, intervalMs: 2_500 });
});