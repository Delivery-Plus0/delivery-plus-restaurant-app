---
description: Web-first restaurant dashboard implementation and backend contract rules.
applyTo: 'src/**'
---

- Treat browser usage as the primary platform; check responsive behavior at desktop and narrow widths.
- Keep Expo Router screens in `src/app` and reusable UI/services outside it.
- Follow the owner-scoped API contract in `.project-context/01-api-contract.md`; never infer authorization from client data.
- Preserve backend lifecycle ownership: restaurant actions are `PREPARING` and `READY_FOR_PICKUP` only.
- Add stable `testID` and `nativeID` selectors to interactive controls.
- Validate with typecheck, lint, unit tests, web export, and the focused Maestro flow for behavior changes.