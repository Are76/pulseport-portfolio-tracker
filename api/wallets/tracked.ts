import { listTrackedWallets } from "../../src/services/api/wallets";

type Req = { method?: string };
type Res = { status: (code: number) => Res; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed." } });
  }

  try {
    const wallets = await listTrackedWallets();
    return res.status(200).json({ data: { schemaVersion: "v1", wallets } });
  } catch {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error." } });
  }
}
