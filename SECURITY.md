# Security Policy

## Reporting a vulnerability

Please do not open an issue for a suspected vulnerability. Contact the repository maintainers privately, or use GitHub's private vulnerability reporting when enabled.

Include the affected screen or module, a concise description, reproduction steps, impact, and a suggested fix if you have one. Do not include passwords, tokens, customer data or other secrets in the report.

## Scope

Please report:

- a session token stored or logged outside the platform secure store (`expo-secure-store` on native, the documented web fallback)
- secrets, API keys or credentials committed to the repository or bundled into the app
- a screen that shows another customer's data, or a request that sends another user's identifier the server should derive from the token
- deep links or navigation that bypass sign-in
- unsafe handling of server-provided content (e.g. rendering untrusted HTML)

Authorization is enforced by the backend; an app-side check that can be bypassed is still worth reporting, but the server-side issue belongs in the [backend repository](https://github.com/Yousefa7medmaher/delivery-plus/blob/dev/SECURITY.md).

Not considered vulnerabilities: the development API URL in `.env.example`, and test-only QA credentials used by the E2E suites against a local stack.

## Responsible disclosure

Give maintainers reasonable time to investigate and release a fix before public disclosure.
