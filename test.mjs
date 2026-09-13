// Checks the index arithmetic in targetIndex(). Everything else in this
// extension is a Chrome API call and has to be verified by hand.
// Run: node test.mjs
import assert from "node:assert/strict";

globalThis.chrome = {
  commands: { onCommand: { addListener() {} } },
  tabs: { TAB_ID_NONE: -1 },
};

const { targetIndex } = await import("./background.js");

// The index is where the FIRST moved tab lands; Chromium walks the rest in
// behind it one at a time, so the target does not depend on how many move.
const cases = [
  // edge, isPinned, pinnedCount, expected, why
  ["end", false, 0, -1, "unpinned to end targets end-of-strip"],
  ["end", false, 3, -1, "a pinned block does not shift the unpinned end"],
  ["end", true, 1, 0, "the sole pinned tab is already last in its block"],
  ["end", true, 3, 2, "pinned to end is the last slot of the pinned block"],
  ["end", true, 4, 3, "and does not depend on the number being moved"],
  ["end", true, 0, 0, "never negative"],
  ["start", false, 0, 0, "unpinned to start with no pinned tabs"],
  ["start", false, 2, 2, "unpinned to start lands after the pinned block"],
  ["start", true, 3, 0, "pinned to start is always index 0"],
];

for (const [edge, isPinned, pinnedCount, expected, why] of cases) {
  assert.equal(
    targetIndex(edge, isPinned, pinnedCount),
    expected,
    `${why} (${edge}, pinned=${isPinned}, pinnedCount=${pinnedCount})`
  );
}

console.log(`ok - ${cases.length} cases`);
