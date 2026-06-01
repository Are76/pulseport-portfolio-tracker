# Atlas Token Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Atlas dashboard with logo-backed token cards, ranked allocation bars, and an honest token-intelligence drawer derived from recorded portfolio history.

**Architecture:** Keep `AtlasHomeSurface` presentation-focused. Add a pure token-intelligence model that converts assets, normalized transactions, and the PLS price into presentation-ready token details. Extend the existing Atlas snapshot builder to compose those details, while the drawer renders structured sections without reproducing accounting logic.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Vite

---

## Roadmap Position

This plan is the expanded implementation of the earlier roadmap's Branch 2, `ui/atlas-token-holdings-cards`.

Already delivered:

- Branch 1 visual foundation and compact shell
- Clickable Atlas cards and exact product routing
- Desktop drawer and accessible mobile detail sheet
- Production mobile navigation polish

Still intentionally separate after this plan:

- Branch 3 stakes and DeFi summary polish
- Branch 5 final accessibility, spacing, overflow, and screenshot review

Before starting this plan, finish and merge the current PR 125 cleanup commit for disabled historical ranges, persisted Etherscan API key handling, and safe Atlas detail lookup.

## File Structure

### Files To Create

- `src/components/atlas/atlas-token-intelligence.ts`: pure cost-basis, transfer-in, PLS comparison, and last-trade derivation.
- `src/test/atlas-token-intelligence.test.ts`: accounting-model regression tests.

### Files To Modify

- `src/types.ts`: keep the existing normalized transaction schema unchanged.
- `src/App.tsx`: provide normalized transactions, PLS price, and resolved token logos to the Atlas snapshot.
- `src/components/atlas/atlas-types.ts`: add logo, allocation row, detail section, and last-trade presentation types.
- `src/components/atlas/atlas-portfolio-snapshot.ts`: show up to eight tokens, create ranked allocation rows, and attach token-intelligence details.
- `src/components/atlas/AtlasTokenCard.tsx`: render token logo with letter fallback and compact secondary context.
- `src/components/atlas/AtlasHomeSurface.tsx`: render ranked allocation rows instead of the segmented strip.
- `src/components/atlas/AtlasDetailPanel.tsx`: render structured cost-basis and activity sections.
- `src/index.css`: token-logo, ranked-allocation, and richer drawer styles.
- `src/test/atlas-portfolio-snapshot.test.ts`: snapshot composition tests.
- `src/test/atlas-components.test.tsx`: rendering, fallback, click, and drawer-detail tests.

## Accounting Rules

- A recorded swap where `tx.asset` matches the held token adds purchased quantity and cost basis.
- A recorded swap where `tx.counterAsset` matches the held token reduces the tracked purchased quantity proportionally.
- A deposit matching the token is reported as `Transferred in` and never added to purchase cost basis.
- `Initial PLS` is shown only when recorded purchases spent `PLS` or `WPLS`.
- Values are labeled `Estimated` when recorded swaps are usable but incomplete.
- Values become `Not available yet` when there is no defensible recorded value.
- PnL covers the tracked purchased quantity only. It must not imply that transferred-in tokens were purchased.

---

### Task 1: Token Intelligence Model

**Files:**
- Create: `src/components/atlas/atlas-token-intelligence.ts`
- Create: `src/test/atlas-token-intelligence.test.ts`

- [ ] **Step 1: Write failing model tests**

Create tests covering a direct PLS purchase, a transfer-in, a missing-history asset, and a later sale:

