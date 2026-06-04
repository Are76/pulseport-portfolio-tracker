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
  return res.json() as Promise<TrackedWalletsResponse>;
}

export async function importWallet(body: WalletImportRequest): Promise<unknown> {
  const res = await fetch('/api/wallets/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function triggerManualSync(body: SyncRequest): Promise<unknown> {
  const res = await fetch('/api/sync/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function triggerRebuild(body: RebuildRequest): Promise<unknown> {
  const res = await fetch('/api/rebuild', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchBackendHealth(signal?: AbortSignal): Promise<unknown> {
  const res = await fetch('/api/debug/health', { signal });
  return res.json();
}
