const pending = new Map<string, number>();

export function scheduleLocalStorageWrite(key: string, value: string, delay = 500): void {
  const existing = pending.get(key);
  if (existing !== undefined) clearTimeout(existing);
  const timer = window.setTimeout(() => {
    try { localStorage.setItem(key, value); } catch {}
    pending.delete(key);
  }, delay);
  pending.set(key, timer);
}

export function flushLocalStorageWrites(): void {
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}

// Vite dev and Vercel production both rewrite /proxy/pulsechain/* to api.scan.pulsechain.com.
// Other hosts (custom domains, Capacitor, GitHub Pages, etc.) have no proxy, so fall back to direct.
export function resolveBlockscoutBase(): string {
  if (typeof window === 'undefined') return 'https://api.scan.pulsechain.com/api/v2';
  if (/electron/i.test(navigator.userAgent)) return 'https://api.scan.pulsechain.com/api/v2';
  const host = window.location.hostname;
  const hasProxy =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.vercel.dev');
  return hasProxy ? '/proxy/pulsechain/api/v2' : 'https://api.scan.pulsechain.com/api/v2';
}
