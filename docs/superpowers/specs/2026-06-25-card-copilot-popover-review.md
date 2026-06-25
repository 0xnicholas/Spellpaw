# Spec Review: Card Copilot Popover

**Spec under review**: `docs/superpowers/specs/2026-06-25-card-copilot-popover-design.md`
**Reviewer**: spec-document-reviewer subagent
**Date**: 2026-06-25
**Reference screenshots verified via OCR** (macOS Vision):
- `screenshots/buzzy-canvas.png` — canvas with empty placeholder cards (Text, Image, Video)
- `screenshots/buzz-canvas-node-copilot.png` — Image card selected, popover below it

---

## Summary

⚠️ **Issues Found** — Spec is mostly sound and the buzzy.now reference pattern is correctly captured, but there are several real correctness, integration, and test-coverage gaps that need to be addressed before implementation.

The buzzy.now pattern is accurately represented: empty placeholder cards, popover with Ref + prompt + model + quality + Generate, popover below the card. The core architectural decision (Portal overlay managed by CanvasPanel state) is correct for this codebase.

---

## Blocker Issues

### B1. `kindToCardType` and `defaultTitle` functions referenced but not defined

- **Spec location**: Section 4.7, lines ~412
- **Issue**: The spec uses `kindToCardType(kind)` and `defaultTitle(kind)` in pseudocode, but does not define them. These are critical for `handlePaneCreate`. The mappings exist scattered in the spec (Section 4.2 table for cardType, Section 4.7 text for defaultTitle) but no consolidated definition.
- **Fix**: Add explicit function definitions to Section 4.7:

```ts
function kindToCardType(kind: CopilotKind): CanvasNodeType {
  return { text: 'storyline', image: 'art', video: 'videoClip', upload: 'asset' }[kind];
}
function defaultTitle(kind: CopilotKind): string {
  return { text: '新故事线', image: '新美术', video: '新视频', upload: '新素材' }[kind];
}
```

### B2. `CopilotCardNode` references in non-test code will produce dead imports

- **Spec location**: Section 7.5
- **Codebase search results** (not just tests, contrary to spec claim):
  - `src/shared/components/canvas/CanvasPanel.tsx:24,41,189,191,296` — runtime references (these get fixed by removing the import)
  - `src/shared/components/canvas/nodes/index.ts:6,7` — re-export (`export { CopilotCardNode }` and `export type { CopilotCardNodeData, CopilotKind }`)
  - `src/apps/drama/types/index.ts:72` — `'copilotCard'` in `CanvasNodeType` union
  - `src/apps/drama/stores/toolRouter/cards.ts:163` — `CARD_TYPE_ICONS` map entry
  - `src/apps/drama/lib/toolConfigs.ts:85` — LLM tool schema enum
- **Issue**: The spec says "保留 CopilotCardNode 文件但不再使用" but doesn't enumerate all the cleanup sites. Specifically:
  - `toolRouter/cards.ts:163` icon entry — if `copilotCard` type is no longer created, this entry is dead but won't break anything
  - `toolConfigs.ts:85` schema enum — if a future LLM tool call returns `copilotCard`, it will fail validation since no node handler exists. Spec should explicitly say to **remove** `copilotCard` from this enum
  - `types/index.ts` union — must be removed
  - `nodes/index.ts` re-export — can stay (just exports the still-existing component) or be removed
- **Fix**: Section 7.5 should list all 4 cleanup sites and explicitly call out that `toolConfigs.ts` enum removal is required to prevent LLM from sending a type the LLM tool surface no longer accepts.

### B3. `kickstart_project` behavior on existing `copilotCard` types

