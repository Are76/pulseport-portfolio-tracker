# Atlas Mobile Navigation And Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved On-chain Atlas experience easy to navigate on phones without changing desktop information architecture.

**Architecture:** Keep the existing `AtlasHomeSurface` selection model and use the existing mobile `AtlasDetailSheet` as the single mobile drilldown. Improve the sheet as an accessible overlay with focus restoration and Escape dismissal, then polish the production mobile bottom bar rendered by `App` with clear accessibility state and comfortable tap targets.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, lucide-react

---

## Task 1: Accessible Atlas Mobile Detail Sheet

**Files:**
- Modify: `src/components/atlas/AtlasDetailSheet.tsx`
- Modify: `src/test/atlas-components.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write failing tests**

Add tests that open the sheet, verify the close control is focused, dismiss with Escape, and verify focus returns to the tile that launched the detail.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- src/test/atlas-components.test.tsx`

Expected: FAIL because the current sheet does not focus its close control, handle Escape, or restore focus.

- [ ] **Step 3: Add minimal sheet behavior**

Use a close-button ref, remember the previously focused element when the sheet opens, focus the close control, listen for Escape while open, and restore focus on cleanup. Use an icon-backed close control with an accessible label and add a visible drag handle.

- [ ] **Step 4: Tighten mobile sheet CSS**

Keep the sheet scrollable, add safe-area bottom padding, size the close control to at least `44px`, and hide the duplicate embedded desktop panel on mobile so the sheet is the clear drilldown.

- [ ] **Step 5: Verify**

Run: `npm.cmd run test -- src/test/atlas-components.test.tsx`

Expected: PASS.

## Task 2: Stable Production Mobile Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `src/test/app-mobile-nav.test.tsx`

- [ ] **Step 1: Write failing tests**

Add assertions that the rendered mobile navigation exposes its purpose, current destination, and expandable secondary destinations.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- src/test/app-mobile-nav.test.tsx`

Expected: FAIL until the rendered mobile navigation exposes accessibility state.

- [ ] **Step 3: Add minimal navigation markup**

Label the rendered mobile navigation, expose the active destination with `aria-current`, and expose the More menu state with `aria-expanded`.

- [ ] **Step 4: Add mobile bottom-bar CSS**

Keep the existing fixed production bottom bar, safe-area padding, stable tap targets, and content clearance. Remove the low-value backdrop blur from the opaque mobile bar.

- [ ] **Step 5: Verify**

Run: `npm.cmd run test -- src/test/app-mobile-nav.test.tsx`

Expected: PASS.

## Task 3: Integration Verification

**Files:**
- Verify: `src/components/atlas/AtlasHomeSurface.tsx`
- Verify: `src/index.css`
- Verify: `src/App.tsx`

- [ ] **Step 1: Run automated checks**

Run:

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run browser verification**

Verify:

```text
Atlas home -> tap metric tile -> bottom sheet opens -> close -> same tile regains focus
Shell -> mobile viewport -> bottom navigation remains visible -> active state remains clear
```

Check a desktop viewport and a phone viewport for overlap, clipping, scroll traps, framework overlays, and console warnings.

- [ ] **Step 3: Commit**

Commit the focused implementation and push `ui/atlas-mobile-navigation-detail`.
