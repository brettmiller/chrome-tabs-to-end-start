# CLAUDE.md

A Manifest V3 Chrome extension: two keyboard shortcuts that move the selected
tabs to the end or start of the tab strip. No build, no bundler, no
dependencies — edit `background.js` and `manifest.json` directly.

## Constraints

- **Zero permissions is a hard constraint.** The manifest declares no
  `permissions`, `host_permissions`, `content_scripts`, or
  `web_accessible_resources`, so Chrome shows no install warning. The `"tabs"`
  permission only gates the sensitive `Tab` fields (`url`, `pendingUrl`,
  `title`, `favIconUrl`); this code reads only `id`, `pinned`, and `windowId`.
  Ask before adding any permission — reading a URL or title forfeits the
  property.
- **Never log tab objects**, which can carry URLs into the console. Log
  `error.message` only.
- **Index arithmetic belongs in `targetIndex()`** in `background.js`, which is
  pure and covered by `test.mjs`. Don't inline a raw index into a
  `tabs.move()` call. A multi-tab move is **not** a block move — Chromium moves
  the tabs one at a time and increments the target after each — and the formula
  is easy to get wrong. The comment above `targetIndex()` explains it.
- **Verify Chrome API behavior against the official reference**, not from
  memory: <https://developer.chrome.com/docs/extensions/reference/api/tabs>.
  `browser.*` is the standardized namespace as of Chrome 148; `chrome.*` still
  works.
- Run `node --check background.js && node test.mjs` before committing. That
  covers the index math only; everything else is a Chrome API call that has
  never been verified in a browser.

## Agent skills

### Issue tracker

Issues live as GitHub issues in this repo, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used verbatim as label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
