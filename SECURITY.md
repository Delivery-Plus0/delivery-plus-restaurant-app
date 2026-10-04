# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Contact the repository maintainers privately or use GitHub private vulnerability reporting when available.

Include the affected route or screen, reproduction steps, impact, and a suggested fix. Do not include passwords, access tokens, restaurant data, or other secrets.

## Scope

Please report:

- leaked, logged, or incorrectly transmitted session tokens or credentials
- secrets or API keys committed to the repository or bundled into the client
- an owner able to access another restaurant's orders
- a request or screen that bypasses sign-in or relies on client-side ownership as authorization
- unsafe rendering of server-provided content

The backend is authoritative for role checks, ownership, and order transitions. Report server-side authorization issues to [the backend security policy](https://github.com/Yousefa7medmaher/delivery-plus/blob/dev/SECURITY.md) as well.

The development gateway URL in `.env.example` and test-only QA credentials used against a local E2E stack are not production secrets.

## Responsible disclosure

Give maintainers reasonable time to investigate and release a fix before public disclosure.