type ApiRequest = { method?: string; body?: unknown };
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed.' } });
  }

  const backendUrl = process.env.COINPULSE_BACKEND_URL;
  if (!backendUrl) {
    return res.status(503).json({ error: { code: 'backend_unavailable', message: 'COINPULSE_BACKEND_URL is not configured.' } });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/sync/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const contentType = upstream.headers.get('content-type') ?? '';
    let body: unknown = null;
    if (contentType.includes('application/json')) {
      try { body = await upstream.json(); } catch { /* empty body */ }
    }
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(503).json({ error: { code: 'backend_unavailable', message: 'Could not reach coinpulse-backend.' } });
  }
}
