import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Eye,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCcw,
  Shield,
  Wallet as WalletIcon,
  ArrowRightLeft,
} from 'lucide-react';

import { HoldingsTable } from '../components/HoldingsTable';
import type { Asset, Chain, Wallet } from '../types';
import type { HoldingDisplayAsset, HoldingSortField } from '../components/HoldingsTable';

type WalletChainFilter = 'all' | 'pulsechain' | 'ethereum' | 'base';
type WalletViewMode = 'combined' | 'per-wallet';

interface HiddenAssetRow extends Asset {}

interface WalletsPageProps {
  wallets: Wallet[];
  selectedWalletAddr: string;
  currentAssets: Asset[];
  currentStakes: Array<{ walletAddress?: string }>;
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
  onSelectWallet: (walletAddress: string | null) => void;
  onOpenAddWallet: () => void;
  onOpenRenameWallet: (walletAddress: string, name: string) => void;
  onOpenOverview: () => void;
  onOpenTransactions: () => void;
  onToggleHiddenCoins: () => void;
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

function filterByChain<T extends { chain: Chain }>(items: T[], filter: WalletChainFilter) {
  return filter === 'all' ? items : items.filter(item => item.chain === filter);
}

export function WalletsPage({
  wallets,
  selectedWalletAddr,
  currentAssets,
  currentStakes,
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
  onSelectWallet,
  onOpenAddWallet,
  onOpenRenameWallet,
  onOpenOverview,
  onOpenTransactions,
  onToggleHiddenCoins,
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

  const visibleWalletAssets = selectedScope
    ? (walletAssets[selectedWalletAddr] || [])
    : currentAssets;

  const selectedLiquidUsd = visibleWalletAssets.reduce((sum, asset) => sum + asset.value, 0);
  const selectedStakeCount = selectedScope
    ? currentStakes.filter(stake => stake.walletAddress === selectedWalletAddr).length
    : currentStakes.length;
  const selectedStakingUsd = 0;
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
              {chainAssets.length} tokens · {fmtUsd(chainAssets.reduce((sum, asset) => sum + asset.value, 0))}
            </div>
          </div>
          <div className="wallets-atlas-header-actions">
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
            currentTransactions={[]}
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
            {walletPillData.map(({ wallet, walletKey, totalUsd, tokenCount }) => {
              const walletChainAssets = filterByChain(walletAssets[walletKey] || [], walletChainFilter);
              const walletDisplayAssets = normalizeHoldingAssets(walletChainAssets);

              if (walletDisplayAssets.length === 0) return null;

              return (
                <div key={wallet.address} className="wallets-atlas-wallet-group">
                  <div className="wallets-atlas-wallet-group__head">
                    <div>
                      <div className="wallets-atlas-wallet-title">
                        <WalletIcon size={14} />
                        <span>{wallet.name || shortenAddr(wallet.address)}</span>
                      </div>
                      <div className="wallets-atlas-wallet-meta">{shortenAddr(wallet.address)} · {tokenCount} tokens</div>
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
                    currentTransactions={[]}
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

      {hiddenChainAssets.length > 0 && (
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
