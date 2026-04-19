import React, { useState } from 'react';
import { Zap, ExternalLink, ChevronDown, ChevronUp, Copy, Check, Shield, Cpu, Globe, BookOpen } from 'lucide-react';

const CORE_TOKENS = [
  { symbol: 'PLS',  role: 'Native gas token',    contract: 'native',                                     decimals: 18, note: 'Used to pay all transaction fees on PulseChain' },
  { symbol: 'WPLS', role: 'Wrapped PLS',          contract: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', decimals: 18, note: 'ERC20 version of PLS for use in DeFi protocols' },
  { symbol: 'PLSX', role: 'PulseX DEX token',     contract: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', decimals: 18, note: 'Every trade on PulseX buys and burns PLSX — fixed supply decreasing over time' },
  { symbol: 'HEX',  role: 'Staking protocol (pHEX)', contract: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', decimals: 8, note: 'Fork copy of Ethereum HEX. Time-lock staking with T-share yield system' },
  { symbol: 'INC',  role: 'Farm incentive token', contract: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', decimals: 18, note: 'Earned by liquidity providers in PulseX farms. Decreasing inflation over time' },
  { symbol: 'PRVX', role: 'ProveX protocol token', contract: 'Loading',                                   decimals: 18, note: 'Fixed supply. Every ProveX swap/verification burns PRVX permanently' },
];

const BRIDGED_TOKENS = [
  { symbol: 'eHEX',  contract: '0x57fde0a71132198bbec939b98976993d8d89d225', note: 'HEX bridged from Ethereum. Cannot be staked in pHEX staking contract' },
  { symbol: 'pDAI',  contract: '0xefd766ccb38eaf1dfd701853bfce31359239f305', note: 'Bridged DAI — price is NOT $1.00, always check live price' },
  { symbol: 'pUSDC', contract: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', note: 'Bridged USDC — price is NOT $1.00' },
  { symbol: 'pUSDT', contract: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', note: 'Bridged USDT — price is NOT $1.00' },
  { symbol: 'pWETH', contract: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', note: 'Wrapped ETH bridged to PulseChain' },
  { symbol: 'pWBTC', contract: '0xb17d901469b9208b17d916112988a3fed19b5ca1', note: 'Wrapped BTC bridged to PulseChain' },
];

const IPFS_APPS = [
  { app: 'scan.pulsechain.com',       version: 'v1.1.1', hash: 'bafybeienxyoyrhn5tswclvd3gdjy5mtkkwmu37aqtml6onbf7xnb3o22pe' },
  { app: 'app.pulsex.com',            version: 'v1.1.4', hash: 'bafybeiaq4jgcpz4hdzwid6letizdnhijlp6lu5ivcjcp5vbgpgf54jknn4' },
  { app: 'bridge.pulsechain.com',     version: 'v1.1.3', hash: 'bafybeibtonmk7tnc7n7xccq34qt4achkidtyz7kjwnwkc4pjvmyz6k7u5i' },
  { app: 'ethhex.com',                version: 'v1.0.3', hash: 'bafybeifqfuknas4rravoy4r3lz56iumkjehhkluxwnnufyi4x7qwmixsnm' },
  { app: 'go.hex.com',                version: 'v2.0.2', hash: 'bafybeiclwakyfbrvfchifkwq3c5o2qjvapqcpfvemupjyk7l3s54lwltam' },
  { app: 'launchpad.pulsechain.com',  version: 'v1.1.0', hash: 'bafybeibx7n5nlzcwmxh7mgxvpb4dlsvylip62ac3cvbv7qia736hwdv4ja' },
];

const FAQS = [
  { q: 'What is PulseChain?', a: 'PulseChain (chain ID: 369) is a full Ethereum hard fork launched in 2023. It copied the entire Ethereum state at a specific block — every wallet, token, and smart contract. The native gas token is PLS. PulseChain is EVM-compatible, meaning it uses the same address format and tooling as Ethereum, but is a completely separate blockchain with lower fees and ~10 second block times.' },
  { q: 'Can I use my Ethereum wallet on PulseChain?', a: 'Yes. Because PulseChain forked Ethereum\'s state, every Ethereum address exists on PulseChain. Use the exact same wallet address and private key — just switch your wallet app to the PulseChain network (chain ID 369, RPC: https://rpc-pulsechain.g4mm4.io).' },
  { q: 'What happened to my tokens when PulseChain launched?', a: 'When PulseChain forked Ethereum, all token balances were copied for free. If you held 100 HEX on Ethereum, you also received 100 pHEX on PulseChain at the same address. These are separate tokens on different chains with independent prices.' },
  { q: 'What is the difference between pHEX and eHEX?', a: 'pHEX (0x2b591e...) is the fork copy of HEX that was on PulseChain from launch — it can be staked in the native HEX staking contract. eHEX (0x57fd0a...) is HEX bridged from Ethereum and has a different contract address. eHEX cannot be staked in the pHEX staking contract.' },
  { q: 'Are bridged stablecoins (pDAI, pUSDC, pUSDT) worth $1?', a: 'No. Bridged stablecoins on PulseChain trade at market prices and are not pegged to $1. Always check the live on-chain price before assuming their value. Never treat pDAI, pUSDC, or pUSDT as dollar equivalents.' },
  { q: 'What is HEX staking and what are T-shares?', a: 'HEX is a blockchain certificate of deposit. You lock ("stake") HEX for a chosen period (1 day to 5,555 days) and receive T-shares, which earn a daily portion of interest from the staking pool. Longer and larger stakes receive more T-shares. Stakes that end late incur penalties. T-shares are the unit of your share in the pool\'s daily payouts.' },
  { q: 'What is PLSX and why does it burn?', a: 'PLSX is the PulseX DEX token. 21% of every trading fee on PulseX is used to buy and permanently burn PLSX, reducing supply over time. The supply only ever decreases — it never inflates.' },
  { q: 'What is ProveX (PRVX)?', a: 'ProveX is Richard Heart\'s latest project. It\'s a browser extension enabling peer-to-peer crypto trading without intermediaries, using zero-knowledge proofs (ZKP2P). A buyer proves they paid from their bank; a seller proves they sent coins — smart contracts release funds automatically. Every successful swap burns PRVX, giving it a fixed deflationary supply.' },
  { q: 'What is IPFS and why does it matter for PulseChain apps?', a: 'IPFS (InterPlanetary File System) is a decentralized storage network. All official PulseChain apps are published to IPFS with a unique hash (CID). If the hash matches the official list, the app is byte-for-byte identical to the original. Access any app directly at https://ipfs.io/ipfs/<HASH> even if the domain is unavailable.' },
  { q: 'Do I need PLS to use PulseChain?', a: 'Yes. A small amount of PLS is required in your wallet to pay gas fees for any transaction on PulseChain. Gas fees on PulseChain are significantly lower than Ethereum.' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--fg-muted)', borderRadius: 4 }}>
      {copied ? <Check size={11} color="var(--accent)" /> : <Copy size={11} />}
    </button>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', fontWeight: 600, fontSize: 14, textAlign: 'left', gap: 12 }}>
        <span>{q}</span>
        {open ? <ChevronUp size={15} color="var(--fg-muted)" /> : <ChevronDown size={15} color="var(--fg-muted)" />}
      </button>
      {open && <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, paddingBottom: 14, margin: 0 }}>{a}</p>}
    </div>
  );
}

// ── Section with colored left border (pulsechainstats style) ──────────────────
function Section({ title, icon, color, badge, children }: {
  title: string; icon: React.ReactNode; color: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: `${color}0d`, borderBottom: `1px solid ${color}28`, borderLeft: `3px solid ${color}` }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${color}22`, color, border: `1px solid ${color}44` }}>{badge}</span>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function StatBox({ label, value, sub, color = 'var(--accent)' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `2px solid ${color}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const mono = { fontFamily: 'JetBrains Mono, monospace', fontSize: 11 } as React.CSSProperties;
const badge = (color: string) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${color}22`, color, border: `1px solid ${color}44` } as React.CSSProperties);

export default function PulseChainOfficialPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(0,255,159,0.035) 100%)',
        border: '1px solid var(--border)', borderTop: '3px solid var(--accent)',
        borderRadius: 16, padding: '28px 28px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={22} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)', margin: 0, letterSpacing: '-0.5px' }}>PulseChain</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '3px 0 0' }}>Official network info, core tokens, projects & verified apps</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatBox label="Chain ID" value="369" color="var(--accent)" />
          <StatBox label="Native Token" value="PLS" color="var(--accent)" />
          <StatBox label="Block Time" value="~10 sec" sub="Proof of Stake" color="var(--accent)" />
          <StatBox label="Consensus" value="PoS" sub="Validator network" color="var(--accent)" />
          <StatBox label="Fork of" value="Ethereum" sub="Full state copy" color="var(--accent)" />
          <StatBox label="Launched" value="2023" sub="Mainnet" color="var(--accent)" />
        </div>
      </div>

      {/* ── What is PulseChain ───────────────────────────────────────────────── */}
      <Section title="What is PulseChain?" icon={<Globe size={15} color="var(--accent)" />} color="var(--accent)">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.75, margin: '0 0 10px' }}>
          PulseChain is a full Ethereum hard fork launched in 2023. When it launched, it copied the entire Ethereum state — every wallet, every token, every smart contract — at a specific block. Every Ethereum address automatically had the same balances on PulseChain at no cost.
        </p>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.75, margin: '0 0 12px' }}>
          PulseChain is EVM-compatible — the same address format, tooling, and smart contract code works on both chains. The native gas token is <strong style={{ color: 'var(--fg)' }}>PLS</strong>. Fees are significantly lower than Ethereum.
        </p>
        <div style={{ background: 'rgba(0,255,159,0.06)', border: '1px solid var(--accent-border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: 'var(--fg-muted)' }}>
          ⚠️ <strong style={{ color: 'var(--fg)' }}>Important:</strong> PulseChain is NOT Ethereum. Tokens at the same contract address on both chains are separate assets with independent prices.
        </div>
      </Section>

      {/* ── Add to Wallet ────────────────────────────────────────────────────── */}
      <Section title="Add PulseChain to Your Wallet" icon={<Cpu size={15} color="var(--accent)" />} color="var(--accent)" badge="MetaMask / Rabby">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>Add these settings to MetaMask or any EVM-compatible wallet:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          {[
            { label: 'Network Name',   value: 'PulseChain' },
            { label: 'Chain ID',       value: '369' },
            { label: 'Currency Symbol', value: 'PLS' },
            { label: 'RPC (Primary)',  value: 'https://rpc-pulsechain.g4mm4.io' },
            { label: 'RPC (Backup)',   value: 'https://pulsechain.publicnode.com' },
            { label: 'Block Explorer', value: 'https://scan.pulsechain.com' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'var(--bg-elevated)', borderRadius: 8, gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', flexShrink: 0 }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <code style={{ ...mono, color: 'var(--fg)' }}>{value}</code>
                <CopyButton text={value} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Core Tokens ─────────────────────────────────────────────────────── */}
      <Section title="Core Tokens" icon={<Zap size={15} color="var(--accent)" />} color="var(--accent)" badge={`${CORE_TOKENS.length} tokens`}>
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Symbol', 'Role', 'Contract', 'Dec', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CORE_TOKENS.map((t, i) => (
                <tr key={t.symbol} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 12px', fontWeight: 800, color: 'var(--accent)', whiteSpace: 'nowrap', fontSize: 13 }}>{t.symbol}</td>
                  <td style={{ padding: '11px 12px', color: 'var(--fg)', whiteSpace: 'nowrap' }}>{t.role}</td>
                  <td style={{ padding: '11px 12px' }}>
                    {t.contract === 'native' || t.contract === 'Loading' ? (
                      <span style={{ ...mono, color: 'var(--fg-muted)' }}>{t.contract}</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <code style={{ ...mono, color: 'var(--fg-muted)' }}>{t.contract.slice(0, 8)}…{t.contract.slice(-4)}</code>
                        <CopyButton text={t.contract} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--fg-muted)', textAlign: 'center' }}>{t.decimals}</td>
                  <td style={{ padding: '11px 12px', color: 'var(--fg-muted)', lineHeight: 1.5 }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'rgba(247,57,255,0.05)', border: '1px solid rgba(247,57,255,0.2)', borderLeft: '3px solid #f739ff', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>
          ⚠️ Bridged stablecoins (pDAI, pUSDC, pUSDT) are <strong style={{ color: '#f739ff' }}>not pegged to $1</strong>. Always check live on-chain price.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Symbol', 'Contract', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRIDGED_TOKENS.map((t, i) => (
                <tr key={t.symbol} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 12px', fontWeight: 800, color: '#f739ff', whiteSpace: 'nowrap', fontSize: 13 }}>{t.symbol}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <code style={{ ...mono, color: 'var(--fg-muted)' }}>{t.contract.slice(0, 8)}…{t.contract.slice(-4)}</code>
                      <CopyButton text={t.contract} />
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--fg-muted)', lineHeight: 1.5 }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Official Projects ────────────────────────────────────────────────── */}
      <Section title="Official Projects" icon={<Zap size={15} color="var(--accent)" />} color="var(--accent)" badge="By Richard Heart">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {[
            { name: 'HEX', url: 'https://hex.com', color: '#f739ff', tag: 'Staking Protocol', desc: 'Blockchain certificate of deposit. Stake HEX for up to 5,555 days and earn T-share yield. Longer and larger stakes earn more. Late-ending stakes incur penalties — the first crypto designed to be a store of value through time-lock staking.' },
            { name: 'PulseX', url: 'https://pulsex.com', color: 'var(--accent)', tag: 'DEX', desc: 'The #1 DEX on PulseChain. Swap PRC20 tokens, provide liquidity, earn INC farming rewards. Trading fee: 0.29% — 76% to LPs, 21% to buy-and-burn PLSX. Available in V1 and V2.' },
            { name: 'PulseChain Bridge', url: 'https://bridge.pulsechain.com', color: '#627EEA', tag: 'Bridge', desc: 'Official bridge to move assets between Ethereum and PulseChain. Bridging creates wrapped tokens on PulseChain (e.g., ETH → pWETH). TVL tracked live on PulseChainStats bridge dashboard.' },
            { name: 'ProveX', url: 'https://provex-landing.vercel.app', color: '#f97316', tag: 'P2P Trading', desc: 'Browser extension for peer-to-peer crypto trading using zero-knowledge proofs. No middlemen — buyers prove payment, sellers prove delivery, smart contracts handle escrow. Every swap burns PRVX.' },
            { name: 'PulseChain Launchpad', url: 'https://launchpad.pulsechain.com', color: '#a855f7', tag: 'Validator Staking', desc: 'Official launchpad for becoming a PulseChain validator. Stake 32M PLS to run a validator node and earn staking rewards while helping secure the network.' },
            { name: 'PumpTires', url: 'https://pumptires.com', color: '#f59e0b', tag: 'Token Launchpad', desc: 'Official memecoin launchpad on PulseChain. Deflationary fee-burning model — platform fees buy and burn tokens. Track launch metrics and stats on PulseChainStats.' },
          ].map(p => (
            <div key={p.name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderTop: `2px solid ${p.color}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: p.color, flex: 1 }}>{p.name}</span>
                <span style={badge(p.color)}>{p.tag}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={13} /></a>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Richard Heart ───────────────────────────────────────────────────── */}
      <Section title="Richard Heart — Founder" icon={<BookOpen size={15} color="var(--accent)" />} color="var(--accent)">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.75, margin: '0 0 16px' }}>
          Richard Heart (born Richard James Schueler) is the founder of PulseChain, HEX, PulseX, and ProveX. Entrepreneur and author who built multiple blockchain projects aimed at decentralized finance and financial freedom.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {[
            'Founded HEX.com — blockchain certificate of deposit',
            'Founded PulseChain — Ethereum fork with lower fees',
            "Founded PulseX — PulseChain's primary DEX",
            'Founded ProveX — ZK-proof P2P trading',
            'Raised $27M+ for medical research',
            'Predicted Bitcoin peaks in 2017 and 2021',
            'Warned early about Celsius, BlockFi, and FTX failures',
            'Won complete SEC court dismissal (2025) — no settlement',
            'Purchased 555.55-carat Enigma Diamond, rebranded as The HEX.com Diamond',
            'Author of SciVive — self-help book on health and success',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 700 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Run a Node ──────────────────────────────────────────────────────── */}
      <Section title="Run a PulseChain Node" icon={<Cpu size={15} color="var(--accent)" />} color="var(--accent)">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, marginBottom: 14 }}>
          PulseChain provides a desktop application to run the original node software locally. Running your own node means you don't rely on third-party RPC providers — you query the chain directly.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {['Windows', 'Windows ARM', 'MacOS', 'Linux', 'Linux ARM', 'Download Checksums'].map(os => (
            <div key={os} style={{ padding: '7px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{os}</div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
          Download from <a href="https://pulsechain.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>pulsechain.com</a> — verify checksums before running.
        </p>
      </Section>

      {/* ── IPFS Apps ───────────────────────────────────────────────────────── */}
      <Section title="Official Apps on IPFS" icon={<Shield size={15} color="var(--accent)" />} color="var(--accent)" badge="Verified">
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, marginBottom: 14 }}>
          All official PulseChain apps are published to IPFS — a decentralized network that cannot be taken down. An IPFS hash (CID) is a unique fingerprint: if the hash matches, the app is byte-for-byte identical to the original. Access any app via <code style={mono}>https://ipfs.io/ipfs/&lt;HASH&gt;</code> even if the domain is down.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['App', 'Version', 'IPFS Hash (CID)'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IPFS_APPS.map((row, i) => (
                <tr key={row.hash} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 12px', fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap' }}>{row.app}</td>
                  <td style={{ padding: '11px 12px' }}><span style={badge('var(--accent)')}>{row.version}</span></td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <code style={{ ...mono, color: 'var(--fg-muted)', wordBreak: 'break-all' }}>{row.hash}</code>
                      <CopyButton text={row.hash} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <Section title="Frequently Asked Questions" icon={<BookOpen size={15} color="var(--accent)" />} color="var(--accent)" badge={`${FAQS.length} questions`}>
        {FAQS.map(item => <FaqItem key={item.q} {...item} />)}
      </Section>
    </div>
  );
}
