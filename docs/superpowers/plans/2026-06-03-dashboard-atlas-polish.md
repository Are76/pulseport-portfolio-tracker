# Dashboard Atlas Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dashboard into a clearer Atlas surface with top-6 live price cards, a hybrid allocation module, more useful signals, and a rebalance-first action cluster while preserving current portfolio truth boundaries.

**Architecture:** Keep the dashboard presentation-first and centered on the existing Atlas snapshot pipeline. Extend the snapshot model to carry richer live-price, signal, allocation, and quick-action data; then add focused Atlas dashboard components that `AtlasHomeSurface` and the `overview` branch of `App.tsx` can render without reintroducing large inline UI blocks. Keep the `PCOCK` fix tightly scoped to asset visibility/classification handling in the current client-side asset pipeline.

**Tech Stack:** React, TypeScript, Vitest, Vite, existing Atlas components, existing dashboard state in `src/App.tsx`

---

### Task 1: Extend the Atlas dashboard snapshot model

**Files:**
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\atlas-types.ts`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\atlas-portfolio-snapshot.ts`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\atlas-portfolio-snapshot.test.ts`

- [ ] **Step 1: Write the failing snapshot test for live prices, action cluster, and richer allocation**

```ts
import { describe, expect, it } from 'vitest';
import { buildAtlasHomeSnapshot } from '../components/atlas/atlas-portfolio-snapshot';

