import React from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Download,
  History as HistoryIcon,
  LayoutDashboard,
  RefreshCcw,
  X,
} from 'lucide-react';

import { TokenPnLCard } from '../components/TokenPnLCard';
import { TransactionList } from '../components/TransactionList';
import type { Asset, Transaction, Wallet } from '../types';

interface PlsFlowSummary {
  rows: Array<unknown>;
  totalReceived: number;
  totalSpent: number;
  totalNet: number;
  netUsd: number;
  plsPrice: number;
}

interface TransactionsPageProps {
  wallets: Wallet[];
  currentAssets: Asset[];
  currentTransactions: Transaction[];
  filteredTransactions: Transaction[];
  txTypeFilter: string;
  setTxTypeFilter: (value: string) => void;
  txAssetFilter: string;
  setTxAssetFilter: (value: string) => void;
  txYearFilter: string;
  setTxYearFilter: (value: string) => void;
  txCoinCategory: string;
  setTxCoinCategory: (value: string) => void;
  onClearFilters: () => void;
  viewAsYou: boolean;
  setViewAsYou: React.Dispatch<React.SetStateAction<boolean>>;
  txCompact: boolean;
  setTxCompact: React.Dispatch<React.SetStateAction<boolean>>;
  onExportCsv: () => void;
  transactionsCollapsed: boolean;
  onToggleTransactionsCollapsed: () => void;
  hiddenTxIds: string[];
  onToggleHiddenTx: (id: string) => void;
  showHiddenTxs: boolean;
  onToggleShowHiddenTxs: () => void;
  onClearHiddenTxs: () => void;
  tokenLogos: Record<string, string>;
  getTokenLogoUrl: (asset: Asset) => string;
  plsSwapData: PlsFlowSummary;
  plsFlowCollapsed: boolean;
  onTogglePlsFlowCollapsed: () => void;
  pulseUsdPrice: number;
  isLoading: boolean;
  onSyncSwaps: () => void;
  onOpenOverview: () => void;
  onOpenWallets: () => void;
}

const normalizeAssetSymbol = (symbol: string, chain?: string): string => {
  const upper = (symbol || '').toUpperCase();
  return chain === 'pulsechain' && upper === 'WPLS' ? 'PLS' : upper;
};

const sameAssetSymbol = (left: string, right: string, chain?: string): boolean =>
  normalizeAssetSymbol(left, chain) === normalizeAssetSymbol(right, chain);

