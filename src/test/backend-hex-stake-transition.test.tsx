import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BackendHexStakeTransitionPanel } from '../components/BackendHexStakeTransitionPanel';

const walletAddress = '0x1111111111111111111111111111111111111111';

describe('BackendHexStakeTransitionPanel', () => {
  it('shows add-wallet state when no wallet is available', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={null}
        backendHexStakeLoading={false}
        backendHexStakeError={null}
        backendHexStakeResponse={null}
      />,
    );

    expect(screen.getByText(/add a wallet to query backend hex stakes dto\./i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={walletAddress}
        backendHexStakeLoading={true}
        backendHexStakeError={null}
        backendHexStakeResponse={null}
      />,
    );

    expect(screen.getByText(/loading backend hex stakes dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/unknown error/i)).not.toBeInTheDocument();
  });


  it('shows neutral idle state when wallet exists and response has not completed', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={walletAddress}
        backendHexStakeLoading={false}
        backendHexStakeError={null}
        backendHexStakeResponse={null}
      />,
    );

    expect(screen.getByText(/backend hex stakes request has not completed yet\./i)).toBeInTheDocument();
    expect(screen.queryByText(/unknown error/i)).not.toBeInTheDocument();
  });

  it('shows backend error state', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={walletAddress}
        backendHexStakeLoading={false}
        backendHexStakeError={'Request failed'}
        backendHexStakeResponse={null}
      />,
    );

    expect(screen.getByText(/backend hex stakes unavailable: Request failed/i)).toBeInTheDocument();
  });

  it('renders success state and native position list including active/pending/overdue', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={walletAddress}
        backendHexStakeLoading={false}
        backendHexStakeError={null}
        backendHexStakeResponse={{
          ok: true,
          error: null,
          data: {
            schemaVersion: 'v1',
            walletAddress,
            chainId: 369,
            asOf: '2026-05-24T00:00:00Z',
            status: 'available',
            warnings: ['partial native read'],
            positions: [
              { stakeId: '1', stakeSource: 'native', stakeStatus: 'active', chainId: 369, assetId: 'erc20:369:hex', contractAddress: '0xhex', lockedDay: 100, stakedDays: 555, unlockedDay: null, principalHex: '1000', stakeShares: '1000000000000', tShares: '1', yieldHex: null, bpdYield: null, bpdYieldStatus: 'unknown', pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null }, valuation: { status: 'unavailable', valueUsd: null }, pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null }, warnings: [], provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' } },
              { stakeId: '2', stakeSource: 'native', stakeStatus: 'pending', chainId: 369, assetId: 'erc20:369:hex', contractAddress: '0xhex', lockedDay: 200, stakedDays: 365, unlockedDay: null, principalHex: '2000', stakeShares: '2000000000000', tShares: '2', yieldHex: null, bpdYield: null, bpdYieldStatus: 'unknown', pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null }, valuation: { status: 'unavailable', valueUsd: null }, pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null }, warnings: [], provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' } },
              { stakeId: '3', stakeSource: 'native', stakeStatus: 'overdue', chainId: 369, assetId: 'erc20:369:hex', contractAddress: '0xhex', lockedDay: 1, stakedDays: 1, unlockedDay: null, principalHex: '3000', stakeShares: '3000000000000', tShares: '3', yieldHex: null, bpdYield: null, bpdYieldStatus: 'unknown', pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null }, valuation: { status: 'unavailable', valueUsd: null }, pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null }, warnings: [], provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' } },
            ],
            summary: { activeStakeCount: 1, endedStakeCount: 0, unsupportedStakeCount: 0, totalPrincipalHex: '6000', totalYieldHex: '0', totalTShares: '6', valuationStatus: 'unavailable', pnlStatus: 'unavailable', warnings: ['partial native read'] },
            tShareMetrics: { status: 'unknown', shareRate: null, tSharePriceHex: null, tSharePriceUsd: null, activeTShares: '6', averagePaidUsdPerTShare: null, warnings: [] },
            provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' },
          },
        }}
      />,
    );

    expect(screen.getByText(/schemaVersion: v1/i)).toBeInTheDocument();
    expect(screen.getByText(/status: available/i)).toBeInTheDocument();
    expect(screen.getByText(/warnings: partial native read/i)).toBeInTheDocument();
    expect(screen.getByText(/activeStakeCount: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/totalPrincipalHex: 6000/i)).toBeInTheDocument();
    expect(screen.getByText(/totalTShares: 6/i)).toBeInTheDocument();
    expect(screen.getByText(/status=active/i)).toBeInTheDocument();
    expect(screen.getByText(/status=pending/i)).toBeInTheDocument();
    expect(screen.getByText(/status=overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/pricing unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/valuation unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/yield not implemented/i)).toBeInTheDocument();
    expect(screen.getByText(/ended stakes not implemented/i)).toBeInTheDocument();
  });


  it('shows no-native message when only non-native positions are returned', () => {
    render(
      <BackendHexStakeTransitionPanel
        backendWalletAddress={walletAddress}
        backendHexStakeLoading={false}
        backendHexStakeError={null}
        backendHexStakeResponse={{
          ok: true,
          error: null,
          data: {
            schemaVersion: 'v1',
            walletAddress,
            chainId: 369,
            asOf: '2026-05-24T00:00:00Z',
            status: 'available',
            warnings: [],
            positions: [
              { stakeId: '10', stakeSource: 'hsi', stakeStatus: 'unsupported', chainId: 369, assetId: 'erc20:369:hex', contractAddress: '0xhex', lockedDay: null, stakedDays: null, unlockedDay: null, principalHex: null, stakeShares: null, tShares: null, yieldHex: null, bpdYield: null, bpdYieldStatus: 'unknown', pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null }, valuation: { status: 'unavailable', valueUsd: null }, pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null }, warnings: [], provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' } },
            ],
            summary: { activeStakeCount: 0, endedStakeCount: 0, unsupportedStakeCount: 1, totalPrincipalHex: '0', totalYieldHex: '0', totalTShares: '0', valuationStatus: 'unavailable', pnlStatus: 'unavailable', warnings: [] },
            tShareMetrics: { status: 'unknown', shareRate: null, tSharePriceHex: null, tSharePriceUsd: null, activeTShares: '0', averagePaidUsdPerTShare: null, warnings: [] },
            provenance: { source: 'test', observedAt: '2026-05-24T00:00:00Z' },
          },
        }}
      />,
    );

    expect(screen.getByText(/no native hex stake positions returned\./i)).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('keeps failure isolated to transition panel content', () => {
    render(
      <div>
        <h1>Portfolio command center.</h1>
        <BackendHexStakeTransitionPanel
          backendWalletAddress={walletAddress}
          backendHexStakeLoading={false}
          backendHexStakeError={'HEX backend down'}
          backendHexStakeResponse={null}
        />
      </div>,
    );

    expect(screen.getByText(/portfolio command center\./i)).toBeInTheDocument();
    expect(screen.getByText(/backend hex stakes unavailable: HEX backend down/i)).toBeInTheDocument();
  });
});
