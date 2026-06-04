import { ZodError } from "zod";

import { assemblePortfolioDashboard } from "../../src/services/dashboard";
import { dashboardRequestSchema } from "../../src/services/api/validation";
import { resolveTrackedWalletByAddress } from "../../src/services/api/wallets";

type Req = { method?: string; query?: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => Res; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

function asSingle(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, data: null, error: { code: "method_not_allowed", message: "Method not allowed." } });
  }

  try {
    const input = dashboardRequestSchema.parse({
      walletAddress: asSingle(req.query?.walletAddress),
      chainId: asSingle(req.query?.chainId),
      quoteAsset: asSingle(req.query?.quoteAsset),
      asOf: asSingle(req.query?.asOf),
    });

    const wallet = await resolveTrackedWalletByAddress({
      walletAddress: input.walletAddress,
      chainId: input.chainId,
    });

    if (!wallet) {
      return res.status(404).json({ ok: false, data: null, error: { code: "WALLET_NOT_FOUND", message: "Wallet not found for the requested chain." } });
    }

    const dashboard = await assemblePortfolioDashboard({
      wallet,
      quoteAsset: input.quoteAsset,
      asOf: input.asOf ?? new Date(),
    });

    return res.status(200).json({ ok: true, data: dashboard, error: null });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        data: null,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid request input.",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message, code: i.code })),
        },
      });
    }
    return res.status(500).json({ ok: false, data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error." } });
  }
}
