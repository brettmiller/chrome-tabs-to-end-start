// Move Tab To End / Start
// Moves the active tab -- or all highlighted (multi-selected) tabs -- to the
// end or the start of its window's tab strip, via keyboard shortcut or the
// tab right-click menu.
//
// The only permission is "contextMenus", which grants no access to tab content
// and shows no install warning. Per the Chrome Tabs API reference the "tabs"
// permission gates the sensitive Tab fields (url, pendingUrl, title,
// favIconUrl); tabs.move() and a query reading none of those are unprivileged,
// so this extension still cannot see what pages you have open.

// Menu item ids are deliberately the same strings as the command names, so one
// table drives both entry points.
const ACTIONS = {
  "move-tab-to-end": { edge: "end", title: "Move to end of tab strip" },
  "move-tab-to-start": { edge: "start", title: "Move to start of tab strip" },
};

// Chrome rejects tab edits while the user is mid-drag. Official guidance is to
// retry shortly. Bounded, so a persistent failure cannot spin forever.
const DRAG_ERROR = "Tabs cannot be edited right now";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 50;

chrome.runtime.onInstalled.addListener(() => {
  // Built here rather than at top level: the MV3 service worker restarts
  // constantly and contextMenus.create() throws on a duplicate id. removeAll
  // first because onInstalled also fires on update.
  chrome.contextMenus.removeAll(() => {
    for (const [id, { title }] of Object.entries(ACTIONS)) {
      chrome.contextMenus.create({ id, title, contexts: ["tab"] });
    }
  });
});

chrome.commands.onCommand.addListener((command) => {
  const action = ACTIONS[command];
  if (!action) return;
  void run(command, action.edge);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const action = ACTIONS[info.menuItemId];
  // `tab` is documented as absent when the click was not in a tab.
  if (!action || !tab) return;
  void run(String(info.menuItemId), action.edge, tab);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDragError = (error) =>
  (error instanceof Error ? error.message : String(error)).includes(DRAG_ERROR);

// Pinned and unpinned tabs occupy separate sections of the strip and Chrome
// refuses to interleave them, so each group targets the edge of its own
// section rather than the edge of the strip.
//
// tabs.move() with an array does NOT move the tabs as a block: Chromium loops
// over the ids, moves each one to a final index, then increments that index
// ("Insert the tabs one after another" -- TabsMoveFunction::MoveTab). So the
// index passed here is where the FIRST tab lands, and the rest follow it.
export function targetIndex(edge, isPinned, pinnedCount) {
  // The first unpinned slot sits immediately after the pinned block.
  if (edge === "start") return isPinned ? 0 : pinnedCount;
  // -1 means end-of-strip, which is only a legal target for unpinned tabs.
  //
  // For pinned tabs the target is the last slot of the pinned block. It does
  // NOT depend on how many tabs are moving, because of the per-tab increment
  // described above -- pass the first tab's destination and the rest follow.
  //
  // Do not "fix" this to `pinnedCount - movingCount`. That looks more correct,
  // and it is what this code originally did, but it is wrong for every move of
  // two or more pinned tabs: given [p q r] moving p+q, it yields [p r q]
  // instead of [r p q]. It happens to agree with the line below when exactly
  // one tab moves, which is why the bug went unnoticed.
  return isPinned ? Math.max(0, pinnedCount - 1) : -1;
}

async function run(command, edge, clickedTab, attempt = 0) {
  try {
    await moveSelectedTabs(edge, clickedTab);
  } catch (error) {
    if (isDragError(error) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return run(command, edge, clickedTab, attempt + 1);
    }
    // Log the message only; never log tab objects, which may carry URLs.
    console.error(
      `${command} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

const isRealTab = (tab) =>
  typeof tab?.id === "number" && tab.id !== chrome.tabs.TAB_ID_NONE;

async function moveSelectedTabs(edge, clickedTab) {
  // windowType "normal" matters: tabs.move() only works in normal windows, so
  // this bails cleanly on popups/devtools instead of throwing.
  // "highlighted" covers the active tab plus any ctrl/shift-selected tabs.
  // A menu click names its own window; the shortcut has no tab context.
  const selected = await chrome.tabs.query({
    highlighted: true,
    windowType: "normal",
    ...(clickedTab
      ? { windowId: clickedTab.windowId }
      : { lastFocusedWindow: true }),
  });

  const highlighted = selected.filter(isRealTab);
  // A non-empty result also proves the window is a normal one, which the
  // clicked-tab fallback below relies on.
  if (highlighted.length === 0) return;

  // A plain right-click does NOT change the selection -- every selection path
  // in views/tabs/tab.cc is gated on the left mouse button -- so right-clicking
  // a tab outside the selection leaves `highlighted` pointing at other tabs
  // entirely. Act on the clicked tab alone, matching what Chrome's own menu
  // does (TabStripModel::GetIndicesForCommand returns {index} when unselected).
  const inSelection = highlighted.some((tab) => tab.id === clickedTab?.id);
  const tabs =
    clickedTab && !inSelection ? [clickedTab].filter(isRealTab) : highlighted;
  if (tabs.length === 0) return;

  const { windowId } = tabs[0];

  const pinnedIds = tabs.filter((tab) => tab.pinned).map((tab) => tab.id);
  const unpinnedIds = tabs.filter((tab) => !tab.pinned).map((tab) => tab.id);

  // Moving tabs never changes their pinned state, so this count stays valid
  // across both moves below.
  const pinnedCount = (await chrome.tabs.query({ pinned: true, windowId }))
    .length;

  if (unpinnedIds.length > 0) {
    await chrome.tabs.move(unpinnedIds, {
      index: targetIndex(edge, false, pinnedCount),
    });
  }

  if (pinnedIds.length > 0) {
    await chrome.tabs.move(pinnedIds, {
      index: targetIndex(edge, true, pinnedCount),
    });
  }
}
