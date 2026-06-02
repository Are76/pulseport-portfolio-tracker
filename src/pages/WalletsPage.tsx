import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Calculator,
  ChevronDown,
  Copy,
  Eye,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCcw,
  Shield,
  Wallet as WalletIcon,
} from 'lucide-react';

import { HoldingsTable } from '../components/HoldingsTable';
import type { Asset, Chain, HexStake, Transaction, Wallet } from '../types';
import type { HoldingDisplayAsset, HoldingSortField } from '../components/HoldingsTable';

type WalletChainFilter = 'all' | 'pulsechain' | 'ethereum' | 'base';
type WalletViewMode = 'combined' | 'per-wallet';

interface HiddenAssetRow extends Asset {}

interface WalletsPageProps {
  wallets: Wallet[];
  selectedWalletAddr: string;
  currentAssets: Asset[];
  currentStakes: HexStake[];
  currentTransactions: Transaction[];
  walletAssets: Record<string, Asset[]>;
  hiddenAssetRows: HiddenAssetRow[];
  hiddenTokens: string[];
  customCoinsCount: number;
  hideDust: boolean;
  hideSpam: boolean;
  isScanning: boolean;
  scanResult: number | null;
  isLoading: boolean;
  walletChainFilter: WalletChainFilter;
  setWalletChainFilter: (value: WalletChainFilter) => void;
  coinVisibilityMenuOpen: boolean;
  setCoinVisibilityMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  priceChangePeriod: '1h' | '6h' | '24h' | '7d';
  setPriceChangePeriod: (value: '1h' | '6h' | '24h' | '7d') => void;
  assetSortField: HoldingSortField;
  assetSortDir: 'asc' | 'desc';
  setAssetSortField: (value: HoldingSortField) => void;
  setAssetSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  expandedAssetIds: Set<string>;
  setExpandedAssetIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  manualEntries: Record<string, number>;
  setManualEntries: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  tokenLogos: Record<string, string>;
  tokenMarketData: Record<string, any>;
  staticLogos: Record<string, string>;
  chainColors: Record<string, string>;
  plsUsdPrice: number;
  totalPortfolioUsd: number;
  summaryLiquidUsd: number;
  summaryStakingUsd: number;
  walletStakingUsdByAddress: Record<string, number>;
  showHiddenCoins: boolean;
  allocationCalculatorOpen: boolean;
  allocationCalculatorRows: Array<{ name: string; percent: number; value: number }>;
  onSelectWallet: (walletAddress: string | null) => void;
  onOpenAddWallet: () => void;
  onOpenRenameWallet: (walletAddress: string, name: string) => void;
  onOpenOverview: () => void;
  onOpenTransactions: () => void;
  onToggleHiddenCoins: () => void;
  onToggleAllocationCalculator: () => void;
  onSetAllocationDraftPercentage: (name: string, value: number) => void;
  onRefreshPortfolio: () => void;
  onOpenCustomCoins: () => void;
  onScanForSpam: () => void;
  onSetHideDust: React.Dispatch<React.SetStateAction<boolean>>;
  onSetHideSpam: React.Dispatch<React.SetStateAction<boolean>>;
  onResetCoinVisibility: () => void;
  onShowEverything: () => void;
  onHideToken: (id: string) => void;
  onUnhideToken: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
  onOpenPnl: (asset: Asset) => void;
  normalizeHoldingAssets: (assets: Asset[]) => HoldingDisplayAsset[];
  getTokenLogoUrl: (asset: Asset) => string;
  explorerUrl: (chain: string, address: string) => string | null;
  dexScreenerUrl: (chain: string, address: string) => string | null;
}

function shortenAddr(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function fmtUsd(value: number, maximumFractionDigits = 0) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits })}`;
}

function fmtPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function fmtPls(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} PLS`;
}

function filterByChain<T extends { chain: Chain }>(items: T[], filter: WalletChainFilter) {
  return filter === 'all' ? items : items.filter(item => item.chain === filter);
}

