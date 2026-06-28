/**
 * Canvas auto-layout — grid positioning for LLM-driven card creation.
 *
 * When a tool call creates cards with `position: "auto"`, this function
 * computes a stable grid position so the LLM never has to think about
 * pixels. The layout is a simple left-to-right, top-to-bottom grid:
 *
 *   [0] [1] [2]
 *   [3] [4] [5]
 *   ...
 *
 * Columns: 3 | Card width + gap: 400px | Start offset: (50, 50)
 */

const COLS = 3;
const CARD_WIDTH = 380;
const CARD_GAP_X = 20;
const CARD_GAP_Y = 40;
const START_X = 50;
const START_Y = 50;

/**
 * Compute the next grid position for a new card, taking existing
 * canvas nodes into account so cards don't overlap.
 */
export function computeAutoPosition(
  existingNodeCount: number,
  index?: number,
): { x: number; y: number } {
  const i = index ?? existingNodeCount;
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: START_X + col * (CARD_WIDTH + CARD_GAP_X),
    y: START_Y + row * (CARD_GAP_Y + 200), // 200px estimated card height
  };
}
