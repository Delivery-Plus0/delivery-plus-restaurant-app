# Delivery Plus restaurant app: instructions for Claude Code

Restaurant-owner dashboard (Expo Router **web**). Public repository, default branch **`dev`**: never commit secrets, `.env` files or real customer data. It talks only to the backend gateway, never to services directly.

## Start of every session

1. Read the production roadmap in the backend repo: `Delivery-Plus0/delivery-plus` → `docs/roadmap/production.md`. It gives the milestone order, the rules, and the open decisions.
2. Find the current milestone: the lowest-numbered open "Production N" milestone that has issues in this repo.
   ```bash
   gh issue list --repo Delivery-Plus0/delivery-plus-restaurant-app --state open --json number,title,milestone \
     --jq 'sort_by(.milestone.title) | .[] | "\(.milestone.title) | #\(.number) \(.title)"'
   ```
3. Read `planning.md` in this repo, if there is one, and the README.

## Working on an issue

1. App issues usually depend on a **backend** issue (`Delivery-Plus0/delivery-plus#N` under **Depends on**). Don't start until it's merged to backend `dev`. Use the real contract from the backend's OpenAPI, never a mock.
2. If the issue says **decision** and nothing in the comments records one, stop and ask.
3. Branch from `dev`: `feat/<short-name>` or `fix/<short-name>`.
4. Project rules:
   - **Shared UI kit:** kit files must stay byte-identical with `delivery-plus/clients/kit-manifest.json`. Change the manifest in the backend first, then every app. Run `npm run kit:check -- --remote`.
   - **i18n:** every string goes through `t('English')`, with an Arabic entry. The coverage test must stay at 0 missing. Arabic is the default, and RTL must work.
   - **Tests:** add test ids to new UI and add a Maestro flow for every user-visible feature. E2E builds and unit tests pin English.
   - **Expo packages** move together: `npx expo install --fix`.
   - **No faked state:** balances, ratings, statuses and payments always come from the backend.
5. Run the unit tests and the translation coverage locally, plus Maestro against the backend E2E stack for flows.
6. Open a PR to `dev` with `Closes #N`. It's done only when it's merged with all CI green.

## Commits

- Commit as the repository owner's configured git identity.
- **Don't add `Co-Authored-By` lines for Claude or any AI tool**, and don't add generated-by footers.

## Dashboard rules

The restaurant-specific rules (web first, owner-scoped routes only, the order transitions the UI may make, test ids, the Expo 57 docs) are in `AGENTS.md`:

@AGENTS.md
