# Move Tabs To End or Start

Moves the active tab — or every ctrl/shift-selected tab — to the end or the
start of the current window's tab strip. Two ways to trigger it: a keyboard
shortcut, or the tab right-click menu.

| Action | Windows/Linux/ChromeOS | macOS |
| --- | --- | --- |
| Move tab to end | `Alt+Shift+E` | `Option+Shift+E` |
| Move tab to start | `Alt+Shift+S` | `Option+Shift+S` |

Rebind at `chrome://extensions/shortcuts`. Chrome silently drops a suggested
binding that collides with another extension, so if a shortcut does nothing,
check that page first.

Right-clicking any tab also gives **Move to end of tab strip** and **Move to
start of tab strip**.

## Install

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select this folder

## Permissions

One: `"contextMenus"`, for the right-click entries. Chrome shows **no
permission warning** on install, because `contextMenus` grants no access to
anything about your tabs. No `host_permissions`, no content scripts, no
web-accessible resources.

`chrome.tabs.move()` and `chrome.tabs.query()` are unprivileged. The `"tabs"`
permission only unlocks the sensitive `Tab` fields (`url`, `pendingUrl`,
`title`, `favIconUrl`), and this extension reads none of them — only `id`,
`pinned`, and `windowId`. It cannot see what pages you have open, cannot read
page content, and makes no network requests.

## Behavior notes

- **Pinned tabs** move within the pinned section only — to the end of it or the
  start of it, never past an unpinned tab (Chrome forbids that). Likewise
  "move to start" sends an unpinned tab to the first slot *after* the pinned
  block, not to index 0.
- **Multi-select is Chrome's**, not this extension's: ctrl/cmd-click or
  shift-click tabs as usual and the shortcut applies to all of them, preserving
  their relative order.
- **Right-clicking a tab outside the current selection** moves just that tab,
  matching how Chrome's own tab menu items behave. Right-click a tab that is
  part of the selection and the whole selection moves.
- **Grouped tabs** moved out of their group's range are removed from the group
  by Chrome. That's Chrome's behavior, not something this extension does.
- **Mid-drag** edits are rejected by Chrome; the move retries up to 10 times at
  50 ms intervals, then gives up.
- Non-normal windows (popups, devtools) are skipped.

## Development

No build, no dependencies — the source is the shipped artifact. `package.json`
exists only to mark the directory as ESM for Node.

```bash
node --check background.js   # syntax
node test.mjs                # index arithmetic
```

Two SVG sources. `icons/icon.svg` drives 48 and 128; `icons/icon-small.svg`
drives 16 and 32, and differs only in having a brighter, fatter arrow — at
context-menu size the arrow is barely a pixel thick, and matching it to the
active tab's grey leaves too little contrast to read. To regenerate:

```bash
for s in 16 32;  do rsvg-convert -w $s -h $s icons/icon-small.svg -o icons/icon$s.png; done
for s in 48 128; do rsvg-convert -w $s -h $s icons/icon.svg       -o icons/icon$s.png; done
```

### Releasing

Bump `version` in `manifest.json`, commit, then:

```bash
./release.sh
```

It refuses unless you're on `main` with a clean tree, the tag doesn't already
exist, and the version is newer than the last released tag. On success it
pushes the branch and an annotated tag, which triggers
`.github/workflows/release.yml` to attach a zip of the extension
(`manifest.json`, `background.js`, `icons/*.png`) to a GitHub release.

## License

[MIT](LICENSE) © 2026 Brett Miller
