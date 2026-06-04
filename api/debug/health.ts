type ApiRequest = { method?: string };
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed.' } });
  }

  const backendUrl = process.env.COINPULSE_BACKEND_URL;
  if (!backendUrl) {
    return res.status(503).json({ error: { code: 'backend_unavailable', message: 'COINPULSE_BACKEND_URL is not configured.' } });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/debug/health`);
    const contentType = upstream.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await upstream.json() : null;
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(503).json({ error: { code: 'backend_unavailable', message: 'Could not reach coinpulse-backend.' } });
  }
}
