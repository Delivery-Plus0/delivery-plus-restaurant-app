# Restaurant Dashboard Instructions

- This is a web-first Expo Router application. Browser behavior at desktop and mobile widths is the product; native Android/iOS builds are not acceptance criteria.
- Read `.project-context/00-INDEX.md` and `planning.md` before architecture or API changes.
- The backend is authoritative for role checks, restaurant ownership, and order transitions. Use only the owner-scoped routes documented in `.project-context/01-api-contract.md`.
- Keep payment-owned transitions out of the UI. Restaurant actions are `CONFIRMED → PREPARING → READY_FOR_PICKUP` only.
- Give every interactive control a stable `testID` and matching `nativeID` for Maestro web selectors.
- Run `npm run typecheck`, `npm run lint`, and `npm test`; export the web app for route/render changes.
- Check the Expo 57 versioned docs before changing Expo APIs or dependencies.