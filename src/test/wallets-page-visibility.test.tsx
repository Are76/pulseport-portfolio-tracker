import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WalletsPage } from '../pages/WalletsPage';
import type { Asset, Transaction, Wallet } from '../types';

vi.mock('../components/HoldingsTable', () => ({
  HoldingsTable: ({ assets, currentTransactions }: { assets: Array<{ id: string; symbol: string }>; currentTransactions: Transaction[] }) => (
    <div>
      <div data-testid="mock-tx-count">{currentTransactions.length}</div>
      <ul data-testid="mock-asset-list">
        {assets.map((asset) => (
          <li key={asset.id}>{asset.symbol}</li>
        ))}
      </ul>
    </div>
  ),
}));

function makeAsset(overrides: Partial<Asset> & Record<string, unknown>): Asset {
  return {
    id: 'asset-default',
    symbol: 'DEF',
    name: 'Default',
    balance: 100,
    price: 1,
    value: 100,
    chain: 'pulsechain',
    pnl24h: 0,
    address: '0x0000000000000000000000000000000000000001',
    ...overrides,
  } as Asset;
}

function makeWallet(overrides: Partial<Wallet>): Wallet {
  return {
    address: '0x75f808367720951e789d47e9e9db51148d9aa765',
    name: 'stake',
    ...overrides,
  };
}

function normalizeHoldingAssets(assets: Asset[]) {
  return assets.map((asset) => ({
    ...asset,
    priceUsd: asset.price,
    pricePls: asset.price,
    valueUsd: asset.value,
    valuePls: asset.value,
    leagueLabel: asset.symbol,
  }));
}

function renderWalletsPage(overrides: Partial<ComponentProps<typeof WalletsPage>> = {}) {
  const wallet = makeWallet({});
  const walletKey = wallet.address.toLowerCase();

  const props: ComponentProps<typeof WalletsPage> = {
    wallets: [wallet],
    selectedWalletAddr: walletKey,
    currentAssets: [makeAsset({ id: 'visible', symbol: 'VISIBLE' })],
    currentStakes: [],
    currentTransactions: [],
    walletAssets: { [walletKey]: [makeAsset({ id: 'visible', symbol: 'VISIBLE' })] },
    hiddenAssetRows: [],
    hiddenTokens: [],
    spamTokenIds: [],
    customCoinsCount: 0,
    hideDust: false,
    hideSpam: false,
    isScanning: false,
    scanResult: null,
    isLoading: false,
    walletChainFilter: 'all',
    setWalletChainFilter: vi.fn(),
    coinVisibilityMenuOpen: false,
    setCoinVisibilityMenuOpen: vi.fn(),
    priceChangePeriod: '24h',
    setPriceChangePeriod: vi.fn(),
    assetSortField: 'value',
    assetSortDir: 'desc',
    setAssetSortField: vi.fn(),
    setAssetSortDir: vi.fn(),
    expandedAssetIds: new Set<string>(),
    setExpandedAssetIds: vi.fn(),
    manualEntries: {},
    setManualEntries: vi.fn(),
    tokenLogos: {},
    tokenMarketData: {},
    staticLogos: {},
    chainColors: { pulsechain: '#fff', ethereum: '#fff', base: '#fff' },
    plsUsdPrice: 0.00005,
    totalPortfolioUsd: 100,
    summaryLiquidUsd: 100,
    summaryStakingUsd: 0,
    walletStakingUsdByAddress: {},
    showHiddenCoins: false,
    allocationCalculatorOpen: false,
    allocationCalculatorRows: [],
    allocationDraftPercentages: {},
    onSelectWallet: vi.fn(),
    onOpenAddWallet: vi.fn(),
    onOpenRenameWallet: vi.fn(),
    onOpenOverview: vi.fn(),
    onOpenTransactions: vi.fn(),
    onToggleHiddenCoins: vi.fn(),
    onToggleAllocationCalculator: vi.fn(),
    onSetAllocationDraftPercentage: vi.fn(),
    onRefreshPortfolio: vi.fn(),
    onOpenCustomCoins: vi.fn(),
    onScanForSpam: vi.fn(),
    onSetHideDust: vi.fn(),
    onSetHideSpam: vi.fn(),
    onResetCoinVisibility: vi.fn(),
    onShowEverything: vi.fn(),
    onHideToken: vi.fn(),
    onUnhideToken: vi.fn(),
    onSelectAsset: vi.fn(),
    onOpenPnl: vi.fn(),
    normalizeHoldingAssets,
    getTokenLogoUrl: vi.fn(() => ''),
    explorerUrl: vi.fn(() => null),
    dexScreenerUrl: vi.fn(() => null),
    ...overrides,
  };

  return render(<WalletsPage {...props} />);
}

describe('WalletsPage selected wallet consistency', () => {
  it('applies hidden token, dust, and spam visibility rules in selected wallet view', () => {
    const wallet = makeWallet({});
    const walletKey = wallet.address.toLowerCase();

    renderWalletsPage({
      wallets: [wallet],
      walletAssets: {
        [walletKey]: [
          makeAsset({ id: 'visible', symbol: 'VISIBLE', value: 100, price: 1 }),
          makeAsset({ id: 'hidden-token', symbol: 'HIDDEN', value: 80, price: 1 }),
          makeAsset({ id: 'dust-token', symbol: 'DUST', value: 0.4, price: 0.01, balance: 40 }),
          makeAsset({ id: 'spam-token', symbol: 'SPAM', value: 50, price: 1, isSpam: true }),
        ],
      },
      hiddenTokens: ['hidden-token'],
      hideDust: true,
      hideSpam: true,
      spamTokenIds: ['spam-token'],
    });

    expect(screen.getByText('VISIBLE')).toBeInTheDocument();
    expect(screen.queryByText('HIDDEN')).not.toBeInTheDocument();
    expect(screen.queryByText('DUST')).not.toBeInTheDocument();
    expect(screen.queryByText('SPAM')).not.toBeInTheDocument();
  });

  it('counts selected wallet activity with case-insensitive transaction address matching', () => {
    const wallet = makeWallet({});
    const walletKey = wallet.address.toLowerCase();

    renderWalletsPage({
      wallets: [wallet],
      currentTransactions: [
        { from: wallet.address.toUpperCase(), to: '0x0000000000000000000000000000000000000002' },
        { from: '0x0000000000000000000000000000000000000003', to: wallet.address.toUpperCase() },
        { from: '0x0000000000000000000000000000000000000004', to: '0x0000000000000000000000000000000000000005' },
      ] as Transaction[],
      walletAssets: { [walletKey]: [makeAsset({ id: 'visible', symbol: 'VISIBLE' })] },
    });

    expect(screen.getByTestId('mock-tx-count')).toHaveTextContent('2');
  });
});
