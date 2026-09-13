# Move Tab To End

Adds one keyboard shortcut that moves the active tab — or every ctrl/shift-selected
tab — to the end of the current window's tab strip.

**Default shortcut:** `Alt+Shift+E` (Windows/Linux/ChromeOS), `Control+Shift+E` (macOS).
Rebind at `chrome://extensions/shortcuts`.

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

- **Pinned tabs** move to the end of the pinned section, not past unpinned tabs
  (Chrome forbids that).
- **Grouped tabs** moved out of their group's range are removed from the group
  by Chrome. That's Chrome's behavior, not something this extension does.
- **Mid-drag** edits are rejected by Chrome; the move retries up to 10 times at
  50 ms intervals, then gives up.
- Non-normal windows (popups, devtools) are skipped.

## Adding "move to start"

In `background.js`, target `{ index: 0 }` instead of `{ index: -1 }`, and add a
matching entry under `commands` in `manifest.json`. Chrome allows at most 4
suggested key bindings per extension; additional commands can be left unbound
and assigned by the user at `chrome://extensions/shortcuts`.
