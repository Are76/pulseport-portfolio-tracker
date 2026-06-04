export type TrackedWallet = {
  id: string;
  walletAddress: string;
  chainId: number;
  label?: string | null;
  createdAt: string;
};

export type TrackedWalletsResponse = {
  data: {
    schemaVersion: 'v1';
    wallets: TrackedWallet[];
  };
};

export type WalletImportRequest = {
  walletAddress: string;
  chainId: number;
  label?: string;
};

export type SyncRequest = {
  walletAddress: string;
  chainId: number;
  sourceFamilies?: string[];
  startBlock?: number;
  endBlock?: number;
  policyLabel?: string;
};

export type RebuildRequest = {
  walletAddress: string;
  chainId: number;
  fromBlock?: number;
  toBlock?: number;
  sourceFamilies?: string[];
};

export async function fetchTrackedWallets(signal?: AbortSignal): Promise<TrackedWalletsResponse> {
  const res = await fetch('/api/wallets/tracked', { signal });
  if (!res.ok) throw new Error(`fetchTrackedWallets failed: ${res.status}`);
  return res.json() as Promise<TrackedWalletsResponse>;
}

export async function importWallet(body: WalletImportRequest): Promise<unknown> {
  const res = await fetch('/api/wallets/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(`importWallet failed: ${res.status}`);
  return data;
}

export async function triggerManualSync(body: SyncRequest): Promise<unknown> {
  const res = await fetch('/api/sync/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(`triggerManualSync failed: ${res.status}`);
  return data;
}

export async function triggerRebuild(body: RebuildRequest): Promise<unknown> {
  const res = await fetch('/api/rebuild', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(`triggerRebuild failed: ${res.status}`);
  return data;
}

export async function fetchBackendHealth(signal?: AbortSignal): Promise<unknown> {
  const res = await fetch('/api/debug/health', { signal });
  if (!res.ok) throw new Error(`fetchBackendHealth failed: ${res.status}`);
  return res.json();
}
