import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, ExternalLink, ChevronDown, ChevronUp, RefreshCcw, Shield, Zap, CreditCard, ArrowUpDown } from 'lucide-react';

// ── Official bridge tokens (PulseChain side total supply = amount bridged) ────
const BRIDGE_TOKENS = [
  { symbol: 'pWETH', name: 'Wrapped Ether',   address: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', decimals: 18, coingeckoId: 'ethereum',  color: '#627EEA' },
  { symbol: 'pDAI',  name: 'DAI Stablecoin',  address: '0xefd766ccb38eaf1dfd701853bfce31359239f305', decimals: 18, coingeckoId: 'dai',       color: '#f5a623' },
  { symbol: 'pUSDC', name: 'USD Coin',         address: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', decimals: 6,  coingeckoId: 'usd-coin',  color: '#2775ca' },
  { symbol: 'pUSDT', name: 'Tether USD',       address: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', decimals: 6,  coingeckoId: 'tether',    color: '#26a17b' },
  { symbol: 'pWBTC', name: 'Wrapped Bitcoin',  address: '0xb17d901469b9208b17d916112988a3fed19b5ca1', decimals: 8,  coingeckoId: 'bitcoin',   color: '#f7931a' },
  { symbol: 'eHEX',  name: 'HEX (bridged)',    address: '0x57fde0a71132198bbec939b98976993d8d89d225', decimals: 8,  coingeckoId: 'hex',       color: '#ff00ff' },
];

interface TokenData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  color: string;
  supply: number | null;
  price: number | null;
  tvl: number | null;
}

const SCANNER = 'https://api.scan.pulsechain.com/api';
const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price';

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtAmount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(4);
}

const s = {
  section: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  } as React.CSSProperties,
  title: {
    fontSize: 15, fontWeight: 700, color: 'var(--fg)',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
  } as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.6px',
  },
  tag: (color: string) => ({
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }),
};

// ── Accordion wrapper ─────────────────────────────────────────────────────────
function Section({ title, icon, color, badge, children, defaultOpen = true }:
  { title: string; icon: React.ReactNode; color: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={s.section}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', flex: 1, textAlign: 'left' }}>{title}</span>
        {badge && <span style={s.tag(color)}>{badge}</span>}
        {open ? <ChevronUp size={14} color="var(--fg-muted)" /> : <ChevronDown size={14} color="var(--fg-muted)" />}
      </button>
      {open && children}
    </div>
  );
}

