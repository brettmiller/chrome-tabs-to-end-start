// Move Tab To End / Start
// Moves the active tab -- or all highlighted (multi-selected) tabs -- to the
// end or the start of its window's tab strip.
//
// Requires ZERO permissions. Per the Chrome Tabs API reference, the "tabs"
// permission only gates the sensitive Tab fields (url, pendingUrl, title,
// favIconUrl). tabs.move() and a query that reads none of those are
// unprivileged, so this extension can never see what pages you have open.

const EDGE_BY_COMMAND = {
  "move-tab-to-end": "end",
  "move-tab-to-start": "start",
};

// Chrome rejects tab edits while the user is mid-drag. Official guidance is to
// retry shortly. Bounded, so a persistent failure cannot spin forever.
const DRAG_ERROR = "Tabs cannot be edited right now";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 50;

chrome.commands.onCommand.addListener((command) => {
  const edge = EDGE_BY_COMMAND[command];
  if (!edge) return;
  void run(command, edge, 0);
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
  // For pinned tabs the last slot of the pinned block is pinnedCount - 1; the
  // per-tab increment above walks any remaining tabs into place behind it.
  return isPinned ? Math.max(0, pinnedCount - 1) : -1;
}

async function run(command, edge, attempt) {
  try {
    await moveSelectedTabs(edge);
  } catch (error) {
    if (isDragError(error) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return run(command, edge, attempt + 1);
    }
    // Log the message only; never log tab objects, which may carry URLs.
    console.error(
      `${command} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function moveSelectedTabs(edge) {
  // windowType "normal" matters: tabs.move() only works in normal windows, so
  // this bails cleanly on popups/devtools instead of throwing.
  // "highlighted" covers the active tab plus any ctrl/shift-selected tabs.
  const selected = await chrome.tabs.query({
    highlighted: true,
    lastFocusedWindow: true,
    windowType: "normal",
  });

  const tabs = selected.filter(
    (tab) => typeof tab.id === "number" && tab.id !== chrome.tabs.TAB_ID_NONE
  );
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
