# GoPulse-Inspired PulsePort UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework PulsePort toward the approved GoPulse-inspired dark, high-contrast, clickable portfolio UI while preserving existing portfolio functionality.

**Architecture:** Roll the redesign out in small product-reviewed branches. Start with a contained home-surface proof, then expand the visual system to details, cards, and main portfolio modules only after the product owner confirms the direction feels right in the real app.

**Tech Stack:** Vite, React 19, TypeScript, CSS variables in `src/index.css`, Vitest, Testing Library, existing `lucide-react`, existing `motion`.

---

## Reality Check

This is a meaningful UI/UX redesign, not a simple color swap.

Recommended scope:

- **4-5 branches** for the core app experience.
- **7-10 branches** only if the redesign is expanded to every modal, DeFi module, bridge view, transaction surface, and legacy edge view.

Expected effort:

- Prototype-quality first screen: **0.5-1 day**.
- Production-quality home surface: **1-2 days**.
- Coherent redesign of primary app surfaces: **4-7 days**.
- Full design-system cleanup across the whole app: **1-2 weeks**.

The first implementation branch should prove the direction in the real app before wider redesign work starts.

## Branch Strategy

Use these branches/PRs instead of one large redesign branch:

1. **Branch 1: `ui/atlas-home-surface`**
   - Goal: prove the GoPulse-like dark contrast direction on the home/portfolio first screen.
   - Includes design tokens, minimal clickable components, desktop detail panel, and mobile detail sheet only where needed for the home surface.
   - Product owner checkpoint: approve whether the real app now feels like the browser mockup direction.

2. **Branch 2: `ui/atlas-token-holdings-cards`**
   - Goal: apply the same visual language to token cards, holdings rows, market cards, and token detail entry points.
   - Product owner checkpoint: confirm users can click holdings and understand where they go.

3. **Branch 3: `ui/atlas-stakes-defi-summary`**
   - Goal: bring HEX stakes and DeFi/LP summaries into the same clickable information model.
   - Product owner checkpoint: confirm stake and LP information is clear without becoming text-heavy.

4. **Branch 4: `ui/atlas-mobile-navigation-detail`**
   - Goal: polish mobile navigation, bottom sheets, tap targets, and return-to-position behavior.
   - Product owner checkpoint: mobile feels easy, not cramped.

5. **Branch 5: `ui/atlas-polish-accessibility`**
   - Goal: final spacing, hover/focus states, contrast, text overflow, empty states, and screenshot review.
   - Product owner checkpoint: approve for broader rollout.

Stop after any branch if the product owner does not like the direction in the real app.

## Guardrails For Design Work

For design exploration, keep the process light:

- Use visual mockups and product-owner feedback.
- Do not require heavy subagent review for every visual tweak.
- Prefer fast iteration and browser review.

For implementation, keep guardrails practical:

- Work on a feature branch or isolated worktree.
- Keep each branch focused.
- Do not mix backend/data-source changes into UI branches.
- Run `npm.cmd run lint`, relevant tests, and `npm.cmd run build` before calling a branch done.
- Use browser verification for desktop and mobile.
- Product owner reviews the visible result before the next branch begins.

The coder should not implement the full plan in one pass unless explicitly requested.

## Product Owner Roadmap

The product owner should review after each milestone:

1. **Visual Foundation:** Confirm black/white contrast, green accent, red/green market states, and typography feel right.
2. **Clickable Model:** Confirm every visible card/tile/signal opens the expected deeper context.
3. **Home Screen:** Confirm the first viewport is easy to understand without reading instructions.
4. **Mobile Detail Sheet:** Confirm mobile users can tap a tile and return without losing their place.
5. **Polish Pass:** Confirm spacing, hover states, empty states, and copy feel production-ready.

The coder should not start by restyling everything. Build the reusable interaction system first, then migrate surfaces into it.

## File Structure

The file structure below is for **Branch 1: `ui/atlas-home-surface`** only. Later branches should add their own focused plans after the product owner approves this first real-app implementation.

Create:

- `src/components/atlas/atlas-types.ts`  
  Shared types for metric tiles, signals, token cards, and detail panel content.
- `src/components/atlas/AtlasMetricTile.tsx`  
  Clickable stat tile.
- `src/components/atlas/AtlasSignalRow.tsx`  
  Compact clickable signal row.
- `src/components/atlas/AtlasTokenCard.tsx`  
  GoPulse-like token/holding card.
- `src/components/atlas/AtlasDetailPanel.tsx`  
  Desktop right-side detail panel.
- `src/components/atlas/AtlasDetailSheet.tsx`  
  Mobile bottom-sheet detail view.
- `src/components/atlas/AtlasHomeSurface.tsx`  
  Composes the new first-screen layout from existing portfolio data.