export function WalletsPage({
  wallets,
  selectedWalletAddr,
  currentAssets,
  currentStakes,
  currentTransactions,
  walletAssets,
  hiddenAssetRows,
  hiddenTokens,
  customCoinsCount,
  hideDust,
  hideSpam,
  isScanning,
  scanResult,
  isLoading,
  walletChainFilter,
  setWalletChainFilter,
  coinVisibilityMenuOpen,
  setCoinVisibilityMenuOpen,
  priceChangePeriod,
  setPriceChangePeriod,
  assetSortField,
  assetSortDir,
  setAssetSortField,
  setAssetSortDir,
  expandedAssetIds,
  setExpandedAssetIds,
  manualEntries,
  setManualEntries,
  tokenLogos,
  tokenMarketData,
  staticLogos,
  chainColors,
  plsUsdPrice,
  totalPortfolioUsd,
  summaryLiquidUsd,
  summaryStakingUsd,
  walletStakingUsdByAddress,
  showHiddenCoins,
  allocationCalculatorOpen,
  allocationCalculatorRows,
  onSelectWallet,
  onOpenAddWallet,
  onOpenRenameWallet,
  onOpenOverview,
  onOpenTransactions,
  onToggleHiddenCoins,
  onToggleAllocationCalculator,
  onSetAllocationDraftPercentage,
  onRefreshPortfolio,
  onOpenCustomCoins,
  onScanForSpam,
  onSetHideDust,
  onSetHideSpam,
  onResetCoinVisibility,
  onShowEverything,
  onHideToken,
  onUnhideToken,
  onSelectAsset,
  onOpenPnl,
  normalizeHoldingAssets,
  getTokenLogoUrl,
  explorerUrl,
  dexScreenerUrl,
}: WalletsPageProps) {
  const [viewMode, setViewMode] = useState<WalletViewMode>('combined');
  const selectedScope = selectedWalletAddr === 'all'
    ? null
    : wallets.find(wallet => wallet.address.toLowerCase() === selectedWalletAddr) ?? null;
  const selectedScopeKey = selectedScope?.address.toLowerCase() ?? null;

  const visibleWalletAssets = selectedScope
    ? (walletAssets[selectedWalletAddr] || [])
    : currentAssets;
  const scopedTransactions = selectedScopeKey
    ? currentTransactions.filter(tx => tx.from === selectedScopeKey || tx.to === selectedScopeKey)
    : currentTransactions;

  const selectedLiquidUsd = visibleWalletAssets.reduce((sum, asset) => sum + asset.value, 0);
  const selectedStakeCount = selectedScope
    ? currentStakes.filter(stake => stake.walletAddress?.toLowerCase() === selectedWalletAddr).length
    : currentStakes.length;
  const selectedStakingUsd = selectedScopeKey ? (walletStakingUsdByAddress[selectedScopeKey] ?? 0) : summaryStakingUsd;
  const selectedTotalUsd = selectedLiquidUsd + selectedStakingUsd;

  const chainAssets = filterByChain(visibleWalletAssets, walletChainFilter);
  const chainDisplayAssets = normalizeHoldingAssets(chainAssets);
  const hiddenChainAssets = filterByChain(hiddenAssetRows, walletChainFilter);

  const walletPillData = useMemo(() => wallets.map(wallet => {
    const walletKey = wallet.address.toLowerCase();
    const assets = walletAssets[walletKey] || [];
    return {
      wallet,
      walletKey,
      totalUsd: assets.reduce((sum, asset) => sum + asset.value, 0),
      tokenCount: assets.length,
    };
  }), [walletAssets, wallets]);
  const visibleWalletPills = selectedScope
    ? walletPillData.filter(({ walletKey }) => walletKey === selectedScopeKey)
    : walletPillData;
  const visibleAllocationRows = useMemo(() => {
    const draftByName = new Map(allocationCalculatorRows.map((row) => [row.name, row.percent]));
    const visibleMixMap = new Map<string, number>();
    chainDisplayAssets.forEach((asset) => {
      visibleMixMap.set(asset.symbol, (visibleMixMap.get(asset.symbol) ?? 0) + asset.valueUsd);
    });
    const visibleMix = [...visibleMixMap.entries()]
      .map(([name, currentValue]) => ({
        name,
        currentValue,
      }))
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 6);

    const fallbackMix = allocationCalculatorRows.map((row) => ({
      name: row.name,
      currentValue: row.value,
    }));

    const plannerRows = visibleMix.length > 0 ? visibleMix : fallbackMix;
    const portfolioTotal = plannerRows.reduce((sum, row) => sum + row.currentValue, 0);
    const rawTargetTotal = plannerRows.reduce((sum, row) => {
      const currentPercent = portfolioTotal > 0 ? (row.currentValue / portfolioTotal) * 100 : 0;
      const draftPercent = Math.min(100, Math.max(0, draftByName.get(row.name) ?? currentPercent));
      return sum + draftPercent;
    }, 0);

    return plannerRows.map((row) => {
      const currentPercent = portfolioTotal > 0 ? (row.currentValue / portfolioTotal) * 100 : 0;
      const draftPercent = Math.min(100, Math.max(0, draftByName.get(row.name) ?? currentPercent));
      const normalizedPercent = rawTargetTotal > 0 ? (draftPercent / rawTargetTotal) * 100 : 0;
      const targetValue = portfolioTotal * (normalizedPercent / 100);
      const deltaValue = targetValue - row.currentValue;
      const deltaPercent = portfolioTotal > 0 ? (deltaValue / portfolioTotal) * 100 : 0;
      const absDeltaValue = Math.abs(deltaValue);
      const absDeltaPercent = Math.abs(deltaPercent);
      const plsAmount = plsUsdPrice > 0 ? absDeltaValue / plsUsdPrice : 0;

      let guidance = 'Add at least one target percentage to generate a rebalance path.';
      if (rawTargetTotal > 0 && absDeltaValue < 1) {
        guidance = 'You already match the target closely.';
      } else if (rawTargetTotal > 0 && row.name === 'PLS' && deltaValue > 0) {
        guidance = `Keep about ${fmtPls(plsAmount)} available as funding buffer.`;
      } else if (rawTargetTotal > 0 && row.name === 'PLS' && deltaValue < 0) {
        guidance = `Use about ${fmtPls(plsAmount)} to fund the target buys.`;
      } else if (rawTargetTotal > 0 && deltaValue > 0) {
        guidance = `Swap about ${fmtPls(plsAmount)} to buy the needed ${row.name}.`;
      } else if (rawTargetTotal > 0 && deltaValue < 0) {
        guidance = `Trim about ${fmtUsd(absDeltaValue)} of ${row.name} into PLS (${fmtPercent(absDeltaPercent)} of the visible mix).`;
      }

      return {
        ...row,
        currentPercent,
        draftPercent,
        normalizedPercent,
        targetValue,
        deltaValue,
        guidance,
      };
    });
  }, [allocationCalculatorRows, chainDisplayAssets, plsUsdPrice]);
  const allocationPercentTotal = visibleAllocationRows.reduce((sum, row) => sum + row.draftPercent, 0);
  const allocationAutoNormalized = visibleAllocationRows.length > 0 && Math.abs(allocationPercentTotal - 100) > 0.05;

  return (
    <div className="wallets-atlas-page">
      <div className="wallets-atlas-page__actions">
        <button className="btn-ghost" onClick={onOpenOverview}>
          <LayoutDashboard size={14} />
          Portfolio Insights
        </button>
        <button className="btn-ghost" onClick={onOpenTransactions}>
          <ArrowRightLeft size={14} />
          Transactions
        </button>
      </div>

      <section className="wallets-atlas-panel wallets-atlas-panel--hero">
        <div className="wallets-atlas-hero__head">
          <div>
            <div className="wallets-atlas-eyebrow">All Wallets</div>
            <h2>{fmtUsd(selectedScope ? selectedTotalUsd : totalPortfolioUsd)}</h2>
            <p>
              {selectedScope ? selectedScope.name : 'Wallet-level holdings and cross-chain balances.'}
            </p>
          </div>
          <div className="wallets-atlas-hero__buttons">
            {selectedScope && (
              <>
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(selectedScope.address)}>
                  <Copy size={13} />
                  Copy
                </button>
                <button className="btn-ghost" onClick={() => onOpenRenameWallet(selectedScope.address, selectedScope.name)}>
                  <Pencil size={13} />
                  Rename
                </button>
              </>
            )}
            <button className="btn-primary" onClick={onOpenAddWallet}>
              <Plus size={13} />
              Add Wallet
            </button>
          </div>
        </div>

        <div className="wallets-atlas-kpis">
          <span className="wallets-atlas-chip wallets-atlas-chip--accent">Liquid {fmtUsd(selectedScope ? selectedLiquidUsd : summaryLiquidUsd)}</span>
          <span className="wallets-atlas-chip">Staking {fmtUsd(selectedStakingUsd)}</span>
          <span className="wallets-atlas-chip">{chainAssets.length} tokens</span>
          <span className="wallets-atlas-chip">{selectedStakeCount} stake positions</span>
        </div>

        <div className="wallets-atlas-scope">
          <button
            className={`wallet-pill${selectedWalletAddr === 'all' ? ' active' : ''}`}
            onClick={() => onSelectWallet(null)}
          >
            <span className="wallet-dot wallet-dot-multi" />
            All
          </button>
          {walletPillData.map(({ wallet, walletKey, totalUsd }) => (
            <button
              key={wallet.address}
              className={`wallet-pill${selectedWalletAddr === walletKey ? ' active' : ''}`}
              onClick={() => onSelectWallet(wallet.address)}
              title={wallet.address}
            >
              <span className="wallet-dot" />
              <span>{wallet.name || shortenAddr(wallet.address)}</span>
              <span className="wallets-atlas-pill-value">{fmtUsd(totalUsd)}</span>
            </button>
          ))}
        </div>

        <div className="wallets-atlas-filters">
          {(['all', 'pulsechain', 'ethereum', 'base'] as const).map(chain => (
            <button
              key={chain}
              className={`filter-pill${walletChainFilter === chain ? ' active' : ''}`}
              onClick={() => setWalletChainFilter(chain)}
            >
              {chain === 'all' ? 'All' : chain === 'pulsechain' ? 'PulseChain' : chain === 'ethereum' ? 'Ethereum' : 'Base'}
            </button>
          ))}
        </div>
      </section>

      <section className={`wallets-atlas-panel coin-visibility-panel${coinVisibilityMenuOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="coin-visibility-trigger"
          onClick={() => setCoinVisibilityMenuOpen(prev => !prev)}
          aria-expanded={coinVisibilityMenuOpen}
        >
          <div className="coin-visibility-copy">
            <span>Coin visibility</span>
            <strong>Wallet coins are auto-detected on refresh.</strong>
            <small>Open filters, hidden coins, manual coins, and spam scan controls.</small>
            <div className="coin-visibility-stats">
              <span>{hiddenTokens.length} hidden</span>
              <span>{customCoinsCount} manual</span>
              <span>{hideDust ? 'Dust hidden' : 'Dust visible'}</span>
              <span>{hideSpam ? 'Spam hidden' : 'Spam visible'}</span>
            </div>
          </div>
          <ChevronDown size={16} className="coin-visibility-chevron" />
        </button>

        {coinVisibilityMenuOpen && (
          <div className="coin-visibility-dropdown-panel">
            <div className="coin-visibility-actions">
              <button type="button" onClick={onRefreshPortfolio}>
                <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh / detect
              </button>
              <button type="button" onClick={onToggleHiddenCoins}>
                <Eye size={13} />
                Hidden coins
                {hiddenTokens.length > 0 && <span className="hidden-coins-count">{hiddenTokens.length}</span>}
              </button>
              <button type="button" className="coin-visibility-primary" onClick={onOpenCustomCoins}>
                <Plus size={13} />
                Add coin
              </button>
              <button type="button" onClick={onScanForSpam} disabled={isScanning || wallets.length === 0}>
                <Shield size={13} />
                {isScanning ? 'Scanning...' : 'Scan spam'}
                {scanResult !== null && !isScanning && (
                  <span className="hidden-coins-count">{scanResult > 0 ? `+${scanResult}` : 'clean'}</span>
                )}
              </button>
            </div>

            <div className="coin-visibility-dropdown">
              <button type="button" onClick={() => onSetHideDust(prev => !prev)}>
                <span>{hideDust ? 'Show dust coins' : 'Hide dust coins'}</span>
                <small>{hideDust ? 'Dust filter is on' : 'Dust filter is off'}</small>
              </button>
              <button type="button" onClick={() => onSetHideSpam(prev => !prev)}>
                <span>{hideSpam ? 'Show spam coins' : 'Hide spam coins'}</span>
                <small>{hideSpam ? 'Spam filter is on' : 'Spam filter is off'}</small>
              </button>
              <button type="button" disabled={hiddenTokens.length === 0} onClick={onResetCoinVisibility}>
                <span>Unhide all manual coins</span>
                <small>Restore every hidden coin</small>
              </button>
              <button type="button" onClick={onShowEverything}>
                <span>Show everything</span>
                <small>Turn off filters and open hidden list</small>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="wallets-atlas-panel wallets-atlas-panel--assets">
        <div className="wallets-atlas-section-head">
          <div>
            <div className="wallets-atlas-section-title">Assets</div>
            <div className="wallets-atlas-section-meta">
              {chainAssets.length} tokens - {fmtUsd(chainAssets.reduce((sum, asset) => sum + asset.value, 0))}
            </div>
          </div>
          <div className="wallets-atlas-header-actions">
            <button
              className={`btn-ghost${allocationCalculatorOpen ? ' is-active' : ''}`}
              onClick={onToggleAllocationCalculator}
            >
              <Calculator size={14} />
              {allocationCalculatorOpen ? 'Close Calculator' : 'Open Calculator'}
            </button>
            <div className="wallets-atlas-range">
              {(['1h', '6h', '24h', '7d'] as const).map(period => (
                <button
                  key={period}
                  className={priceChangePeriod === period ? 'is-active' : ''}
                  onClick={() => setPriceChangePeriod(period)}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="wallets-atlas-view-switch">
              <button
                className={viewMode === 'combined' ? 'is-active' : ''}
                onClick={() => setViewMode('combined')}
              >
                Combined
              </button>
              <button
                className={viewMode === 'per-wallet' ? 'is-active' : ''}
                onClick={() => setViewMode('per-wallet')}
              >
                Per wallet
              </button>
            </div>
          </div>
        </div>

        {allocationCalculatorOpen && (
          <div className="wallets-atlas-allocation-panel">
            <div className="wallets-atlas-allocation-panel__head">
              <div>
                <div className="wallets-atlas-section-title">Rebalance planner</div>
                <div className="wallets-atlas-section-meta">
                  Set target weights for the visible asset mix and see the simplest path via PLS.
                </div>
              </div>
            </div>
            <div className="wallets-atlas-allocation-summary" role="status">
              <span>Current mix</span>
              <span>Target mix</span>
              <span>Suggested move</span>
            </div>
            {allocationAutoNormalized && (
              <div className="wallets-atlas-allocation-note">
                Target mix auto-normalized from {allocationPercentTotal.toFixed(1)}% to 100.0%.
              </div>
            )}
            <div className="wallets-atlas-allocation-grid">
              {visibleAllocationRows.map(row => (
                <label key={row.name} className="wallets-atlas-allocation-row">
                  <div className="wallets-atlas-allocation-row__asset">
                    <strong>{row.name}</strong>
                    <small>{fmtUsd(row.currentValue)} now · {fmtPercent(row.currentPercent)}</small>
                  </div>
                  <div className="wallets-atlas-allocation-row__target">
                    <input
                      aria-label={`Target allocation for ${row.name}`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={Number.isFinite(row.draftPercent) ? row.draftPercent : 0}
                      onChange={(event) => onSetAllocationDraftPercentage(row.name, Number(event.target.value))}
                    />
                    <small>Target {fmtPercent(row.normalizedPercent)} · {fmtUsd(row.targetValue)}</small>
                  </div>
                  <strong className="wallets-atlas-allocation-row__guidance">{row.guidance}</strong>
                </label>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'combined' ? (
          <HoldingsTable
            assets={chainDisplayAssets}
            allAssets={currentAssets}
            wallets={wallets}
            totalValueUsd={totalPortfolioUsd}
            plsUsdPrice={plsUsdPrice}
            priceChangePeriod={priceChangePeriod}
            sortField={assetSortField}
            sortDir={assetSortDir}
            expandedIds={expandedAssetIds}
            tokenLogos={tokenLogos}
            emptyMessage="No holdings found - add wallets to get started"
            currentTransactions={scopedTransactions}
            manualEntries={manualEntries}
            chainColors={chainColors}
            tokenMarketData={tokenMarketData}
            staticLogos={staticLogos}
            getTokenLogoUrl={getTokenLogoUrl}
            explorerUrl={explorerUrl}
            dexScreenerUrl={dexScreenerUrl}
            onSort={(field) => {
              if (assetSortField === field) setAssetSortDir(dir => dir === 'desc' ? 'asc' : 'desc');
              else {
                setAssetSortField(field);
                setAssetSortDir('desc');
              }
            }}
            onToggleExpanded={(id) => setExpandedAssetIds(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })}
            onSelectAsset={onSelectAsset}
            onOpenPnl={onOpenPnl}
            onHide={onHideToken}
            onSetEntry={(id, value) => setManualEntries(prev => ({ ...prev, [id]: value }))}
            onClearEntry={(id) => setManualEntries(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            })}
            showSkeleton={isLoading && wallets.length > 0 && currentAssets.length === 0}
            footerValueUsd={chainAssets.reduce((sum, asset) => sum + asset.value, 0)}
            shareBaseUsd={totalPortfolioUsd}
          />
        ) : (
          <div className="wallets-atlas-wallet-groups">
            {visibleWalletPills.map(({ wallet, walletKey, totalUsd, tokenCount }) => {
              const walletChainAssets = filterByChain(walletAssets[walletKey] || [], walletChainFilter);
              const walletDisplayAssets = normalizeHoldingAssets(walletChainAssets);
              const walletTransactions = currentTransactions.filter(tx => tx.from === walletKey || tx.to === walletKey);

              if (walletDisplayAssets.length === 0) return null;

              return (
                <div key={wallet.address} className="wallets-atlas-wallet-group">
                  <div className="wallets-atlas-wallet-group__head">
                    <div>
                      <div className="wallets-atlas-wallet-title">
                        <WalletIcon size={14} />
                        <span>{wallet.name || shortenAddr(wallet.address)}</span>
                      </div>
                      <div className="wallets-atlas-wallet-meta">{shortenAddr(wallet.address)} - {tokenCount} tokens</div>
                    </div>
                    <div className="wallets-atlas-wallet-value">{fmtUsd(totalUsd)}</div>
                  </div>

                  <HoldingsTable
                    assets={walletDisplayAssets}
                    allAssets={walletAssets[walletKey] || []}
                    wallets={[wallet]}
                    totalValueUsd={totalPortfolioUsd}
                    plsUsdPrice={plsUsdPrice}
                    priceChangePeriod={priceChangePeriod}
                    sortField={assetSortField}
                    sortDir={assetSortDir}
                    expandedIds={expandedAssetIds}
                    tokenLogos={tokenLogos}
                    emptyMessage="No visible tokens for this wallet"
                    currentTransactions={walletTransactions}
                    manualEntries={manualEntries}
                    chainColors={chainColors}
                    tokenMarketData={tokenMarketData}
                    staticLogos={staticLogos}
                    getTokenLogoUrl={getTokenLogoUrl}
                    explorerUrl={explorerUrl}
                    dexScreenerUrl={dexScreenerUrl}
                    onSort={(field) => {
                      if (assetSortField === field) setAssetSortDir(dir => dir === 'desc' ? 'asc' : 'desc');
                      else {
                        setAssetSortField(field);
                        setAssetSortDir('desc');
                      }
                    }}
                    onToggleExpanded={(id) => setExpandedAssetIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })}
                    onSelectAsset={onSelectAsset}
                    onOpenPnl={onOpenPnl}
                    onHide={onHideToken}
                    onSetEntry={(id, value) => setManualEntries(prev => ({ ...prev, [id]: value }))}
                    onClearEntry={(id) => setManualEntries(prev => {
                      const next = { ...prev };
                      delete next[id];
                      return next;
                    })}
                    showAtlasCards={false}
                    footerLabel="WALLET TOTAL"
                    footerValueUsd={walletChainAssets.reduce((sum, asset) => sum + asset.value, 0)}
                    shareBaseUsd={totalPortfolioUsd}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showHiddenCoins && hiddenChainAssets.length > 0 && (
        <section className="wallets-atlas-panel">
          <div className="wallets-atlas-section-head">
            <div>
              <div className="wallets-atlas-section-title">Hidden assets</div>
              <div className="wallets-atlas-section-meta">{hiddenChainAssets.length} hidden tokens in current scope</div>
            </div>
          </div>
          <div className="wallets-atlas-hidden-list">
            {hiddenChainAssets.map(asset => (
              <div key={asset.id} className="wallets-atlas-hidden-row">
                <div>
                  <strong>{asset.symbol}</strong>
                  <div>{asset.name}</div>
                </div>
                <button className="btn-ghost" onClick={() => onUnhideToken(asset.id)}>
                  Unhide
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