- **Spec location**: Section 7.2
- **Codebase search**: `kickstart_project` only creates `sceneCard` and `script` types (from `analysis.ts`). The other `add_card` tool handler restricts to a specific list: `['storyline', 'moodboard', 'videoClip', 'asset', 'task', 'art', 'character']` (from `toolRouter/cards.ts:179-181`).
- **Issue**: The spec says "toolRouter 创建的卡片不带 isPlaceholder" but the spec is silent on what happens to **existing** mock/demo cards in projects that already contain `copilotCard` nodes (e.g. any localStorage-persisted state from a previous version). When users open an old project, those `copilotCard` nodes are still in the persisted Zustand store. With the new code:
  - `copilotCard` is no longer in `nodeTypes` → React Flow will throw a warning ("node type not found")
  - The nodes render as broken/empty
  - The user cannot delete them via the right-click menu (which only works on nodes, not by type)
- **Fix**: Section 7.2 (or a new migration section) must specify:
  - One-time migration: on app load, scan canvas state for `type === 'copilotCard'` and either:
    - **Delete them** (loses any in-flight generation state, but clean)
    - **Convert them to** a regular placeholder card (e.g., the most appropriate `art`/`videoClip`/`storyline`/`asset` based on `data.kind`)
  - Recommendation: **delete** — these are ephemeral generation artifacts, not user content

### B4. `onNodeClick` skips the `node-context-menu` button subtree check differently than spec claims

- **Spec location**: Section 4.6
- **Codebase search**: Current `onNodeClick` checks `target.tagName === 'BUTTON' || target.closest('button')`. Spec pseudocode mirrors this. **However**, when the popover is open and its textarea receives focus, then the user clicks the underlying card, the click target may resolve to elements **inside the popover** (which is rendered as a Portal outside the card). React Flow's `onNodeClick` only fires for clicks **on the node's DOM**, so popover-internal clicks should not trigger the click handler. But: clicks **on the card** while the popover is open will fire `onNodeClick` and (per spec) `setCopilotTarget({ nodeId: sameCard })` — the popover state would be re-set to itself, which is harmless but wasteful.
- **Less critical** (not a true blocker, but a minor inefficiency): The spec should add a guard `if (copilotTarget?.nodeId === node.id) return;` to skip the redundant setState on self-click.

---

## Major Issues

### M1. Stale popover position when card is dragged

- **Spec location**: Sections 3, 4.3, 5
- **Codebase search**: `CanvasPanel.tsx:147-149` has `onNodeDragStop` that syncs node positions. The spec tracks popover position via `flowToScreenPosition` recomputed on `onMove` (viewport change), but does NOT mention what happens during a node drag.
- **Issue**: When user drags a card while its popover is open, the popover stays at the old screen position (computed before the drag). After drop, the position will recompute on the next pan/zoom tick — but if the user doesn't pan/zoom, the popover is visibly wrong.
- **Fix**: Either:
  - Add `onNodeDrag` listener that recomputes popover position every drag tick (similar to `onMove` approach)
  - Or recompute position in `onNodeDragStop` after the drag completes
  - Spec should explicitly state which approach is taken

### M2. `useCopilotGenerate` is called from a hook that reads `card` from props — but `card` may be stale

