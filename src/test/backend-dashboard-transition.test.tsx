import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BackendDashboardTransitionPanel } from '../components/BackendDashboardTransitionPanel';
import { resolveBackendWalletAddress } from '../lib/backend-dashboard-transition';
import type { Wallet } from '../types';

const wallets: Wallet[] = [
  { address: '0x1111111111111111111111111111111111111111', name: 'One' },
  { address: '0xaabbccddeeff00112233445566778899aabbccdd', name: 'Two' },
];

describe('resolveBackendWalletAddress', () => {
  it('uses activeWallet when it is present in saved wallets', () => {
    expect(resolveBackendWalletAddress(wallets, wallets[1].address)).toBe(wallets[1].address);
  });

  it('falls back to first saved wallet when activeWallet is stale/missing', () => {
    expect(resolveBackendWalletAddress(wallets, '0x3333333333333333333333333333333333333333')).toBe(wallets[0].address);
  });

  it('returns null when there are no saved wallets', () => {
    expect(resolveBackendWalletAddress([], '0x3333333333333333333333333333333333333333')).toBeNull();
  });


  it('matches activeWallet case-insensitively against saved wallets', () => {
    const mixedCaseAddress = '0xAaBbCcDdEeFf00112233445566778899AaBbCcDd';
    expect(resolveBackendWalletAddress(wallets, mixedCaseAddress)).toBe(wallets[1].address);
  });

  it('falls back to first saved wallet when activeWallet is null', () => {
    expect(resolveBackendWalletAddress(wallets, null)).toBe(wallets[0].address);
  });

  it('returns null when activeWallet is null and there are no saved wallets', () => {
    expect(resolveBackendWalletAddress([], null)).toBeNull();
  });
});

describe('BackendDashboardTransitionPanel', () => {
  it('renders transition data fields when backend dto is available', () => {
    render(
      <BackendDashboardTransitionPanel
        backendWalletAddress={wallets[0].address}
        backendDashboardLoading={false}
        backendDashboardError={null}
        backendDashboardResponse={{
          ok: true,
          data: {
            schemaVersion: 'v1',
            status: 'available',
            asOf: '2026-05-24T00:00:00Z',
            walletAddress: wallets[0].address,
            chainId: 369,
            balances: [{ assetId: 'native:369:pls', chainId: 369, address: 'native', symbol: 'PLS', name: 'PulseChain', quantity: '123.45', pricing: { status: 'available', priceUsd: 0.00005 }, valuation: { status: 'available', valueUsd: 12.34 }, warnings: [] }],
            warnings: ['partial data'],
            summary: { totalValueUsd: 12.34, pricedAssetCount: 1, unpricedAssetCount: 0, warnings: [] },
          },
          error: null,
        }}
      />,
    );

    expect(screen.getByText(/schemaVersion: v1/i)).toBeInTheDocument();
    expect(screen.getByText(/status: available/i)).toBeInTheDocument();
    expect(screen.getByText(/warnings: partial data/i)).toBeInTheDocument();
    expect(screen.getByText(/PLS balance: 123.45/i)).toBeInTheDocument();
  });

  it('isolates backend dto errors to the transition panel', () => {
    render(
      <div>
        <h1>Portfolio command center.</h1>
        <BackendDashboardTransitionPanel
          backendWalletAddress={wallets[0].address}
          backendDashboardLoading={false}
          backendDashboardError={'Request failed'}
          backendDashboardResponse={null}
        />
      </div>,
    );

    expect(screen.getByText(/portfolio command center\./i)).toBeInTheDocument();
    expect(screen.getByText(/backend status unavailable: Request failed/i)).toBeInTheDocument();
  });

  it('shows add-wallet state and does not display stale backend data without a wallet', () => {
    render(
      <BackendDashboardTransitionPanel
        backendWalletAddress={null}
        backendDashboardLoading={false}
        backendDashboardError={null}
        backendDashboardResponse={{
          ok: true,
          data: {
            schemaVersion: 'v1',
            status: 'partial',
            asOf: '2026-05-24T00:00:00Z',
            walletAddress: wallets[0].address,
            chainId: 369,
            balances: [{ assetId: 'native:369:pls', chainId: 369, address: 'native', symbol: 'PLS', name: 'PulseChain', quantity: '999', pricing: { status: 'available', priceUsd: 0.00005 }, valuation: { status: 'available', valueUsd: 99 }, warnings: [] }],
            warnings: [],
            summary: { totalValueUsd: 99, pricedAssetCount: 1, unpricedAssetCount: 0, warnings: [] },
          },
          error: null,
        }}
      />,
    );

    expect(screen.getByText(/add a wallet to query backend dto\./i)).toBeInTheDocument();
    expect(screen.queryByText(/schemaVersion:/i)).not.toBeInTheDocument();
  });
});
