import { ZodError } from "zod";
import { importTrackedWallet, WalletImportError } from "../../src/services/api/wallets";
import {
  walletImportRequestSchema,
  buildInvalidInputResponse,
} from "../../src/services/api/validation";

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

  let parsed: ReturnType<typeof walletImportRequestSchema.parse>;
  try {
    parsed = walletImportRequestSchema.parse(req.body ?? {});
  } catch (err) {
    if (err instanceof ZodError) {
      const resp = buildInvalidInputResponse(err);
      const body = await resp.json();
      return res.status(400).json(body);
    }
    return res.status(400).json({ error: { code: 'invalid_request', message: 'Invalid request body.' } });
  }

  const { walletAddress, chainId, label } = parsed;

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
      walletAddress,
      chainId,
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
