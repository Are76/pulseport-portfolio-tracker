import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { TransactionsPage } from '../pages/TransactionsPage';

function stubMatchMedia() {
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
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Transactions Atlas surface', () => {
  it('shows the dedicated transactions page shell and ledger controls', () => {
    stubMatchMedia();
    window.localStorage.setItem('pulseport_active_tab', 'history');

    render(<App />);

    expect(screen.getByText('PulseChain activity')).toBeInTheDocument();
    expect(screen.getByText('Ledger overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view as you/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });

  it('shows summary cards and active filter chips when filters are applied', () => {
    render(
      <TransactionsPage
        wallets={[{ address: '0xabc', name: 'Main wallet' }]}
        currentAssets={[{ id: 'hex', symbol: 'HEX', name: 'HEX', balance: 1000, price: 0.01, value: 10, chain: 'pulsechain', pnl24h: 3 }]}
        currentTransactions={[
          { id: '1', hash: '0x1', timestamp: Date.now(), type: 'deposit', from: '0xext', to: '0xabc', asset: 'HEX', amount: 100, chain: 'pulsechain', valueUsd: 1 },
          { id: '2', hash: '0x2', timestamp: Date.now(), type: 'swap', from: '0xabc', to: '0xdex', asset: 'PLSX', amount: 50, counterAsset: 'PLS', counterAmount: 1000, chain: 'pulsechain', valueUsd: 2 },
        ]}
        filteredTransactions={[
          { id: '1', hash: '0x1', timestamp: Date.now(), type: 'deposit', from: '0xext', to: '0xabc', asset: 'HEX', amount: 100, chain: 'pulsechain', valueUsd: 1 },
          { id: '2', hash: '0x2', timestamp: Date.now(), type: 'swap', from: '0xabc', to: '0xdex', asset: 'PLSX', amount: 50, counterAsset: 'PLS', counterAmount: 1000, chain: 'pulsechain', valueUsd: 2 },
        ]}
        txTypeFilter="swap"
        setTxTypeFilter={vi.fn()}
        txAssetFilter="HEX"
        setTxAssetFilter={vi.fn()}
        txYearFilter="2026"
        setTxYearFilter={vi.fn()}
        txCoinCategory="hex"
        setTxCoinCategory={vi.fn()}
        onClearFilters={vi.fn()}
        viewAsYou={false}
        setViewAsYou={vi.fn()}
        txCompact={false}
        setTxCompact={vi.fn()}
        onExportCsv={vi.fn()}
        transactionsCollapsed={false}
        onToggleTransactionsCollapsed={vi.fn()}
        hiddenTxIds={['hidden-1']}
        onToggleHiddenTx={vi.fn()}
        showHiddenTxs={false}
        onToggleShowHiddenTxs={vi.fn()}
        onClearHiddenTxs={vi.fn()}
        tokenLogos={{}}
        getTokenLogoUrl={() => ''}
        plsSwapData={{ rows: [], totalReceived: 0, totalSpent: 0, totalNet: 0, netUsd: 0, plsPrice: 0.00005 }}
        plsFlowCollapsed={false}
        onTogglePlsFlowCollapsed={vi.fn()}
        pulseUsdPrice={0.00005}
        isLoading={false}
        onSyncSwaps={vi.fn()}
        onOpenOverview={vi.fn()}
        onOpenWallets={vi.fn()}
      />,
    );

    expect(screen.getByText('Chains active')).toBeInTheDocument();
    expect(screen.getByText('Received value')).toBeInTheDocument();
    expect(screen.getByText('Swap count')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^HEX x$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2026 x$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^HEX\/eHEX x$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /transaction type filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show hidden rows/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear hidden rows/i })).toBeInTheDocument();
  });
});
