# Contributing

## Before changing the app

Read [.project-context/00-INDEX.md](.project-context/00-INDEX.md) and [planning.md](planning.md). The backend repository at [Delivery-Plus0/delivery-plus](https://github.com/Delivery-Plus0/delivery-plus) is the source of truth for API behavior; verify routes and DTOs in its `docs/openapi/delivery-plus-public.json` and service docs before relying on them.

## Workflow

1. Branch from `dev` with a focused name such as `feat/order-filters` or `fix/polling-state`.
2. Use Node.js 22 and run `npm ci`.
3. Set `EXPO_PUBLIC_API_BASE_URL` in `.env.local` to the API Gateway.
4. Keep authorization and lifecycle rules on the backend. The app must not attempt to set `CONFIRMED` or bypass owner-scoped restaurant selection.
5. Add a `testID` and matching `nativeID` to every new interactive control.

## Checks

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run export:web
```

For order workflow changes, run the Maestro browser suite against a fresh backend E2E stack; see [e2e/README.md](e2e/README.md).

## Pull requests

Open pull requests against `dev` and complete the pull request template. Include the backend routes used and the tests performed. Keep generated output, `.env.local`, and credentials out of commits. CI, security scans, and code-owner review should pass before merge.