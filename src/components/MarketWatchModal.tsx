import React, { useEffect, useCallback, useState } from 'react';
import { X, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Search, Link2, List } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(p: number | string | null | undefined): string {
  const n = typeof p === 'string' ? parseFloat(p) : (p ?? 0);
  if (!n || isNaN(n)) return '—';
  if (n < 0.000001) return `$${n.toFixed(10)}`;
  if (n < 0.0001)   return `$${n.toFixed(8)}`;
  if (n < 0.01)     return `$${n.toFixed(6)}`;
  if (n < 1)        return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

function fmtUsd(v: number | null | undefined): string {
  if (!v || isNaN(v)) return '—';
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ── core PulseChain token addresses to seed the watchlist ────────────────────

const CORE_ADDRESSES = [
  '0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
  '0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX
  '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', // INC
  '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // pHEX
  '0x57fde0a71132198bbec939b98976993d8d89d225', // eHEX
  '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', // pWETH
  '0xb17d901469b9208b17d916112988a3fed19b5ca1', // pWBTC
  '0xefd766ccb38eaf1dfd701853bfce31359239f305', // pDAI
  '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', // pUSDC
];

// ── types ─────────────────────────────────────────────────────────────────────

interface WatchPair {
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string };
  priceUsd: string | null;
  priceChange: { h1: number | null; h24: number | null };
  volume24h: number;
  liquidityUsd: number;
  marketCap: number | null;
  fdv: number | null;
  txns24h: number;
  imageUrl: string | null;
  dexScreenerUrl: string;
}

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  theme: 'dark' | 'light';
  onClose: () => void;
}

type SortKey = 'volume' | 'liquidity' | 'mcap' | 'change24h';

// ── component ─────────────────────────────────────────────────────────────────

