import type { fetchPortfolioDashboard } from '../lib/api/portfolio-client';

type BackendDashboardResponse = Awaited<ReturnType<typeof fetchPortfolioDashboard>>;

type Props = {
  backendWalletAddress: string | null;
  backendDashboardLoading: boolean;
  backendDashboardError: string | null;
  backendDashboardResponse: BackendDashboardResponse | null;
};

export function BackendDashboardTransitionPanel({
  backendWalletAddress,
  backendDashboardLoading,
  backendDashboardError,
  backendDashboardResponse,
}: Props) {
  return (
    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--fg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--bg-surface)' }}>
      <strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Backend DTO (transition)</strong>
      {backendWalletAddress ? (
        backendDashboardLoading ? (
          <div>Loading backend dashboard…</div>
        ) : backendDashboardError ? (
          <div>Backend status unavailable: {backendDashboardError}</div>
        ) : backendDashboardResponse?.ok ? (
          <div style={{ display: 'grid', gap: 4 }}>
            <div>schemaVersion: {backendDashboardResponse.data.schemaVersion}</div>
            <div>status: {backendDashboardResponse.data.status}</div>
            <div>warnings: {backendDashboardResponse.data.warnings.length ? backendDashboardResponse.data.warnings.join(' • ') : 'none'}</div>
            <div>PLS balance: {backendDashboardResponse.data.balances.find((b) => b.assetId === 'native:369:pls')?.quantity ?? 'n/a'}</div>
          </div>
        ) : (
          <div>Backend status unavailable: {backendDashboardResponse?.error?.message ?? 'unknown error'}</div>
        )
      ) : (
        <div>Add a wallet to query backend DTO.</div>
      )}
    </div>
  );
}