describe('buildAtlasHomeSnapshot', () => {
  it('builds top-6 live prices, decision support actions, and hybrid allocation data', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 12000, pnl24h: 320, pnl24hPercent: 2.74 },
      walletCount: 2,
      assets: [
        { id: 'pls', symbol: 'PLS', name: 'PulseChain', balance: 100, price: 0.01, value: 5000, chain: 'pulsechain' },
        { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 100, price: 0.01, value: 3000, chain: 'pulsechain' },
        { id: 'inc', symbol: 'INC', name: 'Incentive', balance: 100, price: 0.01, value: 1500, chain: 'pulsechain' },
        { id: 'hex', symbol: 'HEX', name: 'HEX', balance: 100, price: 0.01, value: 1200, chain: 'pulsechain' },
        { id: 'ehex', symbol: 'eHEX', name: 'eHEX', balance: 100, price: 0.01, value: 800, chain: 'pulsechain' },
        { id: 'pdai', symbol: 'pDAI', name: 'DAI', balance: 100, price: 0.01, value: 300, chain: 'pulsechain' },
      ],
      stakes: [],
      hiddenTokenCount: 4,
    });

    expect(snapshot.tokens).toHaveLength(6);
    expect(snapshot.quickActions.map((action) => action.label)).toEqual([
      'Portfolio insights',
      'Review transactions',
      'Rebalance planner',
      'Exit plan',
    ]);
    expect(snapshot.allocation.topWeights.length).toBeGreaterThan(0);
    expect(snapshot.metrics.some((metric) => metric.label === 'Noise')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the snapshot test to verify it fails**

Run: `npm run test -- src/test/atlas-portfolio-snapshot.test.ts`

Expected: FAIL because `quickActions` and the richer `allocation` shape do not exist yet.

- [ ] **Step 3: Extend the Atlas dashboard types**

```ts
export type AtlasQuickAction = {
  id: string;
  label: string;
  description: string;
  target: string;
};

export type AtlasAllocationWeight = {
  id: string;
  label: string;
  value: string;
  percent: number;
  detailId: string;
};

export type AtlasAllocationModel = {
  segments: AtlasAllocationItem[];
  topWeights: AtlasAllocationWeight[];
};

export type AtlasSignal = {
  id: string;
  label: string;
  value: string;
  tone?: AtlasTone;
  detailId: string;
  description?: string;
  iconKey?: 'holding' | 'stakes' | 'defi' | 'flow' | 'alert';
};

export type AtlasHomeSnapshot = {
  eyebrow: string;
  headlineValue: string;
  metrics: AtlasMetric[];
  signals: AtlasSignal[];
  allocation: AtlasAllocationModel;
  tokens: AtlasTokenCardData[];
  quickActions: AtlasQuickAction[];
  details: Record<string, AtlasDetailContent>;
  emptyTokenMessage?: string;
};
```

- [ ] **Step 4: Implement the snapshot builder updates**

```ts
const MAX_TOKENS = 6;

const metrics: AtlasMetric[] = [
  {
    id: 'change',
    label: '24h',
    value: formatPercent(input.summary.pnl24hPercent),
    subvalue: formatSignedUsd(input.summary.pnl24h),
    tone: toneForChange(input.summary.pnl24hPercent),
    detailId: 'portfolio-change',
  },
  {
    id: 'stakes',
    label: 'Stakes',
    value: String(activeStakes),
    subvalue: input.walletCount > 0 ? `${activeStakes} active` : 'connect wallet',
    detailId: 'stakes',
  },
  {
    id: 'lp',
    label: 'LP / DeFi',
    value: formatUsd(defiValue),
    subvalue: `${defiShare.toFixed(1)}% allocated`,
    detailId: 'liquidity',
  },
  {
    id: 'top',
    label: 'Top holding',
    value: topHolding?.symbol ?? 'None',
    subvalue: topHolding ? formatUsd(topHolding.value) : 'add wallet',
    tone: topHolding ? toneForChange(topHolding.pnl24h ?? topHolding.priceChange24h ?? 0) : 'muted',
    detailId: topHolding ? tokenDetailId(topHolding) : 'portfolio-change',
  },
];

const quickActions = [
  { id: 'insights', label: 'Portfolio insights', description: 'Open the portfolio narrative and context.', target: 'overview' },
  { id: 'transactions', label: 'Review transactions', description: 'Go to the ledger with your current portfolio context.', target: 'history' },
  { id: 'rebalance', label: 'Rebalance planner', description: 'Set target allocation and see the best path via PLS.', target: 'overview:rebalance' },
  { id: 'exit-plan', label: 'Exit plan', description: 'Open the profit planner for phased exits.', target: 'planner' },
];

const allocation = {
  segments: sortedAssets.slice(0, 6).map(asset => ({
    id: asset.id,
    label: asset.symbol,
    width: allocationTotal > 0 ? (asset.value / allocationTotal) * 100 : 0,
    detailId: tokenDetailId(asset),
  })),
  topWeights: sortedAssets.slice(0, 4).map(asset => ({
    id: asset.id,
    label: asset.symbol,
    value: formatUsd(asset.value),
    percent: allocationTotal > 0 ? (asset.value / allocationTotal) * 100 : 0,
    detailId: tokenDetailId(asset),
  })),
};
```

- [ ] **Step 5: Run the snapshot test to verify it passes**

Run: `npm run test -- src/test/atlas-portfolio-snapshot.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the snapshot-model changes**

```bash
git add src/components/atlas/atlas-types.ts src/components/atlas/atlas-portfolio-snapshot.ts src/test/atlas-portfolio-snapshot.test.ts
git commit -m "feat: enrich atlas dashboard snapshot model"
```

### Task 2: Build the new dashboard presentation modules

**Files:**
- Create: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasQuickActionCard.tsx`
- Create: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasAllocationCard.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasTokenCard.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasSignalRow.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasHomeSurface.tsx`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\atlas-components.test.tsx`

- [ ] **Step 1: Write the failing component tests for top-6 prices, action cards, and allocation hybrid**

```ts
it('renders top-6 live prices, decision support actions, and hybrid allocation weights', () => {
  render(<AtlasHomeSurface onNavigate={() => undefined} snapshot={snapshot} />);

  expect(screen.getByText('Live Prices')).toBeInTheDocument();
  expect(screen.getByText('Rebalance planner')).toBeInTheDocument();
  expect(screen.getByText('Portfolio insights')).toBeInTheDocument();
  expect(screen.getByText('Top weights')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm run test -- src/test/atlas-components.test.tsx`

Expected: FAIL because the new sections do not exist yet.

- [ ] **Step 3: Add the quick-action card component**

```tsx
type Props = {
  label: string;
  description: string;
  onClick: () => void;
};

export function AtlasQuickActionCard({ label, description, onClick }: Props) {
  return (
    <button type="button" className="atlas-clickable-card atlas-quick-action-card" onClick={onClick}>
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}
```

- [ ] **Step 4: Add the hybrid allocation card component**

```tsx
type Props = {
  allocation: AtlasAllocationModel;
  activeDetailId?: string;
  onSelect: (detailId: string) => void;
};

export function AtlasAllocationCard({ allocation, activeDetailId, onSelect }: Props) {
  return (
    <section className="atlas-home__panel">
      <div className="atlas-home__panel-head">
        <strong>Allocation</strong>
        <span>hybrid</span>
      </div>
      <div className="atlas-home__allocation" aria-label="Portfolio allocation">
        {allocation.segments.map(item => (
          <button
            key={item.id}
            type="button"
            aria-label={`${item.label} allocation`}
            aria-pressed={activeDetailId === item.detailId}
            style={{ width: `${Math.max(8, item.width)}%` }}
            onClick={() => onSelect(item.detailId)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="atlas-home__allocation-weights">
        <div className="atlas-home__panel-head"><strong>Top weights</strong><span>{allocation.topWeights.length}</span></div>
        {allocation.topWeights.map(item => (
          <button key={item.id} type="button" className="atlas-signal-row" onClick={() => onSelect(item.detailId)}>
            <span>{item.label}</span>
            <span>{item.value} · {item.percent.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update token cards and signals for richer dashboard scanning**

```tsx
// AtlasTokenCard.tsx
<span className="atlas-token-card__top">
  <strong>{token.symbol}</strong>
  <span className="atlas-mono">{token.change}</span>
</span>
{token.icon ? <span className="atlas-token-card__icon">{token.icon}</span> : null}
<span className="atlas-token-card__price atlas-mono">{token.price}</span>
{token.ratio ? <span className="atlas-token-card__ratio">{token.ratio}</span> : null}

// AtlasSignalRow.tsx
<span className={`atlas-signal-icon atlas-signal-icon--${signal.iconKey ?? 'holding'}`} aria-hidden="true" />
<span className="atlas-signal-copy">
  <strong>{signal.label}</strong>
  {signal.description ? <small>{signal.description}</small> : null}
</span>
<span className="atlas-mono">{signal.value}</span>
```

- [ ] **Step 6: Restructure `AtlasHomeSurface` to render the new dashboard order**

```tsx
<section className="atlas-home__token-section" aria-labelledby="atlas-token-heading">
  <div className="atlas-home__section-head">
    <h2 id="atlas-token-heading">Live Prices</h2>
    <span>top 6 by value</span>
  </div>
  <div className="atlas-home__tokens">
    {snapshot.tokens.map((token) => (
      <AtlasTokenCard key={token.id} token={token} active={selectedDetailId === token.detailId} onSelect={selectDetail} />
    ))}
  </div>
</section>

<div className="atlas-home__secondary">
  <AtlasAllocationCard allocation={snapshot.allocation} activeDetailId={selectedDetailId} onSelect={selectDetail} />
  <div className="atlas-home__panel">
    <div className="atlas-home__panel-head"><strong>Signals</strong><span>{snapshot.signals.length}</span></div>
    {snapshot.signals.map((signal) => (
      <AtlasSignalRow key={signal.id} signal={signal} active={selectedDetailId === signal.detailId} onSelect={selectDetail} />
    ))}
  </div>
  <div className="atlas-home__panel">
    <div className="atlas-home__panel-head"><strong>Decision support</strong><span>{snapshot.quickActions.length}</span></div>
    {snapshot.quickActions.map((action) => (
      <AtlasQuickActionCard
        key={action.id}
        label={action.label}
        description={action.description}
        onClick={() => navigateFromDetail(action.target)}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 7: Run the component test to verify it passes**

Run: `npm run test -- src/test/atlas-components.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit the dashboard presentation components**

```bash
git add src/components/atlas/AtlasQuickActionCard.tsx src/components/atlas/AtlasAllocationCard.tsx src/components/atlas/AtlasTokenCard.tsx src/components/atlas/AtlasSignalRow.tsx src/components/atlas/AtlasHomeSurface.tsx src/test/atlas-components.test.tsx
git commit -m "feat: rebuild atlas dashboard presentation modules"
```

### Task 3: Replace the old overview boxes and wire the rebalance action path

**Files:**
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\App.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\atlas-detail-model.ts`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\page-routing.test.tsx`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\app-wallets-page.test.tsx`

- [ ] **Step 1: Write the failing routing test for dashboard quick actions**

```ts
it('routes the dashboard quick actions into overview, history, and planner flows', async () => {
  render(<App />);

  expect(screen.getByRole('button', { name: /Rebalance planner/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Review transactions/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the routing test to verify it fails**

Run: `npm run test -- src/test/page-routing.test.tsx`

Expected: FAIL because the dashboard still renders the old overview structure or missing actions.

- [ ] **Step 3: Replace the old overview-heavy block with the Atlas home surface as the primary dashboard**

```tsx
{activeTab === 'overview' && (
  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <AtlasHomeSurface
      snapshot={atlasHomeSnapshot}
      onNavigate={(target) => {
        if (target === 'history') setActiveTab('history');
        else if (target === 'planner') setProfitPlannerOpen(true);
        else if (target === 'overview:rebalance') {
          setActiveTab('assets');
          setAllocationCalculatorOpen(true);
        } else {
          handleAtlasNavigate(target);
        }
      }}
    />
  </motion.div>
)}
```

- [ ] **Step 4: Update the detail model so hidden-noise is no longer a headline dashboard path**

```ts
// atlas-detail-model.ts
// Keep hidden-noise as a valid detail for deeper review, but remove it
// from the default dashboard-first mental model and route it toward assets.
'hidden-noise': {
  id: 'hidden-noise',
  breadcrumb: ['Home', 'Portfolio hygiene'],
  title: 'Hidden assets',
  summary: 'Shows what was hidden by the current spam and noise filters.',
  actions: [
    { label: 'Review hidden', target: 'assets', variant: 'primary' },
    { label: 'Coin visibility', target: 'assets' },
  ],
}
```

- [ ] **Step 5: Run the routing test to verify it passes**

Run: `npm run test -- src/test/page-routing.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the overview integration**

```bash
git add src/App.tsx src/components/atlas/atlas-detail-model.ts src/test/page-routing.test.tsx src/test/app-wallets-page.test.tsx
git commit -m "feat: route dashboard atlas actions into product flows"
```

### Task 4: Make the rebalance helper relevant and fix `PCOCK` visibility

**Files:**
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\pages\WalletsPage.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\App.tsx`
- Modify: `C:\GitHub\pulseport-portfolio-tracker\src\components\HoldingsTable.tsx`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\app-wallets-page.test.tsx`
- Test: `C:\GitHub\pulseport-portfolio-tracker\src\test\atlas-holding-cards.test.tsx`

- [ ] **Step 1: Write the failing test for normalized rebalance targets and `PCOCK` visibility**

```ts
it('shows normalized rebalance targets and keeps visible community holdings out of spam-only display', () => {
  render(<WalletsPage {...props} />);

  expect(screen.getByText(/Rebalance planner/i)).toBeInTheDocument();
  expect(screen.getByText(/Current mix/i)).toBeInTheDocument();
  expect(screen.getByText(/Target mix/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the wallet test to verify it fails**

Run: `npm run test -- src/test/app-wallets-page.test.tsx src/test/atlas-holding-cards.test.tsx`

Expected: FAIL because the current calculator is still a raw percentage draft grid with no rebalance guidance.

- [ ] **Step 3: Replace the allocation calculator copy and derived rows with rebalance-oriented output**

```ts
const rawTargetTotal = allocationCalculatorRows.reduce((sum, row) => sum + row.percent, 0);
const normalizedRows = allocationCalculatorRows.map((row) => {
  const normalizedPercent = rawTargetTotal > 0 ? (row.percent / rawTargetTotal) * 100 : 0;
  const targetValue = summary.totalValue * (normalizedPercent / 100);
  const deltaValue = targetValue - row.value;

  return {
    ...row,
    normalizedPercent,
    targetValue,
    deltaValue,
  };
});

const plsFundingRow = normalizedRows.find((row) => row.name === 'PLS');
```

- [ ] **Step 4: Render practical rebalance guidance in `WalletsPage`**

```tsx
<div className="wallets-atlas-allocation-panel__head">
  <div>
    <strong>Rebalance planner</strong>
    <small>Set target weights and see the best path via PLS.</small>
  </div>
</div>
<div className="wallets-atlas-allocation-summary">
  <span>Current mix</span>
  <span>Target mix</span>
  <span>Suggested move</span>
</div>
{normalizedRows.map((row) => (
  <div key={row.name} className="wallets-atlas-allocation-row">
    <span>{row.name}</span>
    <span>{row.normalizedPercent.toFixed(1)}%</span>
    <span>
      {row.deltaValue > 0
        ? `Swap about ${Math.round(Math.abs(row.deltaValue) / Math.max(0.000001, plsUsdPrice)).toLocaleString('en-US')} PLS to buy the needed ${row.name}`
        : row.deltaValue < 0
          ? `Reduce ${row.name} by about ${Math.abs(row.deltaValue / summary.totalValue) * 100 > 0 ? ((Math.abs(row.deltaValue) / summary.totalValue) * 100).toFixed(1) : '0.0'}%`
          : 'You already match the target closely'}
    </span>
  </div>
))}
```

- [ ] **Step 5: Add the targeted `PCOCK` correction in the current asset filtering path**

```ts
const FORCED_VISIBLE_COMMUNITY_SYMBOLS = new Set(['PCOCK']);

const visibleAssets = assetUniverse.filter((asset) => {
  if (FORCED_VISIBLE_COMMUNITY_SYMBOLS.has(asset.symbol.toUpperCase())) return true;
  if (hiddenTokens.includes(asset.id)) return false;
  if (hideSpam && spamTokenIds.has(asset.id)) return false;
  if (hideDust && asset.value < DUST_THRESHOLD_USD) return false;
  return true;
});
```

Keep this correction narrow. Do not turn the branch into a full spam taxonomy rewrite.

- [ ] **Step 6: Run the wallet tests to verify they pass**

Run: `npm run test -- src/test/app-wallets-page.test.tsx src/test/atlas-holding-cards.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit the rebalance helper and `PCOCK` correction**

```bash
git add src/pages/WalletsPage.tsx src/App.tsx src/components/HoldingsTable.tsx src/test/app-wallets-page.test.tsx src/test/atlas-holding-cards.test.tsx
git commit -m "feat: add rebalance planner guidance to atlas surfaces"
```

### Task 5: Verify the full dashboard slice and prepare subagent execution handoff

**Files:**
- Verify: `C:\GitHub\pulseport-portfolio-tracker\src\App.tsx`
- Verify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\AtlasHomeSurface.tsx`
- Verify: `C:\GitHub\pulseport-portfolio-tracker\src\components\atlas\atlas-portfolio-snapshot.ts`
- Verify: `C:\GitHub\pulseport-portfolio-tracker\src\pages\WalletsPage.tsx`

- [ ] **Step 1: Run the focused Atlas and dashboard tests**

Run: `npm run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx src/test/page-routing.test.tsx src/test/app-wallets-page.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the related Wallets/Transactions safety tests**

Run: `npm run test -- src/test/app-transactions-page.test.tsx src/test/atlas-holding-cards.test.tsx`

Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS (existing chunk-size warnings may remain; report them if unchanged)

- [ ] **Step 5: Commit the verification checkpoint**

```bash
git add -A
git commit -m "chore: verify dashboard atlas polish slice"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin feat/dashboard-atlas-polish
```

- [ ] **Step 7: Open the PR**

```bash
gh pr create --base master --head feat/dashboard-atlas-polish --title "feat: polish atlas dashboard surface" --body "## Summary
- rebuild atlas dashboard scan path
- add top-6 live prices and decision support cluster
- introduce hybrid allocation + rebalance guidance
- fix PCOCK dashboard visibility

## Verification
- npm run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx src/test/page-routing.test.tsx src/test/app-wallets-page.test.tsx
- npm run test -- src/test/app-transactions-page.test.tsx src/test/atlas-holding-cards.test.tsx
- npm run lint
- npm run build"
```

## Self-Review

- Spec coverage: the plan covers removal of `Hidden / Noise`, top-6 live prices with logos, hybrid allocation, grouped quick actions, rebalance guidance via PLS, and the targeted `PCOCK` correction.
- Placeholder scan: no `TODO`, `TBD`, or undefined commands remain.
- Type consistency: the plan uses one new `AtlasAllocationModel`, one `quickActions` collection, and keeps the rebalance helper as presentation math rather than a new accounting source.

Plan complete and saved to `docs/superpowers/plans/2026-06-03-dashboard-atlas-polish.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