- `src/components/atlas/atlas-detail-model.ts`  
  Pure functions that convert selected IDs into detail content.
- `src/test/atlas-components.test.tsx`  
  Component behavior tests.
- `src/test/atlas-detail-model.test.ts`  
  Pure model tests.

Modify:

- `src/index.css`  
  Add dark contrast design tokens and atlas component classes.
- `src/App.tsx`  
  Wire the new surface into the home route first. Avoid broad refactors outside the rendered home/overview path.
- `docs/superpowers/specs/2026-05-28-gopulse-inspired-pulseport-ui-design.md`  
  Only update if the product owner changes the design direction.

Do not modify backend service modules in this UI phase.

---

### Task 1: Add Atlas Types And Detail Model

**Files:**
- Create: `src/components/atlas/atlas-types.ts`
- Create: `src/components/atlas/atlas-detail-model.ts`
- Test: `src/test/atlas-detail-model.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/test/atlas-detail-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildAtlasDetail, type AtlasDetailId } from '../components/atlas/atlas-detail-model';

describe('atlas detail model', () => {
  it.each<AtlasDetailId>([
    'portfolio-change',
    'stakes',
    'liquidity',
    'hidden-noise',
    'signal-plsx-strength',
    'token-pls',
  ])('builds complete detail content for %s', (id) => {
    const detail = buildAtlasDetail(id);

    expect(detail.id).toBe(id);
    expect(detail.breadcrumb.length).toBeGreaterThan(0);
    expect(detail.title.length).toBeGreaterThan(0);
    expect(detail.summary.length).toBeGreaterThan(0);
    expect(detail.facts.length).toBeGreaterThan(0);
    expect(detail.actions.length).toBeGreaterThan(0);
  });

  it('falls back to portfolio-change for unknown detail ids', () => {
    const detail = buildAtlasDetail('missing' as AtlasDetailId);

    expect(detail.id).toBe('portfolio-change');
    expect(detail.title).toBe('24h change');
  });
});
```

- [ ] **Step 2: Run the model test and verify it fails**

Run:

```bash
npm.cmd run test -- src/test/atlas-detail-model.test.ts
```

Expected: fail because `atlas-detail-model` does not exist.

- [ ] **Step 3: Add shared types**

Create `src/components/atlas/atlas-types.ts`:

```ts
import type { ReactNode } from 'react';

export type AtlasTone = 'neutral' | 'positive' | 'negative' | 'accent' | 'muted';

export type AtlasAction = {
  label: string;
  target: string;
  variant?: 'primary' | 'secondary';
};

export type AtlasFact = {
  label: string;
  value: string;
  tone?: AtlasTone;
};

export type AtlasDetailContent = {
  id: string;
  breadcrumb: string[];
  title: string;
  summary: string;
  facts: AtlasFact[];
  actions: AtlasAction[];
};

export type AtlasMetric = {
  id: string;
  label: string;
  value: string;
  subvalue?: string;
  tone?: AtlasTone;
  detailId: string;
};

export type AtlasSignal = {
  id: string;
  label: string;
  value: string;
  tone?: AtlasTone;
  detailId: string;
};

export type AtlasTokenCardData = {
  id: string;
  symbol: string;
  price: string;
  change: string;
  ratio?: string;
  tone?: AtlasTone;
  detailId: string;
  icon?: ReactNode;
};
```

- [ ] **Step 4: Add the pure detail model**

Create `src/components/atlas/atlas-detail-model.ts`:

```ts
import type { AtlasDetailContent } from './atlas-types';

export type AtlasDetailId =
  | 'portfolio-change'
  | 'stakes'
  | 'liquidity'
  | 'hidden-noise'
  | 'signal-plsx-strength'
  | 'token-pls';

const DETAILS: Record<AtlasDetailId, AtlasDetailContent> = {
  'portfolio-change': {
    id: 'portfolio-change',
    breadcrumb: ['Home', 'Portfolio', '24h'],
    title: '24h change',
    summary: 'Shows why the portfolio moved during the selected time range.',
    facts: [
      { label: 'Total', value: '+$3,182', tone: 'positive' },
      { label: 'Top driver', value: 'PLSX' },
      { label: 'Range', value: '24h' },
    ],
    actions: [
      { label: 'Value chart', target: 'overview', variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  },
  stakes: {
    id: 'stakes',
    breadcrumb: ['Home', 'Stakes'],
    title: 'HEX stakes',
    summary: 'Summarizes active stakes and points to the stake ladder.',
    facts: [
      { label: 'Active', value: '18' },
      { label: 'Due soon', value: '1', tone: 'accent' },
      { label: 'Principal', value: '4.2M HEX' },
    ],
    actions: [
      { label: 'Stake ladder', target: 'stakes', variant: 'primary' },
      { label: 'Due stake', target: 'stakes' },
    ],
  },
  liquidity: {
    id: 'liquidity',
    breadcrumb: ['Home', 'DeFi', 'LP'],
    title: 'Liquidity',
    summary: 'Shows LP value, portfolio share, and the largest pool.',
    facts: [
      { label: 'LP value', value: '$12.6K' },
      { label: 'Share', value: '15%' },
      { label: 'Main pool', value: 'PLSX / WPLS' },
    ],
    actions: [
      { label: 'Pools', target: 'defi', variant: 'primary' },
      { label: 'LP history', target: 'history' },
    ],
  },
  'hidden-noise': {
    id: 'hidden-noise',
    breadcrumb: ['Home', 'Hidden Tokens'],
    title: 'Hidden noise',
    summary: 'Shows what was hidden by the spam/noise filter.',
    facts: [
      { label: 'Hidden', value: '2' },
      { label: 'Value', value: '$0' },
      { label: 'Mode', value: 'Auto' },
    ],
    actions: [
      { label: 'Review hidden', target: 'assets', variant: 'primary' },
      { label: 'Filter', target: 'assets' },
    ],
  },
  'signal-plsx-strength': {
    id: 'signal-plsx-strength',
    breadcrumb: ['Home', 'Signals', 'PLSX'],
    title: 'PLSX strength',
    summary: 'Explains a compact signal with the evidence behind it.',
    facts: [
      { label: 'Price', value: '+4.1%', tone: 'positive' },
      { label: 'Impact', value: '+$1,420', tone: 'positive' },
      { label: 'Confidence', value: 'High' },
    ],
    actions: [
      { label: 'Open PLSX', target: 'product', variant: 'primary' },
      { label: 'Evidence', target: 'overview' },
    ],
  },
  'token-pls': {
    id: 'token-pls',
    breadcrumb: ['Home', 'Coins', 'PLS'],
    title: 'PLS',
    summary: 'Combines token market stats with wallet-specific context.',
    facts: [
      { label: 'Price', value: '$0.00000694' },
      { label: 'Ratio', value: '0.07 x Sac' },
      { label: '24h', value: '-3.21%', tone: 'negative' },
    ],
    actions: [
      { label: 'Token page', target: 'product', variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  },
};

export function buildAtlasDetail(id: AtlasDetailId): AtlasDetailContent {
  return DETAILS[id] ?? DETAILS['portfolio-change'];
}
```

- [ ] **Step 5: Run the model test and verify it passes**

Run:

```bash
npm.cmd run test -- src/test/atlas-detail-model.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/atlas/atlas-types.ts src/components/atlas/atlas-detail-model.ts src/test/atlas-detail-model.test.ts
git commit -m "Add atlas detail model"
```

---

### Task 2: Add Design Tokens And Base Atlas Styles

**Files:**
- Modify: `src/index.css`
- Test: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Add a test that verifies Atlas classes render usable elements**

Create `src/test/atlas-components.test.tsx` with this first smoke test:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function AtlasClassProbe() {
  return (
    <div className="atlas-surface">
      <button className="atlas-clickable-card">Probe</button>
    </div>
  );
}

describe('atlas styles integration', () => {
  it('renders atlas class hooks for the redesigned surface', () => {
    render(<AtlasClassProbe />);

    expect(screen.getByText('Probe')).toHaveClass('atlas-clickable-card');
  });
});
```

- [ ] **Step 2: Run the test and verify current state**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: pass. This establishes the test file before component behavior is added.

- [ ] **Step 3: Add Atlas CSS variables and base classes**

Append to `src/index.css` near the existing design-system variables:

```css
/* -- ATLAS / GOPULSE-INSPIRED UI ---------------------------------------- */
:root {
  --atlas-bg: #000000;
  --atlas-surface: #050505;
  --atlas-panel: #0b0c0d;
  --atlas-panel-strong: #111317;
  --atlas-border: #202226;
  --atlas-border-strong: #34373d;
  --atlas-fg: #ffffff;
  --atlas-muted: #8f939a;
  --atlas-subtle: #5d626b;
  --atlas-accent: #37ff68;
  --atlas-accent-dim: rgba(55, 255, 104, 0.12);
  --atlas-blue: #3b82ff;
  --atlas-positive: #37ff68;
  --atlas-negative: #ff353f;
}

.atlas-surface {
  background: var(--atlas-bg);
  color: var(--atlas-fg);
}