- **Spec location**: Section 4.4
- **Issue**: `useCopilotGenerate({ card })` captures `card` in the `generate` callback's closure. If the parent re-renders with a new `card` reference (e.g. user clicks a different card and the popover re-binds), the `useCallback` dependency `[opts]` should trigger regen — but `opts` is an object literal passed inline, so its identity changes every render. This means the callback's closure is rebuilt every render, but the **hook's internal state** (`status`, `progress`, `error`, `abortRef`) is preserved.
- **Result**: When the user clicks a different card:
  - `setCopilotTarget({ newNodeId })` triggers a re-render
  - The popover unmounts and remounts (or the React Flow key changes — spec doesn't specify)
  - If the popover does NOT remount, internal `status` state could carry over from the previous card (e.g. previous card's `generating` state shown for the new card)
  - If the popover DOES remount, in-flight generation on the previous card is lost (abort fires on unmount)
- **Fix**: Spec needs to specify:
  - The popover is keyed by `nodeId` so it remounts on card switch (forces clean state per card)
  - When remounted, the previous card's `abortRef.abort()` fires (from `useEffect` cleanup), cancelling in-flight generation cleanly
  - This implies: "switching cards during generation cancels the in-flight request" — which is the **correct** behavior, and answers review question 2

### M3. Mid-generation card switch: should it cancel in-flight, or let it finish and update the card?

- **Spec location**: Section 4.1, 5.2, 5.4
- **Issue**: Review question 2 asks: "what happens if the user has clicked ANOTHER card during generation?" The spec is silent on this. Two reasonable behaviors:
  1. **Cancel on switch**: simpler, cleaner UX (each card has its own "session")
  2. **Let it finish, update card in background**: more complex, but lets user queue up multiple generations
- **Recommendation**: Adopt option 1 (cancel on switch). It's simpler and matches the buzzy.now pattern of "one popover, one card at a time". Spec should explicitly state this in Section 5.2 (and connect it to the M2 fix above: the remount-on-card-switch approach naturally implements this).

### M4. Popover z-index vs CardDetailDrawer and PaneContextMenu

- **Spec location**: Section 4.3
- **Codebase search**:
  - `CardDetailDrawer.tsx:464` — mask `z-10` (over canvas)
  - `CardDetailDrawer.tsx:468` — drawer `z-20` (over mask)
  - `PaneContextMenu.tsx:39` — menu `z-50` (over drawer)
  - Spec popover proposed: `z-50` (same as PaneContextMenu)
- **Issue**: Three layered concerns:
  1. Popover z-50 + PaneContextMenu z-50 — if both open, last-rendered wins. Popover can be obscured by pane menu opened via right-click.
  2. Drawer z-20 + popover z-50 — if both visible (user single-clicks, then via some other path opens drawer), the popover will appear **on top of** the drawer's right panel. This may or may not be desired.
  3. Spec Section 4.6 says "双击 → 关闭弹窗" but doesn't address the scenario where the drawer is opened via the **right-click context menu** (currently `onNodeContextMenu` only shows duplicate/delete/rename/copy-id, not "open details") — so this is mostly hypothetical, but worth noting.
- **Fix**:
  - Define z-index ladder: `PaneContextMenu: 60` (top), `CardCopilotPopover: 55`, `CardDetailDrawer: 20`. Document the ladder in a shared `z-index.ts` constant.
  - Section 4.6 should explicitly state that **any** state change opening the drawer (currently only double-click) MUST also call `setCopilotTarget(null)`. Add this as a guard in `useHotkeys` for Escape, in `setSelectedCardId` call sites, etc.

### M5. `useCopilotGenerate` `useCallback` dependencies will cause stale closure issues

- **Spec location**: Section 4.4, line ~333
- **Codebase pattern**: Current `CanvasPanel.tsx:onNodeClick` uses `useCallback` with `[setSelectedCardId]` — minimal deps, no inline options.
- **Issue**: Spec writes `useCallback(async (params) => {...}, [opts, updateNodeData])`. The closure captures `opts` and `updateNodeData`. Because `opts` is an object passed by the parent, the dep array should be `[opts.card, opts.kind, opts.onSuccess, updateNodeData]` (destructured primitives) to avoid the `generate` function being recreated on every parent render.
- **Fix**: Spec pseudocode should destructure `opts` inside the function body or use individual deps: `}, [opts.card?.id, opts.kind, updateNodeData, opts.onSuccess])`. Even better: pass `card.id` and `kind` as positional args and have the hook fetch `card` from `useCanvasStore.getState()` on each call (since canvasStore is stable). This avoids the closure problem entirely.

### M6. `pollUntilDone` exists but spec is vague on its location/signature

- **Spec location**: Section 7.1
- **Codebase search**: `src/apps/drama/lib/canvasToolkit/shared.ts:97` — `pollUntilDone` already exists. The spec's Section 4.4 `useCopilotGenerate` pseudocode calls `pollUntilDone(provider, taskId, setProgress, abortRef.current.signal)`.
- **Action needed**: Verify the actual signature matches the spec's usage. If it doesn't, this is a blocker. If it does, the spec should explicitly cite the file:line.

---

## Minor Issues

### m1. Spec test list mentions "GenericCardNode.test.tsx (修改)" but no such file exists

- **Spec location**: Section 8.1
- **Codebase search**: No `GenericCardNode.test.tsx` found. This would be a new file, not a modification.
- **Fix**: Change "(修改)" to "(新)" or remove the test entirely (GenericCardNode's placeholder rendering could be covered in `canvasPaneCreate.test.tsx` integration tests).

### m2. Test target count is optimistic given reviewer concern coverage

- **Spec location**: Section 8.3
- **Calculation check**: 15 + 10 + 5 + 2 + 3 = 35. Spec says "~32", close enough but the math is fuzzy.
- **No fix needed** — minor counting issue.

### m3. Spec says "Ref button only for upload" but buzzy.now reference has Ref for image generation

- **Spec location**: Section 4.3
- **Reference**: OCR of `buzz-canvas-node-copilot.png` shows the popover with "Ref" button, "迪丽热巴画像" prompt, and `Nano Banana Pro` model — this is the **image generation** popover, and it has a Ref button. Reference images (img2img) are the standard image-gen workflow.
- **Issue**: Spec Section 4.3 says "Ref 按钮（上传参考图，upload 模式显示）" — implying Ref is only for upload. But buzzy.now uses Ref for image generation (img2img / style reference). The spec should support Ref for **image and video** kinds as well.
- **Fix**: Section 4.3 layout diagram and Section 4.4 `useCopilotGenerate` should both treat `fileRef` as applicable to all kinds (not just upload). The `provider.submit` call may need to pass the reference image as a second parameter (depends on provider API; out of scope but should be flagged).

### m4. Spec doesn't define what happens if a `copilotCard` is in `add_card` tool input

- **Spec location**: Section 7.2
- **Codebase**: `toolRouter/cards.ts:181` already restricts the LLM-facing `add_card` tool to a list of types that **does not include** `copilotCard`. So this is already correctly handled. But the spec doesn't acknowledge it.
- **Fix**: Add a note to Section 7.2 confirming the tool schema is already restricted (cite `toolRouter/cards.ts:179-181`).

### m5. Popover position computation assumes card is a single size (240×200)

- **Spec location**: Section 3 "关键架构选择 #3"
- **Codebase search**: Card sizes vary by type. `GenericCardNode` is `w-[240px]`, but other card node types (Script, Art, Character, etc.) may be different. Hardcoding `+120, +200` is fragile.
- **Fix**: Either:
  - Document the assumption that popovers are bound only to `GenericCardNode` (storyline/asset/videoClip/task/moodboard all use this), so size is consistent
  - Or measure actual card DOM via a ref (`node.measure()` returns width/height) and use that
- **Recommendation**: Document the assumption in the spec (Option A is simpler).

### m6. Section 4.6 ignores `onNodeDoubleClick` (already exists in React Flow)

- **Spec location**: Section 4.6 and Section 3 architecture diagram
- **Codebase search**: `ReactFlow` props include `onNodeDoubleClick` (verified in `component-props.d.ts:53`).
- **Issue**: Spec says "单/双击分离" via debounce + click timing, but doesn't use the native `onNodeDoubleClick` event which would be simpler and more reliable.
- **Fix**: Consider using `onNodeDoubleClick` for the drawer (replacing the 250ms timer for that side) and `onNodeClick` only for the popover. Trade-off: native dblclick is more reliable across browsers but has its own platform-dependent delay (typically 300-500ms). Current 250ms may be too aggressive.
- **Recommendation**: Keep the 250ms debounce approach (avoids dblclick platform delay), but explicitly state this is intentional and document the timing assumption.

### m7. `screenToFlowPosition` and viewport reset

- **Spec location**: Section 3 "关键架构选择 #3"
- **Issue**: When user resets viewport (Controls → fitView), `onMove` fires; if popover is open, the spec recomputes position. Good. But the spec should verify `reactFlowRef.current` is not null at the time of recomputation (it can be null if React Flow hasn't called `onInit` yet, though that's unlikely in steady state).
- **Fix**: Add a null guard in the position computation path.

### m8. Section 5.1 step 5 "setTimeout 800ms" for auto-close after `done`

- **Spec location**: Section 5.1, line ~457
- **Issue**: 800ms is a magic number. If user starts reading the success state and the popover closes too early, it's jarring. If too long, it feels laggy.
- **Fix**: Make it a named constant (e.g. `AUTOCLOSE_DELAY_MS = 1200`) at the top of the spec, with a brief justification.

---

## Test Coverage Gaps

| Gap | Spec coverage | Recommendation |
|-----|---------------|----------------|
| `onNodeDoubleClick` race: user single-clicks card A, popover opens, then double-clicks card A → does drawer open and popover close? | Not specified | Add test: "double-clicking the card whose popover is open → drawer opens, popover closes" |
| Popover position when card is dragged mid-generation | Not specified | Add test if M1 fix uses `onNodeDrag` |
| Popover position when viewport reset (Controls → fitView) | Not in Section 8 | Add to CanvasPanel extension tests |
| Popover with multiple kinds: switch from text → image while image popover was previously open on another card | Not specified | Add CardCopilotPopover test: "kind prop changes mid-mount" |
| Popover with `kind: 'upload'` showing Ref button vs `kind: 'image'` | Spec only mentions upload shows Ref (m3 above) | Add tests for each kind's Ref button visibility |
| Right-click during popover open: does the pane context menu also open? | Not specified | Add test: "right-click while popover is open → both visible? z-index conflict?" |
| Esc handler in popover vs CardDetailDrawer | Spec mentions Esc in Section 4.1 close triggers | Confirm both `useHotkeys` calls don't conflict (CardDetailDrawer already has Esc handler at line 417) |
| Card with `isPlaceholder: true` survives a project switch + reload | Not specified | Add integration test with mock persistence |

---

## Architectural Sanity Check

| Question | Answer |
|----------|--------|
| Does removing `copilotCard` from `nodeTypes` break toolRouter? | No, toolRouter only invokes `addCanvasCardHandler` with non-`copilotCard` types (verified in `toolRouter/cards.ts:179-181`). |
| Does removing `copilotCard` from types union break typecheck? | Yes, if any code still references the literal. Confirmed: no external references in `src/` outside the ones enumerated in B2. |
| Will `CopilotCardNode.test.tsx` still pass after these changes? | Yes — it tests the component in isolation, doesn't care if it's registered. |
| Will `PaneContextMenu.test.tsx` still pass? | Yes — no changes. |
| Will the existing 292 tests pass? | Most yes. **Risk**: the new `useCopilotGenerate` hook is unit-tested separately and should not affect existing tests, but if the hook is in a shared file that other tests import, there's indirect risk. Verify by running the suite. |
| Are there React Flow API mismatches? | Verified `flowToScreenPosition` is the correct API (`general.d.ts:171`). `onNodeDoubleClick` is supported. `onMove` provides viewport. All good. |
| Does the new popover component need any new dependencies? | No — all APIs (`useState`, `useRef`, `useEffect`, `useCallback`) are React built-ins. Zero new deps. |

---

## Recommendations

1. **Address B1, B2, B3 before any implementation starts**. These are real correctness issues that will surface as bugs.
2. **Resolve M3 explicitly** (mid-generation card switch behavior) — this is a UX call the user should approve.
3. **Clarify M4 z-index ladder** in a shared constants file.
4. **Fix m3** (Ref button for image/video kinds, not just upload).
5. **Add migration logic for existing `copilotCard` nodes** (B3) — even if it's just "delete on load".
6. **Add B4 guard** for self-click to avoid redundant state updates.

---

## Verdict

⚠️ **Issues Found** — Spec needs revision before implementation. The architectural direction is correct, the buzzy.now pattern is well-captured, and most technical details check out. But the missing `kindToCardType` / `defaultTitle` definitions, the incomplete enumeration of `copilotCard` cleanup sites, the missing migration story for existing `copilotCard` nodes, and the Ref button scope (m3) are all real issues that will cause bugs or design rework if not addressed.