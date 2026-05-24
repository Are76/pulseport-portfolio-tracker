import type { fetchHexStakeDashboard } from '../lib/api/hex-stake-client';

type BackendHexStakeResponse = Awaited<ReturnType<typeof fetchHexStakeDashboard>>;

type Props = {
  backendWalletAddress: string | null;
  backendHexStakeLoading: boolean;
  backendHexStakeError: string | null;
  backendHexStakeResponse: BackendHexStakeResponse | null;
};

export function BackendHexStakeTransitionPanel({
  backendWalletAddress,
  backendHexStakeLoading,
  backendHexStakeError,
  backendHexStakeResponse,
}: Props) {
  const nativePositions = backendHexStakeResponse?.ok
    ? backendHexStakeResponse.data.positions.filter((position) => position.stakeSource === 'native')
    : [];

  return (
    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--fg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-surface)' }}>
      <strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Backend HEX Stakes DTO (transition)</strong>
      {backendWalletAddress ? (
        backendHexStakeLoading ? (
          <div>Loading backend HEX stakes dashboard…</div>
        ) : backendHexStakeError ? (
          <div>Backend HEX stakes unavailable: {backendHexStakeError}</div>
        ) : backendHexStakeResponse?.ok ? (
          <div style={{ display: 'grid', gap: 4 }}>
            <div>schemaVersion: {backendHexStakeResponse.data.schemaVersion}</div>
            <div>status: {backendHexStakeResponse.data.status}</div>
            <div>warnings: {backendHexStakeResponse.data.warnings.length ? backendHexStakeResponse.data.warnings.join(' • ') : 'none'}</div>
            <div>activeStakeCount: {backendHexStakeResponse.data.summary.activeStakeCount}</div>
            <div>totalPrincipalHex: {backendHexStakeResponse.data.summary.totalPrincipalHex}</div>
            <div>totalTShares: {backendHexStakeResponse.data.summary.totalTShares}</div>
            <div>pricing unavailable</div>
            <div>valuation unavailable</div>
            <div>yield not implemented</div>
            <div>ended stakes not implemented</div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>Native positions</div>
            {nativePositions.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {nativePositions.map((position) => (
                  <li key={position.stakeId}>
                    status={position.stakeStatus}, principalHex={position.principalHex ?? 'n/a'}, tShares={position.tShares ?? 'n/a'}, lockedDay={position.lockedDay ?? 'n/a'}, stakedDays={position.stakedDays ?? 'n/a'}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No native HEX stake positions returned.</div>
            )}
          </div>
        ) : backendHexStakeResponse?.error ? (
          <div>Backend HEX stakes unavailable: {backendHexStakeResponse.error.message}</div>
        ) : (
          <div>Backend HEX stakes request has not completed yet.</div>
        )
      ) : (
        <div>Add a wallet to query backend HEX stakes DTO.</div>
      )}
    </div>
  );
}