const formatSignedUsd = (value: number) => `${value < 0 ? '-' : value > 0 ? '+' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toLocaleString('en-US', { maximumFractionDigits: 0 });

function fmtTokenPrice(value: number) {
  if (value < 0.001) return value.toExponential(2);
  if (value < 1) return value.toFixed(6);
  return value.toFixed(2);
}

function formatCoinCategoryLabel(category: string) {
  switch (category) {
    case 'stablecoins':
      return 'Stablecoins';
    case 'eth_weth':
      return 'ETH/WETH';
    case 'hex':
      return 'HEX/eHEX';
    case 'pls_wpls':
      return 'PLS/WPLS';
    case 'bridged':
      return 'Bridged';
    default:
      return category;
  }
}

export function TransactionsPage({
  wallets,
  currentAssets,
  currentTransactions,
  filteredTransactions,
  txTypeFilter,
  setTxTypeFilter,
  txAssetFilter,
  setTxAssetFilter,
  txYearFilter,
  setTxYearFilter,
  txCoinCategory,
  setTxCoinCategory,
  onClearFilters,
  viewAsYou,
  setViewAsYou,
  txCompact,
  setTxCompact,
  onExportCsv,
  transactionsCollapsed,
  onToggleTransactionsCollapsed,
  hiddenTxIds,
  onToggleHiddenTx,
  showHiddenTxs,
  onToggleShowHiddenTxs,
  onClearHiddenTxs,
  tokenLogos,
  getTokenLogoUrl,
  plsSwapData,
  plsFlowCollapsed,
  onTogglePlsFlowCollapsed,
  pulseUsdPrice,
  isLoading,
  onSyncSwaps,
  onOpenOverview,
  onOpenWallets,
}: TransactionsPageProps) {
  const txAssetOptions = Array.from(
    new Set(
      currentTransactions
        .filter(tx => tx.chain === 'pulsechain')
        .flatMap(tx => [tx.asset, tx.counterAsset].filter(Boolean) as string[]),
    ),
  )
    .sort()
    .map(asset => [asset, asset] as [string, string]);

  const tokenFilterMatches = txAssetFilter === 'all'
    ? []
    : currentTransactions.filter(tx =>
        sameAssetSymbol(tx.asset, txAssetFilter, tx.chain) ||
        sameAssetSymbol(tx.counterAsset ?? '', txAssetFilter, tx.chain),
      );
  const preferredAssetChain = (() => {
    const txChains = Array.from(new Set(tokenFilterMatches.map(tx => tx.chain)));
    if (txChains.length === 1) return txChains[0];

    const exactSymbolMatches = currentAssets.filter(asset => sameAssetSymbol(asset.symbol, txAssetFilter, asset.chain));
    if (txChains.length > 1) {
      const heldChainsInLedger = exactSymbolMatches
        .map(asset => asset.chain)
        .filter((chain, index, list) => list.indexOf(chain) === index && txChains.includes(chain));
      return heldChainsInLedger.length === 1 ? heldChainsInLedger[0] : undefined;
    }

    return exactSymbolMatches.length === 1 ? exactSymbolMatches[0]?.chain : undefined;
  })();

  const filteredAsset = txAssetFilter === 'all'
    ? undefined
    : preferredAssetChain
      ? currentAssets.find(asset => sameAssetSymbol(asset.symbol, txAssetFilter, asset.chain) && asset.chain === preferredAssetChain)
      : currentAssets.find(asset => sameAssetSymbol(asset.symbol, txAssetFilter, asset.chain));
  const tokenPrice = filteredAsset?.price ?? 0;
  const logoUrl = filteredAsset ? getTokenLogoUrl(filteredAsset) : undefined;
  const allTokenTxs = txAssetFilter === 'all'
    ? []
    : tokenFilterMatches.filter(tx => !preferredAssetChain || tx.chain === preferredAssetChain);
  const receivedValue = filteredTransactions
    .filter(tx => tx.type === 'deposit')
    .reduce((sum, tx) => sum + (tx.valueUsd ?? 0), 0);
  const sentValue = filteredTransactions
    .filter(tx => tx.type === 'withdraw')
    .reduce((sum, tx) => sum + (tx.valueUsd ?? 0), 0);
  const swapCount = filteredTransactions.filter(tx => tx.type === 'swap').length;
  const chainsActive = new Set(filteredTransactions.map(tx => tx.chain)).size;
  const activeFilterChips = [
    txTypeFilter !== 'all'
      ? { key: 'type', label: txTypeFilter === 'deposit' ? 'Received' : txTypeFilter === 'withdraw' ? 'Sent' : 'Swaps', clear: () => setTxTypeFilter('all') }
      : null,
    txAssetFilter !== 'all'
      ? { key: 'asset', label: txAssetFilter, clear: () => setTxAssetFilter('all') }
      : null,
    txYearFilter !== 'all'
      ? { key: 'year', label: txYearFilter, clear: () => setTxYearFilter('all') }
      : null,
    txCoinCategory !== 'all'
      ? { key: 'category', label: formatCoinCategoryLabel(txCoinCategory), clear: () => setTxCoinCategory('all') }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  return (
    <div className="transaction-page-shell space-y-4">
      <div
        className="transaction-page-head"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="transaction-page-kicker">PulseChain activity</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', marginBottom: 2 }}>Transaction</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Swaps, received, and sent activity for tracked PulseChain wallets.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={onOpenOverview}>
            <LayoutDashboard size={14} />
            Dashboard
          </button>
          <button className="btn-ghost" onClick={onOpenWallets}>
            <ArrowRightLeft size={14} />
            Wallets
          </button>
        </div>
      </div>

      <section className="wallets-atlas-panel" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="wallets-atlas-section-title">Ledger overview</div>
            <div className="wallets-atlas-section-meta">Live transaction context, export controls, and filter-aware activity summaries.</div>
          </div>
          <button className="btn-ghost" onClick={onSyncSwaps} disabled={isLoading}>
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Syncing' : 'Refresh ledger'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'Transactions', value: filteredTransactions.length.toLocaleString('en-US'), sub: `${wallets.length} tracked wallets`, color: 'var(--atlas-fg)' },
            { label: 'Hidden rows', value: hiddenTxIds.length.toLocaleString('en-US'), sub: showHiddenTxs ? 'Hidden rows visible' : 'Hidden rows tucked away', color: 'var(--atlas-fg)' },
            { label: 'Token filter', value: txAssetFilter === 'all' ? 'All assets' : txAssetFilter, sub: txCoinCategory === 'all' ? 'All categories' : txCoinCategory, color: 'var(--atlas-accent)' },
            { label: 'PLS reference', value: `$${fmtTokenPrice(pulseUsdPrice || 0)}`, sub: 'Native pricing anchor', color: 'var(--atlas-fg)' },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'grid',
                gap: 5,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{card.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'Received value', value: `$${receivedValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'Filtered transfer inflow', color: 'var(--positive)' },
            { label: 'Sent value', value: `$${sentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'Filtered transfer outflow', color: sentValue > 0 ? 'var(--negative)' : 'var(--atlas-fg)' },
            { label: 'Swap count', value: swapCount.toLocaleString('en-US'), sub: 'Token-for-token events', color: 'var(--atlas-fg)' },
            { label: 'Chains active', value: chainsActive.toLocaleString('en-US'), sub: 'Chains in current result set', color: 'var(--atlas-accent)' },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'grid',
                gap: 5,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="tx-module-card">
        <div className="tx-module-header" style={{ borderBottom: transactionsCollapsed ? 'none' : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            <HistoryIcon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Transaction</span>
            <span style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>PulseChain</span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{filteredTransactions.length} tx</span>
          </div>
          <div className="transaction-toolbar">
            <button type="button" className={`filter-pill${viewAsYou ? ' active' : ''}`} onClick={() => setViewAsYou(v => !v)}>
              View as You
            </button>
            <button type="button" className={`filter-pill${txCompact ? ' active' : ''}`} onClick={() => setTxCompact(v => !v)}>
              Compact
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="history-csv-btn"
              style={{ padding: '5px 10px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={onToggleTransactionsCollapsed}
              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', flexShrink: 0 }}
              title={transactionsCollapsed ? 'Expand' : 'Collapse'}
            >
              {transactionsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>
        {!transactionsCollapsed && (
          <>
            <div className="tx-filter-row history-filter-row" style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {([
                { ariaLabel: 'Transaction type filter', value: txTypeFilter, onChange: setTxTypeFilter, options: [['all', 'All Types'], ['deposit', 'Received'], ['withdraw', 'Sent'], ['swap', 'Swaps']] as [string, string][] },
                { ariaLabel: 'Transaction asset filter', value: txAssetFilter, onChange: setTxAssetFilter, options: [['all', 'All Tokens'], ...txAssetOptions] as [string, string][] },
                { ariaLabel: 'Transaction year filter', value: txYearFilter, onChange: setTxYearFilter, options: [['all', 'All Years'], ['2026', '2026'], ['2025', '2025'], ['2024', '2024'], ['2023', '2023'], ['2022', '2022'], ['2021', '2021']] as [string, string][] },
                { ariaLabel: 'Transaction coin category filter', value: txCoinCategory, onChange: setTxCoinCategory, options: [['all', 'All Coins'], ['stablecoins', 'Stablecoins'], ['eth_weth', 'ETH/WETH'], ['hex', 'HEX/eHEX'], ['pls_wpls', 'PLS/WPLS'], ['bridged', 'Bridged']] as [string, string][] },
              ]).map(({ ariaLabel, value, onChange, options }) => (
                <select
                  key={options[0][1]}
                  aria-label={ariaLabel}
                  value={value}
                  onChange={event => onChange(event.target.value)}
                  className="history-filter-select"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}
                >
                  {options.map(([optionValue, label]) => (
                    <option key={optionValue} value={optionValue}>
                      {label}
                    </option>
                  ))}
                </select>
              ))}
              <button
                onClick={onClearFilters}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 8px', textDecoration: 'underline' }}
              >
                Clear all
              </button>
            </div>
            {activeFilterChips.length > 0 && (
              <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activeFilterChips.map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    className="filter-chip"
                    onClick={chip.clear}
                  >
                    {chip.label}
                    <span className="chip-x">x</span>
                  </button>
                ))}
              </div>
            )}
            {hiddenTxIds.length > 0 && (
              <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{hiddenTxIds.length} hidden event{hiddenTxIds.length > 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={onToggleShowHiddenTxs}
                    style={{ fontSize: 12, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showHiddenTxs ? 'Hide hidden rows' : 'Show hidden rows'}
                  </button>
                  <button
                    type="button"
                    onClick={onClearHiddenTxs}
                    style={{ fontSize: 12, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear hidden rows
                  </button>
                </div>
              </div>
            )}
            <div className="custom-scrollbar tx-module-list wallet-tx-list">
              <TransactionList
                transactions={filteredTransactions}
                viewAsYou={viewAsYou}
                wallets={wallets}
                compact={txCompact}
                assets={currentAssets}
                getTokenLogoUrl={getTokenLogoUrl}
                tokenLogos={tokenLogos}
                hideIds={hiddenTxIds}
                onToggleHide={onToggleHiddenTx}
                showHidden={showHiddenTxs}
                onFilterByAsset={symbol => setTxAssetFilter(symbol)}
                emptyMessage="No transactions found for these filters."
              />
            </div>
          </>
        )}
      </div>

      {txAssetFilter !== 'all' && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 10,
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.22)',
            }}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={txAssetFilter}
                style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }}
                onError={event => {
                  (event.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              Filtering by <span style={{ color: '#a78bfa' }}>{txAssetFilter}</span>
            </span>
            {filteredAsset && (
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 4 }}>
                - {filteredAsset.chain === 'pulsechain' ? 'PulseChain' : filteredAsset.chain === 'ethereum' ? 'Ethereum' : 'Base'}
                {' '} - ${fmtTokenPrice(tokenPrice)} per token
              </span>
            )}
            <button
              onClick={() => setTxAssetFilter('all')}
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.28)',
                color: '#a78bfa',
              }}
            >
              Clear filter <X size={11} />
            </button>
          </div>
          <TokenPnLCard
            symbol={txAssetFilter}
            transactions={allTokenTxs}
            asset={filteredAsset}
            priceUsd={tokenPrice}
            plsPriceUsd={pulseUsdPrice}
            logoUrl={logoUrl}
            onSyncSwaps={onSyncSwaps}
            isSyncing={isLoading}
          />
        </>
      )}

      {plsSwapData.rows.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: plsFlowCollapsed ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>PLS Flow</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>Net PLS movement across all wallets</div>
            </div>
            <button
              onClick={onTogglePlsFlowCollapsed}
              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)' }}
              title={plsFlowCollapsed ? 'Expand' : 'Collapse'}
            >
              {plsFlowCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
          {!plsFlowCollapsed && (
            <div className="stat-grid-4" style={{ padding: '12px 18px' }}>
              {[
                { label: 'PLS Received', val: fmtCompact(plsSwapData.totalReceived), sub: 'Total inflow', color: 'var(--positive)' },
                { label: 'PLS Spent', val: fmtCompact(plsSwapData.totalSpent), sub: 'Total outflow', color: 'var(--negative)' },
                { label: 'Net PLS', val: `${plsSwapData.totalNet >= 0 ? '+' : ''}${Math.abs(plsSwapData.totalNet) >= 1e6 ? `${(plsSwapData.totalNet / 1e6).toFixed(2)}M` : plsSwapData.totalNet.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'Net balance', color: plsSwapData.totalNet >= 0 ? 'var(--positive)' : 'var(--negative)' },
                { label: 'Net USD', val: formatSignedUsd(plsSwapData.netUsd), sub: `@ $${(plsSwapData.plsPrice || 0).toFixed(6)}/PLS`, color: plsSwapData.netUsd >= 0 ? 'var(--positive)' : 'var(--negative)' },
              ].map(({ label, val, sub, color }) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
