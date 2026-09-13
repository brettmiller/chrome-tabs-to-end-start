// Move Tab To End
// Moves the active tab -- or all highlighted (multi-selected) tabs -- to the
// end of its window's tab strip.
//
// Requires ZERO permissions. Per the Chrome Tabs API reference, the "tabs"
// permission only gates the sensitive Tab fields (url, pendingUrl, title,
// favIconUrl). tabs.move() and a query that reads none of those are
// unprivileged, so this extension can never see what pages you have open.

const COMMAND = "move-tab-to-end";

// Chrome rejects tab edits while the user is mid-drag. Official guidance is to
// retry shortly. Bounded, so a persistent failure cannot spin forever.
const DRAG_ERROR = "Tabs cannot be edited right now";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 50;

chrome.commands.onCommand.addListener((command) => {
  if (command !== COMMAND) return;
  void run(0);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDragError = (error) =>
  (error instanceof Error ? error.message : String(error)).includes(DRAG_ERROR);

async function run(attempt) {
  try {
    await moveSelectedTabsToEnd();
  } catch (error) {
    if (isDragError(error) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return run(attempt + 1);
    }
    // Log the message only; never log tab objects, which may carry URLs.
    console.error(
      `${COMMAND} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function moveSelectedTabsToEnd() {
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

  // Chrome will not place a pinned tab after an unpinned one, so the two
  // groups move separately, each to the end of its own section.
  const pinnedIds = tabs.filter((tab) => tab.pinned).map((tab) => tab.id);
  const unpinnedIds = tabs.filter((tab) => !tab.pinned).map((tab) => tab.id);

  if (unpinnedIds.length > 0) {
    await chrome.tabs.move(unpinnedIds, { index: -1 });
  }

  if (pinnedIds.length > 0) {
    // End of the pinned block, not the strip: index -1 would be rejected.
    const allPinned = await chrome.tabs.query({ pinned: true, windowId });
    const target = Math.max(0, allPinned.length - pinnedIds.length);
    await chrome.tabs.move(pinnedIds, { index: target });
  }
}
