# Move Tab To End or Start

Adds two keyboard shortcuts that move the active tab — or every ctrl/shift-selected
tab — to the end or the start of the current window's tab strip.

| Action | Windows/Linux/ChromeOS | macOS |
| --- | --- | --- |
| Move tab to end | `Alt+Shift+E` | `Control+Shift+E` |
| Move tab to start | `Alt+Shift+S` | `Option+Shift+S` |

Rebind at `chrome://extensions/shortcuts`. Chrome silently drops a suggested
binding that collides with another extension, so if a shortcut does nothing,
check that page first.

## Install

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select this folder

## Permissions

None. The manifest declares no `permissions`, no `host_permissions`, no
content scripts, and no web-accessible resources.

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

## License

[MIT](LICENSE) © 2026 Brett Miller
