# GoPulse Compact Shell And Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the GoPulse Compact global shell and deliver a token-first dashboard whose visible controls and drilldowns work correctly in desktop and mobile layouts.

**Architecture:** Keep the existing React application entrypoint and page routing in `src/App.tsx`, but replace the shell's one-off visual styling with shared CSS classes and tokens. Extend the Atlas snapshot into a complete view model: it owns exact token details, allocation drilldowns, and selected time-range context. Reuse `AtlasDetailPanel` inside two accessible overlays: the existing mobile sheet and a new desktop drawer that starts closed.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, lucide-react, Vite

---

## File Structure

### Files To Create

- `src/components/atlas/AtlasDetailDrawer.tsx`: accessible desktop side drawer with dismissal, focus containment, and focus restoration.
- `src/test/app-shell-style.test.tsx`: shell-level assertions for sidebar, header, and dashboard composition classes.

### Files To Modify

- `src/App.tsx`: shell classes, reduced inline styling, and exact product navigation from Atlas actions.
- `src/index.css`: shared GoPulse Compact shell tokens, sidebar/header/background styles, drawer styles, and compact token-hybrid dashboard layout.
- `src/components/atlas/atlas-types.ts`: runtime detail map, allocation drilldown ID, range type, and selected-asset action target.
- `src/components/atlas/atlas-detail-model.ts`: range-aware portfolio details, runtime token detail lookup, and honest unavailable fallback.
- `src/components/atlas/atlas-portfolio-snapshot.ts`: exact token detail records and allocation drilldowns derived from real assets.
- `src/components/atlas/AtlasHomeSurface.tsx`: controlled range selection, token-first composition, desktop drawer state, and mobile sheet state.
- `src/components/atlas/AtlasDetailPanel.tsx`: remain presentation-only; render real detail content and actions supplied by the view model.
- `src/test/atlas-detail-model.test.ts`: exact runtime detail lookup and unavailable-state behavior.
- `src/test/atlas-portfolio-snapshot.test.ts`: exact token detail IDs and allocation drilldown mapping.
- `src/test/atlas-components.test.tsx`: range control behavior, drawer behavior, allocation activation, and mobile-sheet preservation.
- `src/test/atlas-theme-css.test.ts`: shell token and no-gradient contracts.

## Known Baseline

Before implementation, `npm.cmd run lint` passes. The full suite reports `209 passed` and two existing failures in `src/test/dexscreener-price-provider.test.ts`:

- `queued requests get observedAt and ingestedAt after acquiring a fetch slot`
- `fetch completion order does not affect deterministic observation order`

These failures are outside this branch. Report them separately during final verification.

---

## Task 1: GoPulse Compact Global Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Create: `src/test/app-shell-style.test.tsx`
- Modify: `src/test/atlas-theme-css.test.ts`

- [ ] **Step 1: Write failing shell tests**

Create `src/test/app-shell-style.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '../App';

describe('GoPulse Compact shell', () => {
  it('renders the shared shell, sidebar brand, and compact header classes', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<App />);

    expect(document.querySelector('.app-shell')).toHaveClass('gopulse-shell');
    expect(screen.getByRole('complementary')).toHaveClass('gopulse-sidebar');
    expect(document.querySelector('.app-header')).toHaveClass('gopulse-header');
  });
});
```

Extend `src/test/atlas-theme-css.test.ts`:

```ts
it('uses flat GoPulse Compact shell surfaces without decorative gradients', () => {
  expect(css).toContain('--shell-canvas:');
  expect(css).toContain('--shell-sidebar:');
  expect(css).toContain('--shell-header:');
  expect(css).not.toMatch(/\.gopulse-shell\s*{[^}]*radial-gradient/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/app-shell-style.test.tsx src/test/atlas-theme-css.test.ts
```

Expected: FAIL because `gopulse-shell`, `gopulse-sidebar`, `gopulse-header`, and the shared shell tokens do not exist.

- [ ] **Step 3: Add shared shell classes**

In `src/App.tsx`, add stable shell classes:

```tsx
<div className="app-shell gopulse-shell min-h-screen font-sans flex">
  <aside className={`app-sidebar gopulse-sidebar flex flex-col sticky top-0 h-screen overflow-y-auto custom-scrollbar${sidebarOpen ? ' open' : ''}`}>
    <div className="gopulse-sidebar__brand flex items-center gap-3">
      <div className="gopulse-sidebar__logo">
        <img src={BRAND_ASSETS.logo} alt="Pulseport logo" />
      </div>
      <div className="gopulse-sidebar__identity">
        <img className="app-sidebar-wordmark" src={BRAND_ASSETS.wordmark} alt="Pulseport wordmark" />
        <div className="gopulse-sidebar__tagline">Portfolio intelligence</div>
      </div>
    </div>
```

Add the compact header class:

```tsx
<header className="app-header gopulse-header shrink-0">
```

Move sidebar width, background, border, brand spacing, logo sizing, and header background/border/padding out of inline styles and into `src/index.css`.

- [ ] **Step 4: Add flat shell tokens and styles**

In `src/index.css`, add theme-aware shell tokens:

```css
:root {
  --shell-canvas: #020303;
  --shell-sidebar: #050707;
  --shell-header: #050707;
  --shell-surface: #090d0c;
  --shell-border: #1a211f;
  --shell-fg: #f4f7f6;
  --shell-muted: #8b9894;
}

[data-theme="light"] {
  --shell-canvas: #f3f6f5;
  --shell-sidebar: #ffffff;
  --shell-header: #ffffff;
  --shell-surface: #ffffff;
  --shell-border: #dce5e1;
  --shell-fg: #17231f;
  --shell-muted: #60716b;
}

.gopulse-shell {
  background: var(--shell-canvas);
  color: var(--shell-fg);
}

.gopulse-sidebar {
  width: 224px;
  min-width: 224px;
  border-right: 1px solid var(--shell-border);
  background: var(--shell-sidebar);
}

.gopulse-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 9px 18px;
  border-bottom: 1px solid var(--shell-border);
  background: var(--shell-header);
  backdrop-filter: none;
}
```

Keep green and red semantic states. Remove radial-gradient shell decoration and header blur from the new classes. Keep existing responsive mobile behavior intact.

- [ ] **Step 5: Verify Task 1**

Run:

```powershell
npm.cmd run test -- src/test/app-shell-style.test.tsx src/test/atlas-theme-css.test.ts src/test/app-mobile-nav.test.tsx
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/App.tsx src/index.css src/test/app-shell-style.test.tsx src/test/atlas-theme-css.test.ts
git commit -m "Refine GoPulse compact application shell"
```

---

## Task 2: Exact Token Detail View Model

