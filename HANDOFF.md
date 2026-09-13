# Handoff: `move-tab-to-end` Chrome extension

Context doc for picking this up in Claude Code. Written 2026-09-13.

## What this is

A minimal Manifest V3 Chrome extension that binds one keyboard shortcut to
"move the current tab to the end of the tab strip." Chrome has no native
shortcut for this — the built-in `Ctrl+Shift+PgUp/PgDn` only moves one position
at a time.

It was written as a deliberately smaller-surface alternative to
[dbuezas/chrome-palette](https://github.com/dbuezas/chrome-palette), which
provides the same feature but requests `tabs`, `bookmarks`, `history`,
`management`, `sessions`, `alarms`, and `favicon`.

## Current state

Working, unreleased, never loaded in a real browser yet. Three files:

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest. One command, zero permissions. |
| `background.js` | Service worker. Command listener + move logic. |
| `README.md` | User-facing install and behavior notes. |

`background.js` passes `node --check`. **Nothing has been tested in Chrome.**
That is the first task — see "Next steps."

## Design decisions (don't undo these without a reason)

**Zero permissions.** The manifest declares no `permissions`,
`host_permissions`, `content_scripts`, or `web_accessible_resources`. This is
load-bearing, not an oversight. Per the
[Tabs API reference](https://developer.chrome.com/docs/extensions/reference/api/tabs),
the `"tabs"` permission only gates four sensitive `Tab` fields — `url`,
`pendingUrl`, `title`, `favIconUrl`. `tabs.move()` and `tabs.query()` are
otherwise unprivileged. The code reads only `id`, `pinned`, and `windowId`.

Consequence: Chrome shows **no permission warning** on install. If you add a
feature that reads a tab's URL or title, you lose that property and the
extension starts warning on install. Weigh that before adding anything.

**Pinned and unpinned tabs move separately.** Chrome refuses to place a pinned
tab after an unpinned one. Calling `move(pinnedId, {index: -1})` silently
no-ops. The code splits the selection and moves each group to the end of its
own section, computing the pinned target as
`max(0, totalPinnedInWindow - pinnedBeingMoved)`.

**Bounded drag retry.** Chrome throws `Tabs cannot be edited right now (user
may be dragging a tab)` if a move is attempted mid-drag. Retries 10× at 50 ms,
then logs and gives up. The bound matters — an unbounded retry loop in an MV3
service worker is a hang. Note that Google's own sample compares the error
object to a string with `==` and only works by coercion; this checks
`error.message` explicitly.

**`windowType: "normal"` filter.** `tabs.move()` only works in normal windows.
The query filters for it so popups and devtools windows bail cleanly rather
than throwing.

**Multi-select is supported.** The query uses `highlighted: true`, which
returns the active tab plus any ctrl/shift-selected tabs.

**Only `error.message` is ever logged**, never tab objects, which can carry
URLs into the console.

## Known behavior, not bugs

- Moving a grouped tab out of its group's index range makes Chrome remove it
  from the group. That's Chrome's behavior.
- Default binding `Alt+Shift+E` / `MacCtrl+Shift+E` may collide with other
  extensions. Chrome silently drops a conflicting suggested binding; the user
  reassigns at `chrome://extensions/shortcuts`.

## Next steps

1. **Load it and actually test.** `chrome://extensions` → Developer mode →
   Load unpacked. Then verify each case below.
2. Consider a companion `move-tab-to-start` command (`{index: 0}`). Chrome
   allows at most 4 suggested bindings per extension; leave extras unbound.
3. Decide whether to publish to the Chrome Web Store. Requires a developer
   account, a one-time fee, 128×128 and 440×280 store assets, and a privacy
   disclosure (trivial here — no data collected).
4. No icons are defined. Chrome renders a default placeholder. Add an `icons`
   key with 16/32/48/128 PNGs if you want it to look finished.

## Test matrix

Verify by hand — there is no automated test setup and browser-extension
integration testing is not worth standing up for this size of project.

- [ ] Single unpinned tab in the middle of the strip → moves to far right
- [ ] Tab already last → no visible change, no console error
- [ ] Pinned tab → moves to end of the *pinned* section, stays pinned, does not
      jump past unpinned tabs
- [ ] Multiple ctrl-selected unpinned tabs → all move, relative order preserved
- [ ] Mixed pinned + unpinned selection → each group lands correctly
- [ ] Tab inside a tab group → moves out, group intact
- [ ] Shortcut fired while a popup window is focused → nothing happens, no throw
- [ ] Shortcut fired mid-drag → move lands after the drag releases
- [ ] Only one window open vs. several → operates on the last-focused window
- [ ] Service worker cold start (after Chrome idles it) → first press still works

That last one is worth attention. MV3 service workers are killed when idle, and
the extension relies on Chrome waking the worker to deliver
`chrome.commands.onCommand`. Chrome is supposed to do this, but confirm it
rather than assume — leave Chrome idle for several minutes, then press the key.

## Publishing to GitHub

```bash
cd move-tab-to-end && git init && git add . && git commit -m "Minimal MV3 extension: move tab to end of tab strip"
```

Then, with the `gh` CLI:

```bash
gh repo create move-tab-to-end --public --source=. --remote=origin --push
```

Or manually, after creating an empty repo in the web UI:

```bash
git remote add origin git@github.com:<user>/move-tab-to-end.git && git branch -M main && git push -u origin main
```

Add a license before making it public — MIT is the convention for extensions
this size, and chrome-palette (the prior art referenced above) is MIT.

If you later add a build step or dependencies, add a `.gitignore` for
`node_modules/` and `dist/`. Right now there is nothing to ignore; the source
is the shipped artifact.

## Working on this in Claude Code

Useful things to state up front in a session:

- The zero-permission property is a hard constraint. Ask before adding any
  manifest permission.
- Verify Chrome API behavior against
  `https://developer.chrome.com/docs/extensions/reference/api/tabs` rather than
  from memory. The API has moved recently — `browser.*` is the standardized
  namespace as of Chrome 148, and `chrome.*` still works.
- There is no build, no bundler, no dependencies. Edit the two files directly.