```ts
import { describe, expect, it } from 'vitest';
import { buildAtlasTokenIntelligence } from '../components/atlas/atlas-token-intelligence';
import type { Asset, Transaction } from '../types';

const plsx: Asset = {
  id: 'plsx',
  symbol: 'PLSX',
  name: 'PulseX',
  balance: 1_000,
  price: 0.02,
  value: 20,
  chain: 'pulsechain',
};

const buy: Transaction = {
  id: 'buy',
  hash: '0xbuy',
  timestamp: 100,
  type: 'swap',
  from: '0xwallet',
  to: '0xrouter',
  asset: 'PLSX',
  amount: 1_000,
  valueUsd: 10,
  chain: 'pulsechain',
  counterAsset: 'PLS',
  counterAmount: 2_000_000,
};

describe('atlas token intelligence', () => {
  it('derives direct-PLS cost basis and purchased-token PnL', () => {
    expect(buildAtlasTokenIntelligence(plsx, [buy], 0.000005)).toMatchObject({
      costBasisStatus: 'estimated',
      purchasedAmount: 1_000,
      initialUsd: 10,
      initialPls: 2_000_000,
      averagePurchasePriceUsd: 0.01,
      unrealizedPnlUsd: 10,
      transferredInAmount: 0,
      lastTrade: { hash: '0xbuy', type: 'Bought' },
    });
  });

  it('reports transferred-in tokens without inventing cost basis', () => {
    const deposit: Transaction = { ...buy, id: 'deposit', hash: '0xdeposit', type: 'deposit', amount: 400 };
    const detail = buildAtlasTokenIntelligence(plsx, [deposit], 0.000005);
    expect(detail.transferredInAmount).toBe(400);
    expect(detail.costBasisStatus).toBe('unavailable');
    expect(detail.initialUsd).toBeUndefined();
  });

  it('reduces tracked purchased quantity after a sale', () => {
    const sale: Transaction = {
      ...buy,
      id: 'sale',
      hash: '0xsale',
      timestamp: 200,
      asset: 'PLS',
      amount: 1_200_000,
      counterAsset: 'PLSX',
      counterAmount: 200,
      valueUsd: 6,
    };
    expect(buildAtlasTokenIntelligence(plsx, [buy, sale], 0.000005)).toMatchObject({
      purchasedAmount: 800,
      initialUsd: 8,
      initialPls: 1_600_000,
      unrealizedPnlUsd: 8,
      lastTrade: { hash: '0xsale', type: 'Sold' },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-token-intelligence.test.ts
```

Expected: FAIL because `buildAtlasTokenIntelligence` does not exist.

- [ ] **Step 3: Implement the pure model**

Create `src/components/atlas/atlas-token-intelligence.ts` with:

```ts
import type { Asset, Transaction } from '../../types';

export type AtlasCostBasisStatus = 'estimated' | 'unavailable';

export type AtlasLastTrade = {
  hash: string;
  explorerUrl: string;
  timestamp: number;
  type: 'Bought' | 'Sold';
  tokenAmount: number;
  usdValue?: number;
  plsValue?: number;
};

export type AtlasTokenIntelligence = {
  costBasisStatus: AtlasCostBasisStatus;
  purchasedAmount: number;
  transferredInAmount: number;
  initialUsd?: number;
  initialPls?: number;
  averagePurchasePriceUsd?: number;
  unrealizedPnlUsd?: number;
  unrealizedPnlPercent?: number;
  versusHoldingPlsUsd?: number;
  lastTrade?: AtlasLastTrade;
};

function sameSymbol(value: string | undefined, symbol: string): boolean {
  return value?.toUpperCase() === symbol.toUpperCase();
}

function isPls(value: string | undefined): boolean {
  return value?.toUpperCase() === 'PLS' || value?.toUpperCase() === 'WPLS';
}

function explorerUrl(tx: Transaction): string {
  if (tx.chain === 'pulsechain') return `https://scan.pulsechain.com/tx/${tx.hash}`;
  if (tx.chain === 'base') return `https://basescan.org/tx/${tx.hash}`;
  return `https://etherscan.io/tx/${tx.hash}`;
}

