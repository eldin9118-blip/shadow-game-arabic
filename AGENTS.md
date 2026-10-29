# Zill — notes for agents

Arabic-inspired shadow puppet game. Vanilla ES modules on a canvas, bundled by
Vite. No backend, no database, no persisted state: a restart of the `web`
service forgets the run (progress is in-memory only).

## Running it here

- `docker compose -f docker-compose.base44.yml up -d` — the `web` service runs
  `npm ci` then the Vite dev server on container port 5173, published on host
  port 3000. Source is bind-mounted, so edits apply live.
- `npm ci` runs on every container start, so adding a dependency means updating
  both `package.json` and `package-lock.json` (regenerate with a throwaway
  `node:22` container mounted at the repo root), or the service will fail to
  start.
- Node and npm exist only inside the container. Run scripts with
  `docker compose -f docker-compose.base44.yml exec -T web npm run build`.

## Preview quirks

- Vite's host allowlist is satisfied two ways: the platform-provided
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` (passed through by Compose) and, in
  `vite.config.js`, a `.<BASE44_SANDBOX_HOST_DOMAIN>` wildcard gated on
  `BASE44_PREVIEW_MODE === '1'`. File watching falls back to polling in that
  mode because bind mounts miss inotify events.
- `vite.config.js` must keep gating on the flag: with it unset the config is the
  plain default.

## Verifying a change

- The game itself is canvas only, so DOM assertions are limited to the chrome:
  `#overlayTitle` (intro / act-complete panel), `#overlayAction` (the button),
  `#meterValue` (live match percentage), `#levelBadge`, `#prompt`.
- Playable gesture to check: click "Begin the play", then drag a shadow — the
  meter reads above 0% and the act counter is populated. Dragging is via pointer
  events on `#stage`; there is no keyboard-only path to solving an act.
- No test suite yet; `npm run build` is the only structural check.
