import { getPortfolioDashboard, PortfolioServiceError } from '../../src/server/portfolio/portfolio-service';
import type { PortfolioDashboardDto, PortfolioDashboardResponse } from '../../src/server/portfolio/portfolio-types';

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: PortfolioDashboardResponse) => void;
  setHeader: (name: string, value: string) => void;
};

const CHAIN_ID_DEFAULT = 369;

function asSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseChainId(chainIdInput: string | undefined): number | null {
  if (chainIdInput === undefined) {
    return CHAIN_ID_DEFAULT;
  }

  if (!/^[1-9]\d*$/.test(chainIdInput)) {
    return null;
  }

  const parsed = Number(chainIdInput);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function fetchFromCoinpulseBackend(
  walletAddress: string,
  chainId: number,
): Promise<PortfolioDashboardDto> {
  const backendUrl = process.env.COINPULSE_BACKEND_URL!;
  const query = new URLSearchParams({ walletAddress, chainId: String(chainId) });
  const res = await fetch(`${backendUrl}/api/portfolio/dashboard?${query}`);

  if (!res.ok) {
    let code = 'backend_unavailable';
    let message = 'Portfolio backend returned an error.';
    try {
      const body = await res.json() as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch { /* ignore parse errors */ }
    throw new PortfolioServiceError('backend_unavailable', message, { cause: { code } });
  }

  const body = await res.json() as { data: PortfolioDashboardDto };
  return body.data;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      data: null,
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed.',
      },
    });
  }

  const walletAddress = asSingleValue(req.query?.walletAddress);
  const chainIdInput = asSingleValue(req.query?.chainId);
  const chainId = parseChainId(chainIdInput);

  if (!walletAddress) {
    return res.status(400).json({
      ok: false,
      data: null,
      error: {
        code: 'invalid_wallet',
        message: 'walletAddress query parameter is required.',
      },
    });
  }

  if (chainId === null) {
    return res.status(400).json({
      ok: false,
      data: null,
      error: {
        code: 'invalid_chain_id',
        message: 'chainId must be an integer.',
      },
    });
  }

  try {
    const data = process.env.COINPULSE_BACKEND_URL
      ? await fetchFromCoinpulseBackend(walletAddress, chainId)
      : await getPortfolioDashboard(walletAddress, chainId);

    return res.status(200).json({ ok: true, data, error: null });
  } catch (error) {
    if (error instanceof PortfolioServiceError) {
      const code = error.code === 'backend_unavailable' ? 503 : 400;
      return res.status(code).json({
        ok: false,
        data: null,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return res.status(503).json({
      ok: false,
      data: null,
      error: {
        code: 'backend_unavailable',
        message: 'Portfolio backend is currently unavailable.',
      },
    });
  }
}
