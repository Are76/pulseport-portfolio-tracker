import { importTrackedWallet, WalletImportError } from "../../src/services/api/wallets";

type ApiRequest = { method?: string; body?: unknown };
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed.' } });
  }

  const body = req.body as { walletAddress?: unknown; chainId?: unknown; label?: unknown } | null;
  if (!body || typeof body.walletAddress !== 'string' || typeof body.chainId !== 'number') {
    return res.status(400).json({ error: { code: 'invalid_request', message: 'walletAddress (string) and chainId (number) are required.' } });
  }

  const label = typeof body.label === 'string' ? body.label : undefined;

  // Forward to remote backend if configured (best-effort; do not block the local write on failure)
  const backendUrl = process.env.COINPULSE_BACKEND_URL;
  if (backendUrl) {
    fetch(`${backendUrl}/api/wallets/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    }).catch(() => {/* ignore */});
  }

  try {
    const wallet = await importTrackedWallet({
      walletAddress: body.walletAddress,
      chainId: body.chainId,
      label,
    });
    return res.status(200).json({ data: { schemaVersion: 'v1', wallet } });
  } catch (err) {
    if (err instanceof WalletImportError) {
      return res.status(400).json({ error: { code: err.code, message: err.message } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } });
  }
}