// ── Watchlist URL parser ──────────────────────────────────────────────────────
// Accepts DexScreener shared watchlist URLs in any of these formats:
//   https://dexscreener.com/?watchlist=pulsechain_0xABC,ethereum_0xDEF
//   https://dexscreener.com/#/?watchlist=pulsechain_0xABC
//   https://dexscreener.com/pulsechain?watchlist=...   (with chain prefix in path)
function parseWatchlistUrl(raw: string): { chainId: string; pairAddr: string }[] | null {
  try {
    const url = new URL(raw.trim());
    // Try ?watchlist= from search params first
    let wl = url.searchParams.get('watchlist');
    // Also handle hash-based routing: /#/?watchlist=...
    if (!wl && url.hash) {
      try {
        const qMark = url.hash.indexOf('?');
        if (qMark !== -1) {
          const hashSearch = new URLSearchParams(url.hash.slice(qMark + 1));
          wl = hashSearch.get('watchlist');
        }
      } catch { /* ignore */ }
    }
    if (!wl) return null;
    const entries = wl.split(',').flatMap(s => {
      const trimmed = s.trim();
      const under = trimmed.indexOf('_');
      if (under < 1) return [];
      const chainId  = trimmed.slice(0, under).toLowerCase();
      const pairAddr = trimmed.slice(under + 1).toLowerCase();
      if (!chainId || !pairAddr) return [];
      return [{ chainId, pairAddr }];
    });
    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}

export function MarketWatchModal({ theme, onClose }: Props) {
  const [pairs, setPairs]       = useState<WatchPair[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState<SortKey>('volume');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Watchlist import state
  const [showImport, setShowImport]         = useState(false);
  const [importUrl, setImportUrl]           = useState('');
  const [importLoading, setImportLoading]   = useState(false);
  const [importError, setImportError]       = useState<string | null>(null);
  const [watchlistPairs, setWatchlistPairs] = useState<WatchPair[] | null>(null);

  const green = theme === 'dark' ? '#00FF9F' : '#059669';
  const red   = theme === 'dark' ? '#f43f5e' : '#dc2626';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Batch request for core PulseChain tokens
      const batchUrl = `https://api.dexscreener.com/latest/dex/tokens/${CORE_ADDRESSES.join(',')}`;
      const [batchRes, searchRes] = await Promise.allSettled([
        fetch(batchUrl),
        fetch('https://api.dexscreener.com/latest/dex/search?q=PLSX'),
      ]);

      const rawPairs: any[] = [];

      if (batchRes.status === 'fulfilled' && batchRes.value.ok) {
        const d = await batchRes.value.json();
        if (d.pairs) rawPairs.push(...d.pairs);
      }
      if (searchRes.status === 'fulfilled' && searchRes.value.ok) {
        const d = await searchRes.value.json();
        if (d.pairs) rawPairs.push(...d.pairs);
      }

      // Keep only PulseChain pairs
      const plsPairs = rawPairs.filter((p: any) => p.chainId === 'pulsechain');

      // Deduplicate by pairAddress, pick best (highest liquidity) per base token symbol
      const bySymbol = new Map<string, any>();
      for (const p of plsPairs) {
        const sym = p.baseToken?.symbol?.toUpperCase() ?? '';
        if (!sym || sym === 'WPLS') continue; // skip WPLS-as-base (it's always the quote)
        const existing = bySymbol.get(sym);
        if (!existing || (p.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
          bySymbol.set(sym, p);
        }
      }

      const result: WatchPair[] = Array.from(bySymbol.values()).map((p: any) => ({
        pairAddress: p.pairAddress,
        baseToken: p.baseToken,
        quoteToken: p.quoteToken,
        priceUsd: p.priceUsd ?? null,
        priceChange: {
          h1:  p.priceChange?.h1  ?? null,
          h24: p.priceChange?.h24 ?? null,
        },
        volume24h:    p.volume?.h24 ?? 0,
        liquidityUsd: p.liquidity?.usd ?? 0,
        marketCap:    p.marketCap ?? p.fdv ?? null,
        fdv:          p.fdv ?? null,
        txns24h:      (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0),
        imageUrl:     p.info?.imageUrl ?? null,
        dexScreenerUrl: `https://dexscreener.com/pulsechain/${p.pairAddress}`,
      }));

      setPairs(result);
      setLastRefresh(new Date());
    } catch (e) {
      setError('Failed to load market data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Import a shared DexScreener watchlist ───────────────────────────────────
  function rawPairToWatchPair(p: any): WatchPair {
    return {
      pairAddress: p.pairAddress,
      baseToken:   p.baseToken,
      quoteToken:  p.quoteToken,
      priceUsd:    p.priceUsd ?? null,
      priceChange: { h1: p.priceChange?.h1 ?? null, h24: p.priceChange?.h24 ?? null },
      volume24h:    p.volume?.h24  ?? 0,
      liquidityUsd: p.liquidity?.usd ?? 0,
      marketCap:    p.marketCap ?? p.fdv ?? null,
      fdv:          p.fdv ?? null,
      txns24h:      (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0),
      imageUrl:     p.info?.imageUrl ?? null,
      dexScreenerUrl: `https://dexscreener.com/${p.chainId ?? 'pulsechain'}/${p.pairAddress}`,
    };
  }

  async function importWatchlist() {
    const entries = parseWatchlistUrl(importUrl);
    if (!entries) {
      setImportError('Invalid URL — paste a DexScreener watchlist share link, e.g. https://dexscreener.com/?watchlist=pulsechain_0x…');
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      // Group pair addresses by chainId for batch requests
      const byChain = new Map<string, string[]>();
      for (const { chainId, pairAddr } of entries) {
        if (!byChain.has(chainId)) byChain.set(chainId, []);
        byChain.get(chainId)!.push(pairAddr);
      }
      const raw: any[] = [];
      const failedChains: string[] = [];
      // Fetch up to 30 pairs per request per chain (DexScreener limit)
      await Promise.all(
        Array.from(byChain.entries()).map(async ([chainId, addrs]) => {
          for (let i = 0; i < addrs.length; i += 30) {
            const slice = addrs.slice(i, i + 30).join(',');
            try {
              const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${slice}`);
              if (!res.ok) { failedChains.push(chainId); continue; }
              const d = await res.json();
              if (Array.isArray(d.pairs)) raw.push(...d.pairs);
              else if (d.pair)            raw.push(d.pair);
            } catch {
              failedChains.push(chainId);
            }
          }
        })
      );
      if (raw.length === 0) {
        setImportError('No pairs found for this watchlist. The link may be expired or empty.');
        return;
      }
      setWatchlistPairs(raw.map(rawPairToWatchPair));
      if (failedChains.length > 0) {
        const unique = [...new Set(failedChains)].join(', ');
        setImportError(`Loaded ${raw.length} pair${raw.length !== 1 ? 's' : ''} — some chains failed to load: ${unique}`);
        setShowImport(true); // keep panel open to show partial-failure message
      } else {
        setShowImport(false);
        setImportUrl('');
      }
    } catch {
      setImportError('Failed to fetch watchlist pairs. Please check the link and try again.');
    } finally {
      setImportLoading(false);
    }
  }

  function clearWatchlist() {
    setWatchlistPairs(null);
    setSearch('');
  }

  // Source list — either the imported watchlist or the default PulseChain pairs
  const activePairs = watchlistPairs ?? pairs;

  // Filter + sort
  const displayed = React.useMemo(() => {
    let list = activePairs;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(p =>
        p.baseToken.symbol.toUpperCase().includes(q) ||
        p.baseToken.name.toUpperCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'volume')    return b.volume24h - a.volume24h;
      if (sortBy === 'liquidity') return b.liquidityUsd - a.liquidityUsd;
      if (sortBy === 'mcap')      return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      if (sortBy === 'change24h') return (b.priceChange.h24 ?? -Infinity) - (a.priceChange.h24 ?? -Infinity);
      return 0;
    });
  }, [activePairs, search, sortBy]);

  const SORT_OPTS: { key: SortKey; label: string }[] = [
    { key: 'volume',    label: 'Volume' },
    { key: 'liquidity', label: 'Liquidity' },
    { key: 'mcap',      label: 'MCap' },
    { key: 'change24h', label: '24H Change' },
  ];

  function ChangeCell({ val }: { val: number | null }) {
    if (val == null) return <span style={{ color: 'var(--fg-subtle)' }}>—</span>;
    const color = val >= 0 ? green : red;
    const Icon  = val >= 0 ? TrendingUp : TrendingDown;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
        <Icon size={11} />
        {val >= 0 ? '+' : ''}{val.toFixed(2)}%
      </span>
    );
  }

  return (
    <div className="mwm-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mwm-panel" role="dialog" aria-modal="true" aria-label="Market Watch">

        {/* ── Header ── */}
        <div className="mwm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="mwm-pulse-dot" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                Market Watch
              </div>
              {(() => {
                const subtitle = watchlistPairs
                  ? 'Imported watchlist · DexScreener'
                  : `PulseChain · live data from DexScreener${lastRefresh ? ' · updated ' + lastRefresh.toLocaleTimeString() : ''}`;
                return (
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 1 }}>{subtitle}</div>
                );
              })()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Import watchlist toggle */}
            <button
              className={`mwm-icon-btn${showImport ? ' mwm-icon-btn-active' : ''}`}
              onClick={() => { setShowImport(v => !v); setImportError(null); }}
              title="Import DexScreener watchlist link"
            >
              <Link2 size={15} />
            </button>
            {!watchlistPairs && (
              <button className="mwm-icon-btn" onClick={fetchData} disabled={loading} title="Refresh">
                <RefreshCw size={15} className={loading ? 'mwm-spin' : ''} />
              </button>
            )}
            <button className="mwm-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Import row ── */}
        {showImport && (
          <div className="mwm-import-row">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              Paste a DexScreener shared watchlist link
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                className="mwm-import-input"
                placeholder="https://dexscreener.com/?watchlist=pulsechain_0x…,ethereum_0x…"
                value={importUrl}
                onChange={e => { setImportUrl(e.target.value); setImportError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') importWatchlist(); }}
                autoFocus
              />
              <button
                className="mwm-sort-btn active"
                style={{ flexShrink: 0, height: 36, paddingLeft: 16, paddingRight: 16 }}
                onClick={importWatchlist}
                disabled={importLoading || !importUrl.trim()}
              >
                {importLoading ? <span className="mwm-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Load'}
              </button>
            </div>
            {importError && (
              <div style={{ fontSize: 11, color: red, marginTop: 6, lineHeight: 1.4 }}>{importError}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6, lineHeight: 1.5 }}>
              On DexScreener, open your watchlist → click <strong style={{ color: 'var(--fg-muted)' }}>Share</strong> → copy the URL and paste it here.
            </div>
          </div>
        )}

        {/* ── Imported watchlist banner ── */}
        {watchlistPairs && (
          <div className="mwm-watchlist-banner">
            <List size={13} style={{ flexShrink: 0 }} />
            <span>Showing imported watchlist &mdash; {watchlistPairs.length} pair{watchlistPairs.length !== 1 ? 's' : ''}</span>
            <button className="mwm-banner-clear" onClick={clearWatchlist}>
              <X size={11} style={{ marginRight: 3 }} /> Clear
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="mwm-toolbar">
          {/* Sort pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SORT_OPTS.map(({ key, label }) => (
              <button key={key} className={`mwm-sort-btn${sortBy === key ? ' active' : ''}`}
                onClick={() => setSortBy(key)}>
                {label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            <input
              className="mwm-search"
              placeholder="Search token…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mwm-body">
          {loading && !watchlistPairs && pairs.length === 0 && (
            <div className="mwm-state-center">
              <div className="mwm-spinner" />
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--fg-subtle)' }}>Loading PulseChain market data…</div>
            </div>
          )}

          {error && !loading && !watchlistPairs && (
            <div className="mwm-state-center">
              <div style={{ fontSize: 13, color: red, marginBottom: 12 }}>{error}</div>
              <button className="mwm-sort-btn active" onClick={fetchData}>Retry</button>
            </div>
          )}

          {!loading && displayed.length === 0 && (
            <div className="mwm-state-center">
              <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>
                {search ? `No tokens match "${search}"` : 'No data available'}
              </div>
            </div>
          )}

          {displayed.length > 0 && (
            <div className="mwm-table-wrap">
              <table className="mwm-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>Token</th>
                    <th className="mwm-th-right">Price</th>
                    <th className="mwm-th-right mwm-col-hide-xs">1H</th>
                    <th className="mwm-th-right">24H</th>
                    <th className="mwm-th-right mwm-col-hide-sm">Volume 24H</th>
                    <th className="mwm-th-right mwm-col-hide-sm">Liquidity</th>
                    <th className="mwm-th-right mwm-col-hide-xs">MCap</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p, i) => (
                    <tr key={p.pairAddress} className="mwm-row">
                      <td className="mwm-rank">{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', fontSize: 12, fontWeight: 800, color: 'var(--fg-muted)',
                          }}>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.baseToken.symbol}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : p.baseToken.symbol[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.2 }}>
                              {p.baseToken.symbol}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.baseToken.name}
                              <span style={{ marginLeft: 4, opacity: 0.55 }}>/{p.quoteToken.symbol}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="mwm-td-mono mwm-td-right">{fmtPrice(p.priceUsd)}</td>
                      <td className="mwm-td-right mwm-col-hide-xs"><ChangeCell val={p.priceChange.h1} /></td>
                      <td className="mwm-td-right"><ChangeCell val={p.priceChange.h24} /></td>
                      <td className="mwm-td-mono mwm-td-right mwm-col-hide-sm">{fmtUsd(p.volume24h)}</td>
                      <td className="mwm-td-mono mwm-td-right mwm-col-hide-sm" style={{ color: p.liquidityUsd > 0 ? green : undefined }}>
                        {fmtUsd(p.liquidityUsd)}
                      </td>
                      <td className="mwm-td-mono mwm-td-right mwm-col-hide-xs">{fmtUsd(p.marketCap)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <a href={p.dexScreenerUrl} target="_blank" rel="noopener noreferrer"
                          className="mwm-ds-link" title="Open on DexScreener">
                          <ExternalLink size={13} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mwm-footer">
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
            {displayed.length} token{displayed.length !== 1 ? 's' : ''} · Data from DexScreener
            {!watchlistPairs && ' · PulseChain only'}
          </span>
          <button className="tcm-close-text-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
