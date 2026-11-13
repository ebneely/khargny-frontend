# End-to-end tests

The e2e stack runs the website in same-origin API mode (`NEXT_PUBLIC_API_MODE=same-origin`, the mode issue #30 moves production to): browser requests go through the website's API forwarder. Production still runs direct mode, where the browser calls the backend host; a production build cannot do that against the local HTTP backend because its policy allows only HTTPS connections. So the browser tests prove the forwarder path and do not exercise CORS against the backend host.

End-to-end tests use e2e and live in `e2e-tests/`, with their own package and lockfile. Load the `e2ev` and `e2e` skills before writing or running tests. Start the isolated stack from the backend repo with `node scripts/dev-local.mjs --e2e`, run `npm run e2e` from this website repo, and stop from the backend repo with `node scripts/dev-local.mjs --e2e --stop`. In worktrees, set `KHARGNY_BACKEND_DIR` and `KHARGNY_DASHBOARD_DIR` to their checkout paths. Tests open `/en/` routes, which set the `khargny.locale` cookie for subsequent unprefixed navigation. Do not run the root Prettier on tests or app files.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