**Files:**
- Modify: `src/components/atlas/atlas-types.ts`
- Modify: `src/components/atlas/atlas-detail-model.ts`
- Modify: `src/components/atlas/atlas-portfolio-snapshot.ts`
- Modify: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/test/atlas-detail-model.test.ts`
- Modify: `src/test/atlas-portfolio-snapshot.test.ts`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Write failing exact-selection tests**

Extend `src/test/atlas-portfolio-snapshot.test.ts`:

```ts
it('creates exact token and allocation drilldowns from live assets', () => {
  const snapshot = buildAtlasHomeSnapshot({
    summary: { totalValue: 450, pnl24h: 1.4, pnl24hPercent: 0.31 },
    walletCount: 2,
    assets,
    stakes: [],
    hiddenTokenCount: 0,
  });

  expect(snapshot.tokens.map(token => token.detailId)).toEqual([
    'token:plsx',
    'token:pls',
    'token:hex',
  ]);
  expect(snapshot.allocation.map(item => item.detailId)).toEqual([
    'token:plsx',
    'token:pls',
    'token:hex',
  ]);
  expect(snapshot.details['token:hex']).toMatchObject({
    id: 'token:hex',
    title: 'HEX',
  });
  expect(snapshot.details['token:hex'].actions[0]).toMatchObject({
    target: 'product:hex',
  });
});
```

Extend `src/test/atlas-detail-model.test.ts`:

```ts
it('uses runtime token details and returns an honest unavailable state for unknown ids', () => {
  const runtimeDetail = {
    id: 'token:hex',
    breadcrumb: ['Home', 'Coins', 'HEX'],
    title: 'HEX',
    summary: 'Wallet-aware HEX detail.',
    facts: [],
    actions: [],
  };

  expect(buildAtlasDetail('token:hex', { 'token:hex': runtimeDetail })).toBe(runtimeDetail);
  expect(buildAtlasDetail('token:missing').id).toBe('unavailable');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-detail-model.test.ts
```

Expected: FAIL because live tokens currently map non-PLS assets to `portfolio-change`, allocation items have no detail ID, and unknown details silently fall back.

- [ ] **Step 3: Extend Atlas types**

In `src/components/atlas/atlas-types.ts`, define the shared range type and extend the snapshot:

```ts
export type AtlasRange = '24h' | '7d' | '30d' | '90d';

export type AtlasAllocationItem = {
  id: string;
  label: string;
  width: number;
  detailId: string;
};

export type AtlasHomeSnapshot = {
  eyebrow: string;
  headlineValue: string;
  metrics: AtlasMetric[];
  signals: AtlasSignal[];
  allocation: AtlasAllocationItem[];
  tokens: AtlasTokenCardData[];
  details: Record<string, AtlasDetailContent>;
  emptyTokenMessage?: string;
};
```

- [ ] **Step 4: Build exact runtime token details**

In `src/components/atlas/atlas-portfolio-snapshot.ts`, replace the generic token detail helper:

```ts
function tokenDetailId(asset: Asset): string {
  return `token:${asset.id}`;
}
```

Create one `AtlasDetailContent` record per displayed asset:

```ts
const details = Object.fromEntries(sortedAssets.slice(0, MAX_TOKENS).map(asset => {
  const detailId = tokenDetailId(asset);
  const change = asset.pnl24h ?? asset.priceChange24h ?? 0;

  return [detailId, {
    id: detailId,
    breadcrumb: ['Home', 'Coins', asset.symbol],
    title: asset.symbol,
    summary: `${asset.name || asset.symbol} in your tracked portfolio.`,
    facts: [
      { label: 'Price', value: formatPrice(asset.price) },
      { label: 'Your value', value: formatUsd(asset.value) },
      { label: '24h', value: formatPercent(change), tone: toneForChange(change) },
      { label: 'Chain', value: asset.chain },
    ],
    actions: [
      { label: 'Token page', target: `product:${asset.id}`, variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  }];
}));
```

Return `details` in the snapshot and set `detailId: tokenDetailId(asset)` on tokens and allocation items.

- [ ] **Step 5: Keep design fallback snapshots type-safe**

In `src/components/atlas/AtlasHomeSurface.tsx`, add runtime details to `DEFAULT_SNAPSHOT`:

```ts
details: {},
```

Add `detailId` to default allocation items:

```ts
allocation: [
  { id: 'plsx', label: 'PLSX', width: 42, detailId: 'signal-plsx-strength' },
  { id: 'hex', label: 'HEX', width: 31, detailId: 'stakes' },
  { id: 'inc', label: 'INC', width: 12, detailId: 'liquidity' },
],
```

Add `details: {}` and allocation `detailId` values to supplied `AtlasHomeSnapshot` fixtures in `src/test/atlas-components.test.tsx`. This keeps the static design fallback compatible while live snapshots provide exact token details.

- [ ] **Step 6: Make the fallback honest**

In `src/components/atlas/atlas-detail-model.ts`, export a runtime-aware lookup:

```ts
const UNAVAILABLE_DETAIL: AtlasDetailContent = {
  id: 'unavailable',
  breadcrumb: ['Home', 'Details'],
  title: 'Detail unavailable',
  summary: 'This information is not available yet.',
  facts: [],
  actions: [],
};

export function buildAtlasDetail(
  id: AtlasDetailId | string,
  runtimeDetails: Record<string, AtlasDetailContent> = {},
): AtlasDetailContent {
  return runtimeDetails[id] ?? DETAILS[id as AtlasDetailId] ?? UNAVAILABLE_DETAIL;
}
```

Update the existing unknown-ID assertion in `src/test/atlas-detail-model.test.ts` from `portfolio-change` to `unavailable`.

- [ ] **Step 7: Verify Task 2**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-detail-model.test.ts src/test/atlas-components.test.tsx
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```powershell
git add src/components/atlas/atlas-types.ts src/components/atlas/atlas-detail-model.ts src/components/atlas/atlas-portfolio-snapshot.ts src/components/atlas/AtlasHomeSurface.tsx src/test/atlas-detail-model.test.ts src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
git commit -m "Model exact Atlas token drilldowns"
```

---

## Task 3: Working Range And Allocation Controls

**Files:**
- Modify: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Extend `src/test/atlas-components.test.tsx`:

```tsx
it('changes the selected time range when a range button is clicked', () => {
  render(<AtlasHomeSurface onNavigate={() => undefined} />);

  fireEvent.click(screen.getByRole('button', { name: '30d' }));

  expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('heading', { name: '30d change' })).toBeInTheDocument();
});

it('opens the exact allocation detail when an allocation segment is clicked', () => {
  render(<AtlasHomeSurface onNavigate={() => undefined} />);

  fireEvent.click(screen.getByRole('button', { name: 'PLSX allocation' }));

  expect(screen.getByRole('heading', { name: 'PLSX' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: FAIL because range buttons have no state and allocation segments are non-interactive spans.

- [ ] **Step 3: Add explicit range state**

In `src/components/atlas/AtlasHomeSurface.tsx`:

```tsx
const RANGES: AtlasRange[] = ['24h', '7d', '30d', '90d'];
const [selectedRange, setSelectedRange] = useState<AtlasRange>('24h');
```

Render the segmented control:

```tsx
{RANGES.map(range => (
  <button
    key={range}
    type="button"
    className={selectedRange === range ? 'is-active' : undefined}
    aria-pressed={selectedRange === range}
    onClick={() => setSelectedRange(range)}
  >
    {range}
  </button>
))}
```

Pass `snapshot.details` into `buildAtlasDetail`:

```tsx
const detail = useMemo(
  () => buildAtlasDetail(selectedDetailId, snapshot.details, selectedRange),
  [selectedDetailId, selectedRange, snapshot.details],
);
```

In `src/components/atlas/atlas-detail-model.ts`, make portfolio-change detail range-aware:

```ts
function buildPortfolioChangeDetail(range: AtlasRange): AtlasDetailContent {
  return {
    ...DETAILS['portfolio-change'],
    title: `${range} change`,
    breadcrumb: ['Home', 'Portfolio', range],
    facts: DETAILS['portfolio-change'].facts.map(fact => (
      fact.label === 'Range' ? { ...fact, value: range } : fact
    )),
  };
}

export function buildAtlasDetail(
  id: AtlasDetailId | string,
  runtimeDetails: Record<string, AtlasDetailContent> = {},
  range: AtlasRange = '24h',
): AtlasDetailContent {
  if (id === 'portfolio-change') return buildPortfolioChangeDetail(range);
  return runtimeDetails[id] ?? DETAILS[id as AtlasDetailId] ?? UNAVAILABLE_DETAIL;
}
```

- [ ] **Step 4: Make allocation interactive**

Replace allocation spans with stable buttons:

```tsx
{snapshot.allocation.map(item => (
  <button
    key={item.id}
    type="button"
    aria-label={`${item.label} allocation`}
    style={{ width: `${Math.max(8, item.width)}%` }}
    onClick={() => selectDetail(item.detailId)}
  >
    {item.label}
  </button>
))}
```

Update the corresponding CSS selector from `.atlas-home__allocation span` to `.atlas-home__allocation button`.

- [ ] **Step 5: Verify Task 3**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx src/test/atlas-theme-css.test.ts
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```powershell
git add src/components/atlas/AtlasHomeSurface.tsx src/index.css src/test/atlas-components.test.tsx src/test/atlas-theme-css.test.ts
git commit -m "Activate Atlas range and allocation controls"
```

---

## Task 4: Accessible Desktop Detail Drawer

**Files:**
- Create: `src/components/atlas/AtlasDetailDrawer.tsx`
- Modify: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/index.css`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Write failing drawer tests**

Extend `src/test/atlas-components.test.tsx`:

```tsx
it('keeps desktop details closed until a card is selected', () => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  render(<AtlasHomeSurface onNavigate={() => undefined} />);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
  expect(screen.getByRole('dialog', { name: 'HEX stakes details' })).toBeInTheDocument();
});

it('closes the desktop drawer on Escape and restores launching-card focus', () => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  render(<AtlasHomeSurface onNavigate={() => undefined} />);
  const stakesTile = screen.getByRole('button', { name: /Stakes/i });

  stakesTile.focus();
  fireEvent.click(stakesTile);
  fireEvent.keyDown(document, { key: 'Escape' });

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(stakesTile).toHaveFocus();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: FAIL because desktop details are permanently visible and no drawer exists.

- [ ] **Step 3: Create the drawer**

Create `src/components/atlas/AtlasDetailDrawer.tsx` using the same focus-management contract as `AtlasDetailSheet`:

```tsx
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import type { AtlasDetailContent } from './atlas-types';
import { AtlasDetailPanel } from './AtlasDetailPanel';

type Props = {
  detail: AtlasDetailContent;
  open: boolean;
  onClose: () => void;
  onAction: (target: string) => void;
};

export function AtlasDetailDrawer({ detail, open, onClose, onAction }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const controls = bodyRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="atlas-detail-drawer" role="dialog" aria-modal="true" aria-label={`${detail.title} details`}>
      <button type="button" className="atlas-detail-drawer__backdrop" aria-label="Dismiss detail panel" onClick={onClose} />
      <div ref={bodyRef} className="atlas-detail-drawer__body">
        <button ref={closeButtonRef} type="button" className="atlas-detail-drawer__close" aria-label="Close detail panel" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <AtlasDetailPanel detail={detail} onAction={onAction} />
      </div>
    </div>
  );
}
```

Keep the drawer hidden below `768px`.

- [ ] **Step 4: Replace permanent desktop panel**

In `src/components/atlas/AtlasHomeSurface.tsx`:

```tsx
const [drawerOpen, setDrawerOpen] = useState(false);

const selectDetail = (detailId: string) => {
  setSelectedDetailId(detailId);
  const isMobile = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 767px)').matches;
  setSheetOpen(isMobile);
  setDrawerOpen(!isMobile);
};
```

Remove the always-rendered `<AtlasDetailPanel />` from the dashboard layout and add:

```tsx
<AtlasDetailDrawer detail={detail} open={drawerOpen} onClose={() => setDrawerOpen(false)} onAction={onNavigate} />
```

- [ ] **Step 5: Add drawer CSS**

In `src/index.css`, add fixed overlay styles with a right-aligned body, neutral backdrop, stable width, and mobile hiding:

```css
.atlas-detail-drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.atlas-detail-drawer__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.48);
}

.atlas-detail-drawer__body {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(390px, 92vw);
  overflow: auto;
  padding: 14px;
  border-left: 1px solid var(--atlas-border);
  background: var(--atlas-bg);
}

@media (max-width: 767px) {
  .atlas-detail-drawer {
    display: none;
  }
}
```

- [ ] **Step 6: Verify Task 4**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```powershell
git add src/components/atlas/AtlasDetailDrawer.tsx src/components/atlas/AtlasHomeSurface.tsx src/index.css src/test/atlas-components.test.tsx
git commit -m "Add accessible Atlas desktop detail drawer"
```

---

## Task 5: Token-First Dashboard Composition

**Files:**
- Modify: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/index.css`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Write failing composition test**

Extend `src/test/atlas-components.test.tsx`:

```tsx
it('places token holdings before secondary allocation and signals', () => {
  const { container } = render(<AtlasHomeSurface onNavigate={() => undefined} />);
  const home = container.querySelector('.atlas-home');
  const tokens = home?.querySelector('.atlas-home__tokens');
  const secondary = home?.querySelector('.atlas-home__secondary');

  expect(tokens).toBeTruthy();
  expect(secondary).toBeTruthy();
  expect(tokens?.compareDocumentPosition(secondary as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: FAIL because the existing middle section appears before tokens and has no `atlas-home__secondary` boundary.

- [ ] **Step 3: Recompose the dashboard**

In `src/components/atlas/AtlasHomeSurface.tsx`, keep the order:

```tsx
<div className="atlas-home__metrics">...</div>
<div className="atlas-home__tokens">...</div>
<div className="atlas-home__secondary">
  <div className="atlas-home__panel">{/* allocation */}</div>
  <div className="atlas-home__panel">{/* signals */}</div>
</div>
```

Use compact headings such as `Your tokens`, `Allocation`, and `Signals`. Keep copy short.

- [ ] **Step 4: Flatten dashboard styling**

In `src/index.css`:

- remove the Atlas radial background effect
- reduce card radii to `6px` or less
- remove glow box-shadows from default, hover, and active cards
- use restrained borders and a simple inset active indicator
- keep tokens visually stronger than signals and allocation
- use two token columns on compact desktop and mobile widths without overflow

Use:

```css
.atlas-surface {
  background: var(--atlas-bg);
}

.atlas-clickable-card {
  border-radius: 4px;
  box-shadow: none;
}

.atlas-home__secondary {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr);
  gap: 8px;
  margin-top: 8px;
}
```

- [ ] **Step 5: Verify Task 5**

Run:

```powershell
npm.cmd run test -- src/test/atlas-components.test.tsx src/test/atlas-theme-css.test.ts
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```powershell
git add src/components/atlas/AtlasHomeSurface.tsx src/index.css src/test/atlas-components.test.tsx
git commit -m "Recompose Atlas dashboard around token holdings"
```

---

## Task 6: Exact Product Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/test/page-routing.test.tsx`

- [ ] **Step 1: Write failing product-navigation test**

Extend `src/test/page-routing.test.tsx` with an App-level test that clicks a dashboard token card, opens its drawer action, and confirms the product view names the exact selected asset. Use a live snapshot fixture or the existing App demo assets so the test selects a non-first token such as `USDC`.

The key assertion is:

```tsx
expect(screen.getByText('USDC product page')).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/page-routing.test.tsx
```

Expected: FAIL because `handleAtlasNavigate('product')` currently opens `currentAssets[0]`.

- [ ] **Step 3: Route exact asset actions**

In `src/App.tsx`, replace the generic product branch:

```ts
if (target.startsWith('product:')) {
  const assetId = target.slice('product:'.length);
  const asset = currentAssets.find(candidate => candidate.id === assetId);
  if (asset) openProductPage(asset, activeTab);
}
```

Remove the old fallback that opens `currentAssets[0]`.

- [ ] **Step 4: Verify Task 6**

Run:

```powershell
npm.cmd run test -- src/test/page-routing.test.tsx src/test/atlas-components.test.tsx src/test/atlas-portfolio-snapshot.test.ts
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```powershell
git add src/App.tsx src/test/page-routing.test.tsx
git commit -m "Route Atlas actions to exact token products"
```

---

## Task 7: Browser Verification And Branch Completion

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/index.css`
- Verify: `src/components/atlas/*`
- Verify: `src/test/*`

- [ ] **Step 1: Run focused automated verification**

Run:

```powershell
npm.cmd run test -- src/test/app-shell-style.test.tsx src/test/app-mobile-nav.test.tsx src/test/atlas-components.test.tsx src/test/atlas-detail-model.test.ts src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-theme-css.test.ts src/test/page-routing.test.tsx
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: all commands exit `0`. Build may retain the documented existing CSS-minifier and chunk-size warnings.

- [ ] **Step 2: Run full-suite baseline comparison**

Run:

```powershell
npm.cmd run test
```

Expected: all branch-owned tests pass. If the two known DexScreener ordering tests still fail unchanged, report them separately and do not broaden this UI branch.

- [ ] **Step 3: Start the dev server**

Run:

```powershell
npm.cmd run dev -- --port 5181
```

Expected: Vite serves the feature branch on an available local URL.

- [ ] **Step 4: Verify desktop dark and light layouts**

At a desktop viewport:

- confirm sidebar, top menu, and background use the GoPulse Compact shell
- confirm dashboard tokens dominate the content hierarchy
- click `24h`, `7d`, `30d`, and `90d`
- click each metric, allocation segment, signal, and token card
- confirm the desktop drawer starts closed, opens with the correct detail, dismisses with Escape, and restores focus
- confirm a non-first token's `Token page` action opens that exact token
- confirm no console errors

- [ ] **Step 5: Verify mobile dark and light layouts**

At a phone viewport such as `390x844`:

- confirm the bottom navigation remains fixed and usable
- confirm shell and dashboard do not overlap the bottom navigation
- confirm token cards fit without clipping
- confirm detail selections open the accessible bottom sheet rather than the desktop drawer
- confirm sheet dismissal and focus restoration
- confirm no console errors

- [ ] **Step 6: Request code review**

Use `superpowers:requesting-code-review` after all verification evidence is fresh. Fix only still-valid findings, rerun the relevant verification, then use `superpowers:finishing-a-development-branch`.
