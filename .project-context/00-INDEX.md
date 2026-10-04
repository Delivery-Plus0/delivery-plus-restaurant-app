# Project Context Index

This folder gives the customer app the same architectural context the backend repo already has, so any AI agent or contributor can understand the product, the backend contract, role boundaries, and the intended customer-facing feature path before editing UI or API integrations.

## Read order

1. [01-backend-overview.md](./01-backend-overview.md)
2. [02-system-architecture.md](./02-system-architecture.md)
3. [03-api-contract.md](./03-api-contract.md)
4. [04-customer-app-roadmap.md](./04-customer-app-roadmap.md)
5. [05-ui-feature-plan.md](./05-ui-feature-plan.md)
6. [06-implementation-roadmap.md](./06-implementation-roadmap.md)
7. [07-ai-agent-architecture.md](./07-ai-agent-architecture.md)

## What this context covers

- platform purpose and business domain
- backend service map and runtime architecture
- public API gateway routes and auth rules
- user roles and trust boundaries
- customer app feature roadmap and delivery sequence
- implementation priorities for screens, data hooks, and state
- the app architecture used by AI agents to plan changes safely

## Source of truth

The backend repository under `../delivery-plus` is the source of truth for service behavior and contract definitions. This mobile app mirrors the public Gateway layer and should never invent endpoints or response shapes.