export function buildAtlasTokenIntelligence(
  asset: Asset,
  transactions: Transaction[],
  plsPriceUsd: number,
): AtlasTokenIntelligence {
  let purchasedAmount = 0;
  let initialUsd = 0;
  let initialPls = 0;
  let transferredInAmount = 0;
  let lastTrade: AtlasLastTrade | undefined;

  [...transactions].sort((a, b) => a.timestamp - b.timestamp).forEach((tx) => {
    if (tx.chain !== asset.chain) return;
    if (tx.type === 'deposit' && sameSymbol(tx.asset, asset.symbol)) {
      transferredInAmount += tx.amount;
      return;
    }
    if (tx.type !== 'swap') return;

    if (sameSymbol(tx.asset, asset.symbol)) {
      purchasedAmount += tx.amount;
      initialUsd += tx.valueUsd ?? 0;
      if (isPls(tx.counterAsset)) initialPls += tx.counterAmount ?? 0;
      lastTrade = { hash: tx.hash, explorerUrl: explorerUrl(tx), timestamp: tx.timestamp, type: 'Bought', tokenAmount: tx.amount, usdValue: tx.valueUsd, plsValue: isPls(tx.counterAsset) ? tx.counterAmount : undefined };
      return;
    }

    if (sameSymbol(tx.counterAsset, asset.symbol) && purchasedAmount > 0) {
      const soldAmount = Math.min(purchasedAmount, tx.counterAmount ?? 0);
      const remainingRatio = (purchasedAmount - soldAmount) / purchasedAmount;
      purchasedAmount -= soldAmount;
      initialUsd *= remainingRatio;
      initialPls *= remainingRatio;
      lastTrade = { hash: tx.hash, explorerUrl: explorerUrl(tx), timestamp: tx.timestamp, type: 'Sold', tokenAmount: soldAmount, usdValue: tx.valueUsd };
    }
  });

  if (purchasedAmount <= 0 || initialUsd <= 0) {
    return { costBasisStatus: 'unavailable', purchasedAmount, transferredInAmount, lastTrade };
  }

  const trackedHoldingAmount = Math.min(purchasedAmount, asset.balance);
  const trackedCostRatio = trackedHoldingAmount / purchasedAmount;
  purchasedAmount = trackedHoldingAmount;
  initialUsd *= trackedCostRatio;
  initialPls *= trackedCostRatio;
  const currentPurchasedValue = purchasedAmount * asset.price;
  const unrealizedPnlUsd = currentPurchasedValue - initialUsd;
  return {
    costBasisStatus: 'estimated',
    purchasedAmount,
    transferredInAmount,
    initialUsd,
    initialPls: initialPls > 0 ? initialPls : undefined,
    averagePurchasePriceUsd: initialUsd / purchasedAmount,
    unrealizedPnlUsd,
    unrealizedPnlPercent: initialUsd > 0 ? (unrealizedPnlUsd / initialUsd) * 100 : undefined,
    versusHoldingPlsUsd: initialPls > 0 && plsPriceUsd > 0 ? currentPurchasedValue - initialPls * plsPriceUsd : undefined,
    lastTrade,
  };
}
```

- [ ] **Step 4: Run model tests**

Run:

```powershell
npm.cmd run test -- src/test/atlas-token-intelligence.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/atlas/atlas-token-intelligence.ts src/test/atlas-token-intelligence.test.ts
git commit -m "Add Atlas token intelligence model"
```

---

### Task 2: Expanded Token Snapshot With Logos

**Files:**
- Modify: `src/components/atlas/atlas-types.ts`
- Modify: `src/components/atlas/atlas-portfolio-snapshot.ts`
- Modify: `src/App.tsx`
- Modify: `src/test/atlas-portfolio-snapshot.test.ts`

- [ ] **Step 1: Write failing snapshot tests**

Extend `src/test/atlas-portfolio-snapshot.test.ts`:

```ts
it('shows up to eight logo-backed token cards', () => {
  const manyAssets = Array.from({ length: 9 }, (_, index) => ({
    ...assets[0],
    id: `token-${index}`,
    symbol: `T${index}`,
    value: 100 - index,
    logoUrl: `https://example.com/${index}.png`,
  }));
  const snapshot = buildAtlasHomeSnapshot({
    summary: { totalValue: 900, pnl24h: 0, pnl24hPercent: 0 },
    walletCount: 1,
    assets: manyAssets,
    stakes: [],
    transactions: [],
    plsPriceUsd: 0.000005,
    hiddenTokenCount: 0,
  });
  expect(snapshot.tokens).toHaveLength(8);
  expect(snapshot.tokens[0].logoUrl).toBe('https://example.com/0.png');
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts
```

Expected: FAIL because only four cards are returned and logo data is not mapped.

- [ ] **Step 3: Extend snapshot input and token-card types**

In `atlas-types.ts`, add `logoUrl?: string` and `secondaryText?: string` to `AtlasTokenCardData`.

In `atlas-portfolio-snapshot.ts`:

- Import `Transaction`.
- Add `transactions: Transaction[]` and `plsPriceUsd: number` to `AtlasSnapshotInput`.
- Change `MAX_TOKENS` from `4` to `8`.
- Map `asset.logoUrl` into token cards.
- Build `secondaryText` from token-intelligence state: `Transferred in`, `Estimated cost basis`, or token balance.

In `App.tsx`, provide locally available resolved logos before calling the snapshot. Do not call the later-declared `getTokenLogoUrl` helper from this earlier render section:

```tsx
const atlasAssets = useMemo(
  () => currentAssets.map((asset) => {
    const address = asset.address?.toLowerCase() ?? '';
    return {
      ...asset,
      logoUrl: STATIC_LOGOS[address] || asset.logoUrl || tokenLogos[address],
    };
  }),
  [currentAssets, tokenLogos],
);

const atlasHomeSnapshot = useMemo(() => buildAtlasHomeSnapshot({
  summary,
  walletCount: wallets.length,
  assets: atlasAssets,
  transactions: currentTransactions,
  plsPriceUsd: prices['pulsechain']?.usd ?? 0,
  stakes: currentStakes,
  lpPositions,
  farmPositions,
  hiddenTokenCount: hiddenTokens.length,
}), [summary, wallets.length, atlasAssets, currentTransactions, prices, currentStakes, lpPositions, farmPositions, hiddenTokens.length]);
```

- [ ] **Step 4: Verify snapshot tests**

Run:

```powershell
npm.cmd run test -- src/test/atlas-token-intelligence.test.ts src/test/atlas-portfolio-snapshot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx src/components/atlas/atlas-types.ts src/components/atlas/atlas-portfolio-snapshot.ts src/test/atlas-portfolio-snapshot.test.ts
git commit -m "Expand Atlas token snapshot with logos"
```

---

### Task 3: Ranked Allocation Bars

**Files:**
- Modify: `src/components/atlas/atlas-types.ts`
- Modify: `src/components/atlas/atlas-portfolio-snapshot.ts`
- Modify: `src/components/atlas/AtlasHomeSurface.tsx`
- Modify: `src/index.css`
- Modify: `src/test/atlas-portfolio-snapshot.test.ts`
- Modify: `src/test/atlas-components.test.tsx`

- [ ] **Step 1: Write failing allocation tests**

Using a fixture with at least six positive holdings, add tests that assert:

```ts
expect(snapshot.allocation[0]).toMatchObject({
  label: 'PLSX',
  value: '$80.00',
  percentage: 53.33,
  logoUrl: undefined,
  detailId: 'token:plsx',
});
expect(snapshot.allocation.at(-1)).toMatchObject({ id: 'other', label: 'Other', detailId: undefined });
```

Add a component test that clicks the first ranked allocation button and expects the matching token drawer title.

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
```

Expected: FAIL because allocation rows do not expose USD value, percentage, logo, or `Other`.

- [ ] **Step 3: Replace allocation segment data**

Extend `AtlasAllocationItem`:

```ts
export type AtlasAllocationItem = {
  id: string;
  label: string;
  value: string;
  percentage: number;
  logoUrl?: string;
  detailId?: string;
};
```

In `atlas-portfolio-snapshot.ts`, return the five leading holdings plus one `Other` row when additional holdings remain.

In `AtlasHomeSurface.tsx`, replace the segmented strip with ranked rows. Render actual holdings as buttons and render `Other` as a non-interactive row.

- [ ] **Step 4: Add ranked-list CSS**

Add stable row tracks, 22px logos, horizontal bars, percentages, USD values, hover state, focus-visible outline, and responsive stacking in `src/index.css`.

- [ ] **Step 5: Verify**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/atlas/atlas-types.ts src/components/atlas/atlas-portfolio-snapshot.ts src/components/atlas/AtlasHomeSurface.tsx src/index.css src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
git commit -m "Replace Atlas allocation strip with ranked bars"
```

---

### Task 4: Rich Token Detail Drawer

**Files:**
- Modify: `src/components/atlas/atlas-types.ts`
- Modify: `src/components/atlas/atlas-portfolio-snapshot.ts`
- Modify: `src/components/atlas/AtlasDetailPanel.tsx`
- Modify: `src/index.css`
- Modify: `src/test/atlas-components.test.tsx`
- Modify: `src/test/atlas-portfolio-snapshot.test.ts`

- [ ] **Step 1: Write failing drawer tests**

Add snapshot and rendering expectations for:

```ts
expect(snapshot.details['token:plsx']).toMatchObject({
  title: 'PLSX',
  sections: [
    { title: 'Cost basis' },
    { title: 'Performance' },
    { title: 'Last trade' },
  ],
});
```

Render the home surface with the snapshot, click the PLSX token card, and assert the dialog contains:

```ts
expect(screen.getByText('Initial USD')).toBeInTheDocument();
expect(screen.getByText('Initial PLS')).toBeInTheDocument();
expect(screen.getByText('Transferred in')).toBeInTheDocument();
expect(screen.getByText('Estimated')).toBeInTheDocument();
expect(screen.getByText('Last trade')).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
```

Expected: FAIL because structured detail sections are not rendered.

- [ ] **Step 3: Extend detail presentation types**

In `atlas-types.ts`, extend the existing `AtlasFact` type with `href` and add:

```ts
export type AtlasDetailSection = {
  title: string;
  facts: AtlasFact[];
};

export type AtlasFact = {
  label: string;
  value: string;
  tone?: AtlasTone;
  href?: string;
};

export type AtlasDetailContent = {
  id: string;
  breadcrumb: string[];
  title: string;
  summary: string;
  logoUrl?: string;
  facts: AtlasFact[];
  sections?: AtlasDetailSection[];
  actions: AtlasAction[];
};
```

- [ ] **Step 4: Compose honest detail sections**

In `atlas-portfolio-snapshot.ts`, call `buildAtlasTokenIntelligence` for each visible token and create:

- `Cost basis`: Initial USD, Initial PLS, purchased amount, average purchase price, transferred-in amount
- `Performance`: unrealized PnL, PnL percentage, versus holding PLS
- `Last trade`: type, date, amount, USD value, PLS value, explorer URL

Use `Estimated` in the summary when cost basis is partial. Use `Not available yet` for missing values.

- [ ] **Step 5: Render sections**

In `AtlasDetailPanel.tsx`, render `detail.sections` after the existing summary facts. Render facts with `href` as external anchors using `target="_blank"` and `rel="noopener noreferrer"`. Keep actions at the bottom so both desktop drawer and mobile sheet receive the richer content.

- [ ] **Step 6: Add drawer CSS**

Add compact section headings, two-column fact grids where space permits, mobile single-column fallback, logo sizing, and clear muted styling for unavailable values.

- [ ] **Step 7: Verify**

Run:

```powershell
npm.cmd run test -- src/test/atlas-token-intelligence.test.ts src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/components/atlas/atlas-types.ts src/components/atlas/atlas-portfolio-snapshot.ts src/components/atlas/AtlasDetailPanel.tsx src/index.css src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-components.test.tsx
git commit -m "Add rich Atlas token detail drawer"
```

---

### Task 5: Visual And Regression Verification

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/index.css`
- Verify: `src/components/atlas/*`

- [ ] **Step 1: Run focused regression suite**

Run:

```powershell
npm.cmd run test -- src/test/app-api-key.test.tsx src/test/app-shell-style.test.tsx src/test/app-mobile-nav.test.tsx src/test/atlas-components.test.tsx src/test/atlas-detail-model.test.ts src/test/atlas-token-intelligence.test.ts src/test/atlas-portfolio-snapshot.test.ts src/test/atlas-theme-css.test.ts src/test/page-routing.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: commands exit `0`. Report pre-existing Vite bundle-size and unsupported CSS utility warnings separately if they remain.

- [ ] **Step 3: Verify in browser**

At desktop and mobile widths, verify:

```text
Dashboard -> eight largest tokens render with logo or letter fallback
Dashboard -> allocation list is ranked and easy to scan
Allocation token row -> matching token drawer opens
Token card -> matching token drawer opens
Drawer -> cost basis, transferred-in state, PnL, PLS comparison, and last trade are honest
Drawer -> Token page routes to exact asset
Drawer -> Transactions routes to transaction history
```

- [ ] **Step 4: Commit final polish**

```powershell
git add src
git commit -m "Polish Atlas token intelligence experience"
```