.atlas-clickable-card {
  border: 1px solid var(--atlas-border);
  background: var(--atlas-surface);
  color: var(--atlas-fg);
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.atlas-clickable-card:hover,
.atlas-clickable-card:focus-visible {
  border-color: var(--atlas-border-strong);
  box-shadow: 0 0 0 3px var(--atlas-accent-dim);
  outline: none;
  transform: translateY(-1px);
}

.atlas-clickable-card[aria-pressed='true'],
.atlas-clickable-card.is-active {
  border-color: var(--atlas-accent);
  box-shadow: 0 0 0 3px var(--atlas-accent-dim);
}

.atlas-mono {
  font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Run lint**

Run:

```bash
npm.cmd run lint
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/test/atlas-components.test.tsx
git commit -m "Add atlas design tokens"
```

---

### Task 3: Build Clickable Atlas Components

**Files:**
- Create: `src/components/atlas/AtlasMetricTile.tsx`
- Create: `src/components/atlas/AtlasSignalRow.tsx`
- Create: `src/components/atlas/AtlasTokenCard.tsx`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Add component behavior tests**

Extend `src/test/atlas-components.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AtlasMetricTile } from '../components/atlas/AtlasMetricTile';
import { AtlasSignalRow } from '../components/atlas/AtlasSignalRow';
import { AtlasTokenCard } from '../components/atlas/AtlasTokenCard';

describe('atlas clickable components', () => {
  it('calls onSelect with the metric detail id', () => {
    const onSelect = vi.fn();

    render(
      <AtlasMetricTile
        metric={{ id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' }}
        active={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /24h/i }));
    expect(onSelect).toHaveBeenCalledWith('portfolio-change');
  });

  it('marks active signal rows with aria-pressed', () => {
    render(
      <AtlasSignalRow
        signal={{ id: 'plsx', label: 'PLSX strength', value: '+4.1%', tone: 'positive', detailId: 'signal-plsx-strength' }}
        active={true}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /PLSX strength/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders token market card price and ratio', () => {
    render(
      <AtlasTokenCard
        token={{ id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token-pls' }}
        active={false}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText('PLS')).toBeInTheDocument();
    expect(screen.getByText('$0.00000694')).toBeInTheDocument();
    expect(screen.getByText('0.07 x Sac')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: fail because the components do not exist.

- [ ] **Step 3: Implement `AtlasMetricTile`**

Create `src/components/atlas/AtlasMetricTile.tsx`:

```tsx
import type { AtlasMetric } from './atlas-types';

type Props = {
  metric: AtlasMetric;
  active: boolean;
  onSelect: (detailId: string) => void;
};

function toneClass(tone: AtlasMetric['tone']) {
  return tone ? ` atlas-tone-${tone}` : '';
}

export function AtlasMetricTile({ metric, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-metric-tile${toneClass(metric.tone)}`}
      aria-pressed={active}
      onClick={() => onSelect(metric.detailId)}
    >
      <span className="atlas-label">{metric.label}</span>
      <strong className="atlas-metric-value atlas-mono">{metric.value}</strong>
      {metric.subvalue ? <small>{metric.subvalue}</small> : null}
    </button>
  );
}
```

- [ ] **Step 4: Implement `AtlasSignalRow`**

Create `src/components/atlas/AtlasSignalRow.tsx`:

```tsx
import type { AtlasSignal } from './atlas-types';

type Props = {
  signal: AtlasSignal;
  active: boolean;
  onSelect: (detailId: string) => void;
};

export function AtlasSignalRow({ signal, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-signal-row atlas-tone-${signal.tone ?? 'neutral'}`}
      aria-pressed={active}
      onClick={() => onSelect(signal.detailId)}
    >
      <span className="atlas-signal-strip" aria-hidden="true" />
      <strong>{signal.label}</strong>
      <span className="atlas-mono">{signal.value}</span>
    </button>
  );
}
```

- [ ] **Step 5: Implement `AtlasTokenCard`**

Create `src/components/atlas/AtlasTokenCard.tsx`:

```tsx
import type { AtlasTokenCardData } from './atlas-types';

type Props = {
  token: AtlasTokenCardData;
  active: boolean;
  onSelect: (detailId: string) => void;
};

export function AtlasTokenCard({ token, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-token-card atlas-tone-${token.tone ?? 'neutral'}`}
      aria-pressed={active}
      onClick={() => onSelect(token.detailId)}
    >
      <span className="atlas-token-card__top">
        <strong>{token.symbol}</strong>
        <span className="atlas-mono">{token.change}</span>
      </span>
      <span className="atlas-token-card__price atlas-mono">{token.price}</span>
      {token.ratio ? <span className="atlas-token-card__ratio">{token.ratio}</span> : null}
    </button>
  );
}
```

- [ ] **Step 6: Add component CSS**

Append to the Atlas CSS section in `src/index.css`:

```css
.atlas-label,
.atlas-token-card__ratio,
.atlas-metric-tile small {
  color: var(--atlas-muted);
  font-size: 12px;
}

.atlas-metric-tile {
  min-height: 96px;
  padding: 13px;
  text-align: left;
  border-radius: 14px;
}

.atlas-metric-value {
  display: block;
  margin-top: 4px;
  font-size: 22px;
}

.atlas-signal-row {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 6px;
  text-align: left;
  border-radius: 10px;
}

.atlas-signal-strip {
  width: 6px;
  height: 28px;
  border-radius: 999px;
  background: var(--atlas-subtle);
}

.atlas-token-card {
  min-height: 116px;
  padding: 13px;
  text-align: left;
  border-radius: 14px;
}

.atlas-token-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.atlas-token-card__price {
  display: block;
  margin-top: 7px;
  font-size: 22px;
  font-weight: 900;
}

.atlas-tone-positive .atlas-metric-value,
.atlas-tone-positive .atlas-token-card__top > span,
.atlas-tone-positive .atlas-signal-row > span:last-child,
.atlas-tone-positive .atlas-signal-strip {
  color: var(--atlas-positive);
  background-color: var(--atlas-positive);
}

.atlas-tone-negative .atlas-metric-value,
.atlas-tone-negative .atlas-token-card__top > span,
.atlas-tone-negative .atlas-signal-row > span:last-child {
  color: var(--atlas-negative);
}

.atlas-tone-negative .atlas-signal-strip {
  background-color: var(--atlas-negative);
}

.atlas-tone-accent .atlas-signal-strip {
  background-color: var(--atlas-accent);
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/atlas/AtlasMetricTile.tsx src/components/atlas/AtlasSignalRow.tsx src/components/atlas/AtlasTokenCard.tsx src/index.css src/test/atlas-components.test.tsx
git commit -m "Add clickable atlas cards"
```

---

### Task 4: Build Detail Panel And Mobile Sheet

**Files:**
- Create: `src/components/atlas/AtlasDetailPanel.tsx`
- Create: `src/components/atlas/AtlasDetailSheet.tsx`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Add detail component tests**

Append:

```tsx
import { AtlasDetailPanel } from '../components/atlas/AtlasDetailPanel';
import { AtlasDetailSheet } from '../components/atlas/AtlasDetailSheet';

const sampleDetail = {
  id: 'portfolio-change',
  breadcrumb: ['Home', 'Portfolio', '24h'],
  title: '24h change',
  summary: 'Shows why the portfolio moved.',
  facts: [{ label: 'Total', value: '+$3,182', tone: 'positive' as const }],
  actions: [{ label: 'Value chart', target: 'overview', variant: 'primary' as const }],
};

describe('atlas detail views', () => {
  it('renders breadcrumb, facts, and actions in the desktop panel', () => {
    render(<AtlasDetailPanel detail={sampleDetail} onAction={() => undefined} />);

    expect(screen.getByText('Home > Portfolio > 24h')).toBeInTheDocument();
    expect(screen.getByText('24h change')).toBeInTheDocument();
    expect(screen.getByText('+$3,182')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Value chart' })).toBeInTheDocument();
  });

  it('does not render the mobile sheet when closed', () => {
    const { container } = render(<AtlasDetailSheet detail={sampleDetail} open={false} onClose={() => undefined} onAction={() => undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: fail because detail components do not exist.

- [ ] **Step 3: Implement desktop detail panel**

Create `src/components/atlas/AtlasDetailPanel.tsx`:

```tsx
import type { AtlasDetailContent } from './atlas-types';

type Props = {
  detail: AtlasDetailContent;
  onAction: (target: string) => void;
};

export function AtlasDetailPanel({ detail, onAction }: Props) {
  return (
    <aside className="atlas-detail-panel" aria-label={`${detail.title} details`}>
      <div className="atlas-detail-breadcrumb">{detail.breadcrumb.join(' > ')}</div>
      <h2>{detail.title}</h2>
      <p>{detail.summary}</p>
      <div className="atlas-detail-facts">
        {detail.facts.map((fact) => (
          <div key={`${detail.id}-${fact.label}`} className={`atlas-detail-fact atlas-tone-${fact.tone ?? 'neutral'}`}>
            <span>{fact.label}</span>
            <strong className="atlas-mono">{fact.value}</strong>
          </div>
        ))}
      </div>
      <div className="atlas-detail-actions">
        {detail.actions.map((action) => (
          <button key={`${detail.id}-${action.label}`} type="button" className={action.variant === 'primary' ? 'is-primary' : undefined} onClick={() => onAction(action.target)}>
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement mobile detail sheet**

Create `src/components/atlas/AtlasDetailSheet.tsx`:

```tsx
import type { AtlasDetailContent } from './atlas-types';
import { AtlasDetailPanel } from './AtlasDetailPanel';

type Props = {
  detail: AtlasDetailContent;
  open: boolean;
  onClose: () => void;
  onAction: (target: string) => void;
};

export function AtlasDetailSheet({ detail, open, onClose, onAction }: Props) {
  if (!open) return null;

  return (
    <div className="atlas-detail-sheet" role="dialog" aria-modal="true" aria-label={`${detail.title} details`}>
      <button type="button" className="atlas-detail-sheet__backdrop" aria-label="Close detail panel" onClick={onClose} />
      <div className="atlas-detail-sheet__body">
        <button type="button" className="atlas-detail-sheet__close" onClick={onClose}>Close</button>
        <AtlasDetailPanel detail={detail} onAction={onAction} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add CSS for panel and sheet**

Append:

```css
.atlas-detail-panel {
  position: sticky;
  top: 18px;
  min-height: 360px;
  padding: 20px;
  border: 1px solid var(--atlas-border);
  border-radius: 18px;
  background: var(--atlas-surface);
  color: var(--atlas-fg);
}

.atlas-detail-breadcrumb {
  color: var(--atlas-accent);
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 8px;
}

.atlas-detail-panel h2 {
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.atlas-detail-panel p {
  color: var(--atlas-muted);
  font-size: 14px;
  line-height: 1.45;
  margin: 0 0 16px;
}

.atlas-detail-facts {
  display: grid;
  gap: 9px;
}

.atlas-detail-fact {
  padding: 11px;
  border: 1px solid #17191d;
  border-radius: 12px;
  background: var(--atlas-panel);
}

.atlas-detail-fact span {
  display: block;
  color: var(--atlas-muted);
  font-size: 12px;
}

.atlas-detail-fact strong {
  display: block;
  margin-top: 3px;
  font-size: 18px;
}

.atlas-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.atlas-detail-actions button {
  border: 1px solid var(--atlas-border);
  border-radius: 999px;
  background: #000;
  color: var(--atlas-fg);
  cursor: pointer;
  font-weight: 900;
  padding: 10px 12px;
}

.atlas-detail-actions button.is-primary {
  border-color: var(--atlas-accent);
  background: var(--atlas-accent);
  color: #000;
}

.atlas-detail-sheet {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: none;
}

.atlas-detail-sheet__backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
}

.atlas-detail-sheet__body {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 82vh;
  overflow: auto;
  border-radius: 20px 20px 0 0;
  background: var(--atlas-bg);
  padding: 12px;
}

.atlas-detail-sheet__close {
  display: block;
  margin: 0 0 8px auto;
  border: 1px solid var(--atlas-border);
  border-radius: 999px;
  background: var(--atlas-surface);
  color: var(--atlas-fg);
  padding: 8px 12px;
}

@media (max-width: 767px) {
  .atlas-detail-panel {
    position: static;
    min-height: auto;
  }

  .atlas-detail-sheet {
    display: block;
  }
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/atlas/AtlasDetailPanel.tsx src/components/atlas/AtlasDetailSheet.tsx src/index.css src/test/atlas-components.test.tsx
git commit -m "Add atlas detail views"
```

---

### Task 5: Compose The New Home Surface

**Files:**
- Create: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Add a composition test**

Append:

```tsx
import { AtlasHomeSurface } from '../components/atlas/AtlasHomeSurface';

describe('atlas home surface', () => {
  it('renders portfolio value and updates detail panel when a tile is clicked', () => {
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    expect(screen.getByText('$84,920')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('heading', { name: 'HEX stakes' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx
```

Expected: fail because `AtlasHomeSurface` does not exist.

- [ ] **Step 3: Implement the composed surface using fixture-like current values**

Create `src/components/atlas/AtlasHomeSurface.tsx`:

```tsx
import { useMemo, useState } from 'react';

import { AtlasDetailPanel } from './AtlasDetailPanel';
import { AtlasDetailSheet } from './AtlasDetailSheet';
import { AtlasMetricTile } from './AtlasMetricTile';
import { AtlasSignalRow } from './AtlasSignalRow';
import { AtlasTokenCard } from './AtlasTokenCard';
import { buildAtlasDetail, type AtlasDetailId } from './atlas-detail-model';
import type { AtlasMetric, AtlasSignal, AtlasTokenCardData } from './atlas-types';

type Props = {
  onNavigate: (target: string) => void;
};

const METRICS: AtlasMetric[] = [
  { id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' },
  { id: 'stakes', label: 'Stakes', value: '18', subvalue: '1 due soon', detailId: 'stakes' },
  { id: 'lp', label: 'LP', value: '$12.6K', subvalue: '15%', detailId: 'liquidity' },
  { id: 'noise', label: 'Noise', value: '2', subvalue: 'hidden', detailId: 'hidden-noise' },
];

const SIGNALS: AtlasSignal[] = [
  { id: 'plsx-strength', label: 'PLSX strength', value: '+4.1%', tone: 'positive', detailId: 'signal-plsx-strength' },
  { id: 'stake-soon', label: 'Stake soon', value: 'Open', tone: 'accent', detailId: 'stakes' },
  { id: 'lp-up', label: 'LP up', value: '15%', tone: 'muted', detailId: 'liquidity' },
];

const TOKENS: AtlasTokenCardData[] = [
  { id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token-pls' },
  { id: 'plsx', symbol: 'PLSX', price: '$0.0000053', change: '-3.51%', ratio: '0.76 PLS', tone: 'negative', detailId: 'signal-plsx-strength' },
  { id: 'inc', symbol: 'INC', price: '$0.317', change: '-2.69%', ratio: '45,740 PLS', tone: 'negative', detailId: 'liquidity' },
  { id: 'hex', symbol: 'HEX', price: '$0.00115', change: '-5.77%', ratio: '165 PLS', tone: 'negative', detailId: 'stakes' },
];

export function AtlasHomeSurface({ onNavigate }: Props) {
  const [selectedDetailId, setSelectedDetailId] = useState<AtlasDetailId>('portfolio-change');
  const [sheetOpen, setSheetOpen] = useState(false);
  const detail = useMemo(() => buildAtlasDetail(selectedDetailId), [selectedDetailId]);

  const selectDetail = (detailId: string) => {
    setSelectedDetailId(detailId as AtlasDetailId);
    setSheetOpen(true);
  };

  return (
    <section className="atlas-home atlas-surface">
      <header className="atlas-home__hero">
        <div>
          <span className="atlas-home__eyebrow">Portfolio</span>
          <h1 className="atlas-mono">$84,920</h1>
        </div>
        <div className="atlas-home__range" aria-label="Time range">
          <button type="button" className="is-active">24h</button>
          <button type="button">7d</button>
          <button type="button">30d</button>
          <button type="button">90d</button>
        </div>
      </header>

      <div className="atlas-home__layout">
        <div>
          <div className="atlas-home__metrics">
            {METRICS.map((metric) => (
              <AtlasMetricTile key={metric.id} metric={metric} active={selectedDetailId === metric.detailId} onSelect={selectDetail} />
            ))}
          </div>

          <div className="atlas-home__middle">
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Signals</strong><span>4</span></div>
              {SIGNALS.map((signal) => (
                <AtlasSignalRow key={signal.id} signal={signal} active={selectedDetailId === signal.detailId} onSelect={selectDetail} />
              ))}
            </div>
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Allocation</strong><span>wallet-aware</span></div>
              <div className="atlas-home__allocation">
                <span style={{ width: '42%' }}>PLSX</span>
                <span style={{ width: '31%' }}>HEX</span>
                <span style={{ width: '12%' }}>INC</span>
              </div>
            </div>
          </div>

          <div className="atlas-home__tokens">
            {TOKENS.map((token) => (
              <AtlasTokenCard key={token.id} token={token} active={selectedDetailId === token.detailId} onSelect={selectDetail} />
            ))}
          </div>
        </div>

        <AtlasDetailPanel detail={detail} onAction={onNavigate} />
      </div>

      <AtlasDetailSheet detail={detail} open={sheetOpen} onClose={() => setSheetOpen(false)} onAction={onNavigate} />
    </section>
  );
}
```

- [ ] **Step 4: Add home surface CSS**

Append:

```css
.atlas-home {
  padding: 24px;
}

.atlas-home__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.atlas-home__eyebrow {
  color: var(--atlas-accent);
  font-size: 12px;
  font-weight: 900;
}

.atlas-home__hero h1 {
  margin: 0;
  font-size: clamp(40px, 6vw, 64px);
  letter-spacing: -0.06em;
}

.atlas-home__range {
  display: flex;
  gap: 6px;
  border: 1px solid var(--atlas-border);
  border-radius: 999px;
  padding: 4px;
}

.atlas-home__range button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--atlas-muted);
  cursor: pointer;
  font-weight: 800;
  padding: 7px 10px;
}

.atlas-home__range button.is-active {
  background: var(--atlas-fg);
  color: #000;
}

.atlas-home__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.atlas-home__metrics,
.atlas-home__tokens {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.atlas-home__middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 12px 0;
}

.atlas-home__panel {
  border: 1px solid var(--atlas-border);
  border-radius: 14px;
  background: var(--atlas-surface);
  padding: 14px;
}

.atlas-home__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--atlas-fg);
  margin-bottom: 8px;
}

.atlas-home__panel-head span {
  color: var(--atlas-muted);
  font-size: 12px;
}

.atlas-home__allocation {
  display: flex;
  height: 42px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--atlas-panel);
}

.atlas-home__allocation span {
  display: grid;
  min-width: 48px;
  place-items: center;
  color: #000;
  font-size: 12px;
  font-weight: 900;
}

.atlas-home__allocation span:nth-child(1) { background: var(--atlas-accent); }
.atlas-home__allocation span:nth-child(2) { background: var(--atlas-fg); }
.atlas-home__allocation span:nth-child(3) { background: var(--atlas-blue); color: #fff; }

@media (max-width: 900px) {
  .atlas-home__layout,
  .atlas-home__middle {
    grid-template-columns: 1fr;
  }

  .atlas-home__metrics,
  .atlas-home__tokens {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 5: Run component tests**

Run:

```bash
npm.cmd run test -- src/test/atlas-components.test.tsx src/test/atlas-detail-model.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/atlas/AtlasHomeSurface.tsx src/index.css src/test/atlas-components.test.tsx
git commit -m "Compose atlas home surface"
```

---

### Task 6: Wire Home Surface Into `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/test/page-routing.test.tsx`

- [ ] **Step 1: Inspect current home render block**

Run:

```bash
rg -n "activeTab === 'home'|front-page dashboard-premium|front-hero" src/App.tsx
```

Expected: find the current home page rendering around the `activeTab === 'home'` block.

- [ ] **Step 2: Add an import**

Add near other component imports in `src/App.tsx`:

```ts
import { AtlasHomeSurface } from './components/atlas/AtlasHomeSurface';
```

- [ ] **Step 3: Add a navigation adapter inside `App` before `return`**

Add near other local handler functions:

```ts
const handleAtlasNavigate = (target: string) => {
  if (target === 'overview' || target === 'assets' || target === 'stakes' || target === 'history' || target === 'defi') {
    setActiveTab(target);
    return;
  }

  if (target === 'product' && currentAssets.length > 0) {
    openProductPage(currentAssets[0], activeTab);
  }
};
```

- [ ] **Step 4: Replace only the home first surface**

Inside the `activeTab === 'home'` render branch, replace the current first major home content with:

```tsx
<motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="front-page">
  <AtlasHomeSurface onNavigate={handleAtlasNavigate} />
</motion.div>
```

Keep unrelated routes unchanged.

- [ ] **Step 5: Run focused routing test**

Run:

```bash
npm.cmd run test -- src/test/page-routing.test.tsx src/test/atlas-components.test.tsx
```

Expected: pass. If `page-routing` asserts old home text, update it to assert a stable new home label such as `Portfolio`.

- [ ] **Step 6: Run lint**

Run:

```bash
npm.cmd run lint
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/test/page-routing.test.tsx
git commit -m "Wire atlas home surface"
```

---

### Task 7: Browser Verification And Product Owner Review

**Files:**
- Modify only if verification reveals layout defects.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm.cmd run dev
```

Expected: Vite starts on `http://localhost:5174`.

- [ ] **Step 2: Open desktop viewport**

Open:

```text
http://localhost:5174
```

Verify:

- Home first viewport is dark high-contrast.
- No pink, beige, gold, or purple-heavy page background.
- Portfolio total is prominent.
- Tiles are clickable.
- Detail panel updates on desktop.
- Text remains readable.

- [ ] **Step 3: Open mobile viewport**

Use browser devtools or Playwright to test approximately `390x844`.

Verify:

- Tiles fit in a two-column grid.
- Clicking opens the bottom detail sheet.
- Closing the sheet returns to the same screen.
- No text overlaps.

- [ ] **Step 4: Product owner review checkpoint**

Ask the product owner:

```text
Does this feel like the approved GoPulse-like PulsePort direction: dark, clear, clickable, and easy to understand?
```

Expected: product owner approves or gives specific visual/UX corrections.

- [ ] **Step 5: Commit polish fixes**

If changes are needed:

```bash
git add src/App.tsx src/index.css src/components/atlas src/test
git commit -m "Polish atlas home surface"
```

---

### Task 8: Full Verification

**Files:**
- None unless verification fails.

- [ ] **Step 1: Run lint**

```bash
npm.cmd run lint
```

Expected: pass.

- [ ] **Step 2: Run tests**

```bash
npm.cmd run test
```

Expected: pass. If the pre-existing DexScreener ordering tests still fail, record that separately and do not mix that fix into this UI branch unless the product owner approves.

- [ ] **Step 3: Run production build**

```bash
npm.cmd run build
```

Expected: pass. Existing bundle-size warnings can remain unless this change makes them worse.

- [ ] **Step 4: Record final status**

Update the product owner with:

- What changed.
- What was verified.
- Any known pre-existing failures.
- Screens or browser notes from desktop/mobile review.

---

## Self-Review

Spec coverage:

- Dark GoPulse-like contrast: Tasks 2, 5, 6, 7.
- No pink/gold/beige styling: Tasks 2 and 7.
- Clean sans plus mono for numbers: Tasks 2 and 3.
- Every box clickable: Tasks 3, 4, 5, 7.
- Progressive detail panel/sheet: Tasks 4 and 5.
- Product owner checkpoints: Product Owner Roadmap and Task 7.
- Verification: Task 8.

Scope is intentionally UI/UX only. Backend DTO migration and data-source cleanup remain separate work.