// ── Bridge info card ──────────────────────────────────────────────────────────
function BridgeCard({ name, url, tag, color, desc, stats }: {
  name: string; url: string; tag: string; color: string;
  desc: string; stats?: { label: string; value: string }[];
}) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{name}</span>
        <span style={s.tag(color)}>{tag}</span>
        {url !== '#' && (
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 6, padding: '5px 9px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', marginTop: 1 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BridgeDashboardPage() {
  const [tokens, setTokens] = useState<TokenData[]>(
    BRIDGE_TOKENS.map(t => ({ ...t, supply: null, price: null, tvl: null }))
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch totalSupply for each token
      const supplyResults = await Promise.all(
        BRIDGE_TOKENS.map(async t => {
          try {
            const res = await fetch(`${SCANNER}?module=stats&action=tokensupply&contractaddress=${t.address}`);
            const data = await res.json();
            if (data.status === '1' && data.result) {
              return Number(BigInt(data.result)) / Math.pow(10, t.decimals);
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      // Fetch prices from CoinGecko
      const ids = [...new Set(BRIDGE_TOKENS.map(t => t.coingeckoId))].join(',');
      let prices: Record<string, number> = {};
      try {
        const res = await fetch(`${COINGECKO}?ids=${ids}&vs_currencies=usd`);
        const data = await res.json();
        Object.entries(data).forEach(([id, val]) => {
          prices[id] = (val as { usd: number }).usd;
        });
      } catch {
        // fallback: leave prices empty
      }

      setTokens(BRIDGE_TOKENS.map((t, i) => {
        const supply = supplyResults[i];
        const price = prices[t.coingeckoId] ?? null;
        const tvl = supply != null && price != null ? supply * price : null;
        return { ...t, supply, price, tvl };
      }));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalTvl = tokens.reduce((sum, t) => sum + (t.tvl ?? 0), 0);
  const knownTvl = tokens.some(t => t.tvl != null);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeftRight size={18} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>Bridge Hub</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Bridges, on-ramps, and cross-chain routes to PulseChain</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCcw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {lastUpdated && (
          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: '4px 0 0 48px' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Official Bridge TVL', value: knownTvl ? fmt(totalTvl) : '—', sub: 'Live on-chain data' },
          { label: 'Bridge Options', value: '3', sub: 'Official, Hyperlane, Liberty' },
          { label: 'On-Ramp Options', value: '4', sub: 'RampNow, ChangeNow, 0xCoast, Guardarian' },
          { label: 'Bridged Tokens', value: `${BRIDGE_TOKENS.length}+`, sub: 'Via official bridge' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={s.label}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', margin: '4px 0 2px' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Official PulseChain Bridge ────────────────────────────────────── */}
      <Section title="Official PulseChain Bridge" icon={<Zap size={14} color="var(--accent)" />} color="var(--accent)" badge="Live TVL">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, margin: '0 0 14px' }}>
          The official Ethereum ↔ PulseChain bridge (OmniBridge-based). Bridging from Ethereum mints a wrapped token on PulseChain at a different contract address. Bridged stablecoins (pDAI, pUSDC, pUSDT) are <strong style={{ color: 'var(--fg)' }}>not pegged to $1</strong> — always check live prices.
        </p>

        {/* TVL bar */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={s.label}>Total Bridged TVL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginTop: 3 }}>
              {loading && !knownTvl ? '—' : knownTvl ? fmt(totalTvl) : '—'}
            </div>
          </div>
          <a href="https://bridge.pulsechain.com" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', padding: '7px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 8 }}>
            Open Bridge <ExternalLink size={11} />
          </a>
        </div>

        {/* Token table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Token', 'Bridged Amount', 'Price', 'TVL', 'Contract'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.address} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: t.color, flexShrink: 0 }}>
                        {t.symbol[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--fg)' }}>{t.symbol}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {t.supply != null ? fmtAmount(t.supply) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {t.price != null ? (t.price < 0.001 ? `$${t.price.toFixed(8)}` : t.price < 1 ? `$${t.price.toFixed(6)}` : `$${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`) : '—'}
                  </td>
                  <td style={{ padding: '10px 10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: t.tvl != null ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                    {t.tvl != null ? fmt(t.tvl) : '—'}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <a
                      href={`https://scan.pulsechain.com/token/${t.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {t.address.slice(0, 6)}…{t.address.slice(-4)} <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
          TVL = total supply of each bridged token × current market price. Prices from CoinGecko. Supply from PulseChain scanner.
        </div>
      </Section>

      {/* ── Hyperlane ─────────────────────────────────────────────────────── */}
      <Section title="Hyperlane" icon={<ArrowUpDown size={14} color="#627EEA" />} color="#627EEA" badge="160+ Chains">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, margin: '0 0 14px' }}>
          Hyperlane is a permissionless interoperability layer connecting 160+ blockchains. It is deployed on PulseChain with a Mailbox contract for cross-chain messaging. Warp Routes allow native token bridging — USDC from Ethereum and other chains can be sent directly to PulseChain via Hyperlane's intent-based messaging.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Chains Connected', value: '160+', sub: 'Permissionless' },
            { label: 'PulseChain Domain ID', value: '369', sub: 'Same as Chain ID' },
            { label: 'Protocol', value: 'Open Source', sub: 'Modular security' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#627EEA' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>PulseChain Contract Addresses</div>
          {[
            { label: 'Mailbox', address: '0x56176C7Fb66FdD70ef962Ae53a46A226c7F6a2Cc' },
            { label: 'Interchain Gas Paymaster', address: '0xc996F4D7d7F39189921A08F3DaAf1b9ff0b20006' },
            { label: 'Merkle Tree Hook', address: '0x9DaC51dF95298453C7fb5b43233818CfA4604daC' },
          ].map(({ label, address }) => (
            <div key={address} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{label}</span>
              <a href={`https://scan.pulsechain.com/address/${address}`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                {address.slice(0, 8)}…{address.slice(-6)} <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="https://hyperlane.xyz" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#627EEA', textDecoration: 'none', padding: '7px 12px', background: 'rgba(98,126,234,0.1)', border: '1px solid rgba(98,126,234,0.3)', borderRadius: 8 }}>
            hyperlane.xyz <ExternalLink size={11} />
          </a>
          <a href="https://explorer.hyperlane.xyz/?search=pulsechain" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textDecoration: 'none', padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
            Hyperlane Explorer <ExternalLink size={11} />
          </a>
          <a href="https://nexus.hyperlane.xyz" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textDecoration: 'none', padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}>
            Nexus Bridge <ExternalLink size={11} />
          </a>
        </div>
      </Section>

      {/* ── Liberty Swap ──────────────────────────────────────────────────── */}
      <Section title="Liberty Swap" icon={<Shield size={14} color="#a855f7" />} color="#a855f7" badge="Privacy Bridge">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, margin: '0 0 14px' }}>
          Intent-based cross-chain DEX with zero-knowledge privacy. Unlike pool-based bridges, Liberty Swap never takes custody of your assets — independent executors fulfill orders on the destination chain. Transaction data is deleted after 48 hours.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Fee', value: '0.3%', sub: 'Flat on all swaps' },
            { label: 'Min / Max', value: '$10 – $25K', sub: 'Per transaction' },
            { label: 'Speed', value: '~2-3 min', sub: 'Typical settle time' },
            { label: 'Privacy', value: 'ZK Proofs', sub: 'Data deleted 48h' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#a855f7' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Supported Routes to PulseChain</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Ethereum', 'Base', 'Arbitrum', 'BNB Chain', 'Polygon', 'Optimism', 'Solana'].map(chain => (
              <span key={chain} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
                {chain} → PulseChain
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Router Contract (Base → PulseChain)</div>
          <a href="https://basescan.org/address/0xcf3d89aedd07ee94e5c45037581744e2d9f0b9fc" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            0xcf3d89aedd07ee94e5c45037581744e2d9f0b9fc <ExternalLink size={11} />
          </a>
        </div>

        <a href="https://libertyswap.finance" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#a855f7', textDecoration: 'none', padding: '7px 12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}>
          libertyswap.finance <ExternalLink size={11} />
        </a>
      </Section>

      {/* ── Fiat & Crypto On-Ramps ────────────────────────────────────────── */}
      <Section title="On-Ramps to PulseChain" icon={<CreditCard size={14} color="#f59e0b" />} color="#f59e0b" defaultOpen={false}>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, margin: '0 0 14px' }}>
          Direct fiat and crypto on-ramp services with native PulseChain support — buy PLS, HEX, and other PulseChain tokens directly.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          <BridgeCard
            name="RampNow"
            url="https://rampnow.io"
            tag="Fiat On/Off Ramp"
            color="#f59e0b"
            desc="Direct fiat-to-PulseChain ramp supporting PLS, HEX, and 1500+ tokens across 60+ chains. Accepts Apple Pay, Google Pay, iDEAL, and bank transfer. Lowest fees in market, 99% uptime, fully regulated."
            stats={[
              { label: 'Supported Chains', value: '60+' },
              { label: 'Tokens', value: '1,500+' },
              { label: 'Coverage', value: '160 countries' },
            ]}
          />
          <BridgeCard
            name="ChangeNow"
            url="https://changenow.io"
            tag="Crypto Swap"
            color="#06b6d4"
            desc="Non-custodial crypto exchange supporting 1,400+ currencies including PLS. No registration required, unlimited amounts, best available rates. Swap any crypto to PLS directly."
            stats={[
              { label: 'Currencies', value: '1,400+' },
              { label: 'Registration', value: 'Not Required' },
              { label: 'Custody', value: 'Non-custodial' },
            ]}
          />
          <BridgeCard
            name="0xCoast"
            url="https://0xcoast.com"
            tag="CST Stablecoin Ramp"
            color="var(--accent)"
            desc="Direct fiat on/off ramp for PulseChain using the CST stablecoin. Buy and sell PulseChain assets with bank fiat directly — no bridges required."
            stats={[
              { label: 'Stablecoin', value: 'CST' },
              { label: 'Route', value: 'Fiat ↔ PLS' },
            ]}
          />
          <BridgeCard
            name="Guardarian"
            url="https://guardarian.com"
            tag="Fiat Ramp"
            color="#a855f7"
            desc="EU-regulated fiat-to-crypto conversion service supporting PulseChain assets. Buy crypto with credit/debit cards and bank transfers."
            stats={[
              { label: 'Regulated', value: 'EU Licensed' },
              { label: 'Methods', value: 'Card + Bank' },
            ]}
          />
        </div>
      </Section>

      {/* ── Bridge Comparison ─────────────────────────────────────────────── */}
      <Section title="Bridge Comparison" icon={<ArrowLeftRight size={14} color="var(--fg-muted)" />} color="var(--fg-muted)" defaultOpen={false}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Bridge', 'Type', 'Fee', 'Speed', 'Privacy', 'TVL'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Official Bridge', type: 'Lock & Mint', fee: 'Gas only', speed: '~20 min', privacy: 'Public', tvl: knownTvl ? fmt(totalTvl) : '—', color: 'var(--accent)' },
                { name: 'Hyperlane',        type: 'Messaging',  fee: 'Gas + IGP', speed: '<5 min', privacy: 'Public', tvl: 'N/A',                      color: '#627EEA' },
                { name: 'Liberty Swap',     type: 'Intent',     fee: '0.3%',      speed: '2-3 min', privacy: 'ZK / Private', tvl: 'N/A (intent)', color: '#a855f7' },
              ].map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 700, color: row.color }}>{row.name}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg-muted)' }}>{row.type}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg)' }}>{row.fee}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg)' }}>{row.speed}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--fg-muted)' }}>{row.privacy}</td>
                  <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--fg)' }}>{row.tvl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
