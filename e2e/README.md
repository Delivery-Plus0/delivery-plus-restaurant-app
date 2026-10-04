# Restaurant Dashboard Browser E2E

Maestro drives the exported Expo web app in Chromium against the backend's isolated E2E stack. The seeded restaurant-owner account sees a confirmed QA Kitchen order; the business flow advances that order through the real owner API actions.

## Local run

Prerequisites: Node.js 22, Docker, Java 17+, and Maestro CLI 2.11 or newer.

```bash
# In ../delivery-plus
npm run e2e:env:reset

# In this repository
npm ci
npm run e2e:all -- --build --headless
```

The app is exported against `http://localhost:3100`, served on port 8083, and driven at a 1440×1100 browser viewport by default. Set `E2E_SCREEN_SIZE` to adjust the Maestro viewport. The owner login and order id come from `e2e-seed-manifest.json`; no credentials are committed.

**Environment limitation (2026-10-04):** the real-backend Maestro suite was not run locally. Docker is unavailable in WSL because Docker Desktop integration is disabled, and the Windows Docker CLI cannot connect to the missing `dockerDesktopLinuxEngine` named pipe. Do not count the browser-only fixture checks as backend E2E verification.

## Suites

| Suite | Coverage |
| --- | --- |
| `smoke` | Owner sign-in, owned restaurant, confirmed order, start-preparing action available |
| `business` | Confirmed → preparing → ready for pickup through the UI and backend |
| `all` | Both suites, in order |

Run `npm run e2e:env:reset` before rerunning the business suite because marking the seeded order ready advances its lifecycle and triggers automatic dispatch.

JUnit, screenshots, and Maestro debug output are written under `e2e/.artifacts/`. The static web export is written under `e2e/.web-build/`; both are ignored by Git.