# Atlas Token Intelligence Design

## Goal

Make the dashboard easier to scan while giving each token card a useful drill-down. The experience should remain compact and calm: more information is available through progressive disclosure rather than added dashboard density.

## Dashboard Token Cards

The `Your tokens` section shows more holdings than the current four-card limit. Cards remain ordered by portfolio value and use the existing responsive grid.

Each token card shows:

- Token logo with a letter fallback
- Symbol
- Current portfolio value
- 24h change
- Compact secondary context such as token balance or cost-basis status

Every card remains clickable and opens the exact token detail drawer.

## Allocation

Replace the segmented allocation strip with a ranked allocation list.

Each row shows:

- Token logo and symbol
- Horizontal value bar
- Portfolio percentage
- Current USD value

Rows are ordered by portfolio value. Show the leading holdings and group the remainder as `Other` when needed. Allocation rows are clickable and open the matching token detail drawer.

## Token Detail Drawer

The token drawer uses progressive disclosure and opens from token cards and allocation rows.

The summary header shows:

- Logo, token name, symbol, and chain
- Current portfolio value
- Token balance
- 24h change

The cost-basis section shows:

- Initial USD used for recorded purchases
- Initial PLS used for recorded purchases
- Purchased token amount
- Average purchase price
- Unrealized PnL in USD and percent
- Performance compared with holding the initial PLS amount

The activity section shows the latest recorded trade:

- Trade type
- Date
- Token amount
- USD value
- PLS value when available
- Explorer link

The drawer ends with `Token page` and `Transactions` actions.

## Cost-Basis Rules

Cost basis is derived only from recorded swap transactions.

Tokens received through transfers are excluded from purchase cost basis and shown as `Transferred in`. If recorded history is incomplete, values are labeled `Estimated`. If no defensible value can be calculated, show `Not available yet`.

The UI must not invent cost basis, PnL, or PLS values from missing history.

## Data Flow

Extend the Atlas portfolio snapshot builder to create wallet-aware token detail records from assets, transactions, prices, and the current PLS price.

The snapshot provides presentation-ready drawer fields. React components render the fields and do not reproduce accounting calculations.

## Testing

Add focused tests for:

- More than four token cards with logo support and fallback
- Ranked allocation rows and `Other` grouping
- Allocation row click behavior
- Swap-derived cost basis
- `Transferred in` handling
- Estimated and unavailable states
- Last-trade rendering and explorer action

Keep the existing accessibility and exact product-routing tests passing.
