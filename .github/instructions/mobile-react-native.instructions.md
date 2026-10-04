---
applyTo: "apps/mobile/**,mobile/**"
---

# Delivery Plus — React Native client instructions

This applies to the future React Native mobile client only, not to any `services/*` backend
code.

Before implementing anything here, use the skills in `.github/skills/react-native-*` —
start with `react-native-feature-development/SKILL.md`, which sequences the rest. Full
guidance lives there; this file intentionally stays short and just points to it, so it
doesn't drift out of sync with the detailed skills.

Two hard rules that apply regardless of which skill is active:

1. The mobile client only calls the API Gateway's public `/api/...` routes — never an
   internal service directly. See `react-native-api-integration/API-CONTRACT.md`.
2. Don't build UI or logic for backend capabilities that don't exist yet (see
   `react-native-auth/SKILL.md` for the current list of what auth does *not* support).
