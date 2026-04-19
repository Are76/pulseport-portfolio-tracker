import React, { useState } from 'react';
import { Layers, ExternalLink, ChevronDown, ChevronUp, BarChart2, Shield, Zap, Globe } from 'lucide-react';

const FEATURED_TOOLS = [
  {
    name: 'PulseX',      url: 'https://app.pulsex.com',      tag: 'Official DEX',      color: 'var(--accent)',
    desc: "PulseChain's primary DEX. Swap PRC20 tokens, add liquidity, and earn INC farming rewards. 0.29% fee — 76% to LPs, 21% burns PLSX. Available in V1 and V2.",
  },
  {
    name: 'LibertySwap', url: 'https://libertyswap.finance', tag: 'Privacy Bridge',     color: '#a855f7',
    desc: 'Intent-based cross-chain DEX with ZK privacy. Non-custodial, 0.3% fee, $10–$25K per swap, ~2–3 min. Bridges PulseChain ↔ Ethereum, Base, Arbitrum, BNB, Polygon, Optimism, Solana.',
  },
  {
    name: 'ProveX',      url: 'https://app.provex.com',      tag: 'ZK P2P Trading',    color: '#f97316',
    desc: "Richard Heart's browser extension for peer-to-peer crypto trading with zero-knowledge proofs. No intermediaries — buyers prove bank payment, sellers prove coin transfer. Every swap burns PRVX.",
  },
  {
    name: 'LASO Finance', url: 'https://laso.finance',       tag: 'DeFi Protocol',     color: '#06b6d4',
    desc: 'DeFi protocol on PulseChain offering advanced trading and liquidity tools for the ecosystem.',
  },
  {
    name: 'Peer.xyz',    url: 'https://peer.xyz',            tag: 'P2P Platform',      color: '#627EEA',
    desc: 'Peer-to-peer trading and social platform for crypto. Enables direct asset transfers and community trading without centralized intermediaries.',
  },
];

const DEXS = [
  { name: 'PulseX V1 / V2',  url: 'https://app.pulsex.com', tag: 'Official DEX',           color: 'var(--accent)', desc: 'The primary DEX on PulseChain. 0.29% trading fee — 76% to LPs, 21% burns PLSX. V2 offers improved routing.' },
  { name: '9INCH / 9MM V3',  url: 'https://9inch.io',       tag: 'Concentrated Liquidity', color: '#627EEA',       desc: 'Uniswap V3-style DEX with concentrated liquidity positions for higher capital efficiency.' },
  { name: 'PHUX',            url: 'https://phux.io',        tag: 'Balancer Fork',          color: '#a855f7',       desc: 'Balancer fork on PulseChain — supports weighted pools and multi-token liquidity.' },
  { name: 'Tide',            url: '#',                      tag: 'Balancer Fork',          color: '#06b6d4',       desc: 'Another Balancer-style fork providing multi-asset pool trading.' },
  { name: 'EazySwap',        url: '#',                      tag: 'DEX',                    color: '#f59e0b',       desc: 'Alternative DEX for token swapping on PulseChain.' },
  { name: 'RichardSwap',     url: '#',                      tag: 'DEX',                    color: '#f739ff',       desc: 'Community-run DEX on PulseChain.' },
  { name: 'GoPulseX',        url: '#',                      tag: 'Aggregator',             color: 'var(--accent)', desc: 'DEX aggregator / frontend for finding best swap routes across PulseChain DEXs.' },
  { name: 'LASO Finance',    url: 'https://laso.finance',   tag: 'DeFi Protocol',          color: '#06b6d4',       desc: 'DeFi protocol on PulseChain with advanced trading and liquidity tools.' },
  { name: 'Peer.xyz',        url: 'https://peer.xyz',       tag: 'P2P Platform',           color: '#627EEA',       desc: 'Peer-to-peer trading and social platform for crypto — direct asset transfers without intermediaries.' },
];

const DEFI = [
  { name: 'Liquid Loans',   url: 'https://liquidloans.io', tag: 'Lending',           color: 'var(--accent)', desc: 'Deposit PLS as collateral to borrow USDL interest-free. Similar to Liquity/MakerDAO on Ethereum.' },
  { name: 'Hedron',         url: 'https://hedron.pro',     tag: 'HEX Tooling',       color: '#f739ff',       desc: 'Tokenizes HEX stakes as HSI (HEX Stake Instance) tokens that can be traded or used in DeFi, making illiquid stakes transferable.' },
  { name: 'Maximus',        url: 'https://maximus.farm',   tag: 'HEX Staking Pool',  color: '#f59e0b',       desc: 'Community-run shared HEX staking pools. Variants: Base, Deci, Lucky, Perpetuals, Poly, Pool Party, Trio.' },
  { name: 'PHIAT',          url: '#',                      tag: 'AAVE Fork',         color: '#627EEA',       desc: 'AAVE fork on PulseChain — lending and borrowing with interest rate markets.' },
  { name: 'INCprinter',     url: '#',                      tag: 'Lending',           color: '#06b6d4',       desc: 'Lending and borrowing protocol on PulseChain.' },
  { name: 'FLEX Protocol',  url: '#',                      tag: 'DeFi',              color: '#a855f7',       desc: 'DeFi protocol on PulseChain.' },
  { name: 'EARN Protocol',  url: '#',                      tag: 'Yield',             color: '#f97316',       desc: 'Yield-generating protocol on PulseChain.' },
  { name: 'Vouch',          url: '#',                      tag: 'Liquid Staking',    color: 'var(--accent)', desc: 'Liquid staking on PulseChain — stake PLS while keeping liquidity via a tradeable receipt token.' },
  { name: 'Phame',          url: '#',                      tag: 'GMX Fork',          color: '#f739ff',       desc: 'GMX-style perpetuals trading fork on PulseChain.' },
];

const BRIDGES = [
  { name: 'Official PulseChain Bridge',      url: 'https://bridge.pulsechain.com',  tag: 'Official',       color: 'var(--accent)', desc: 'Primary bridge between Ethereum and PulseChain. Bridging creates wrapped tokens (e.g., ETH → pWETH). Track TVL and flows on PulseChainStats.' },
  { name: 'Hyperlane',                       url: 'https://hyperlane.xyz',          tag: 'Cross-Chain',    color: '#627EEA',       desc: 'Connects PulseChain to 160+ blockchains. Permissionless messaging protocol with warp routes for token bridging.' },
  { name: 'BlockBlend',                      url: '#',                              tag: 'Privacy Bridge', color: '#f739ff',       desc: 'Privacy-focused bridge for moving assets across chains with enhanced anonymity.' },
  { name: 'Gibs Finance',                    url: '#',                              tag: 'Privacy Bridge', color: '#06b6d4',       desc: 'Privacy bridge for cross-chain transfers.' },
  { name: 'TokensEx',                        url: '#',                              tag: 'BSC Bridge',     color: '#f59e0b',       desc: 'Bridge connecting PulseChain to Binance Smart Chain.' },
  { name: 'PortalX / StealthEX / SimpleSwap', url: '#',                             tag: 'CEX Bridge',     color: 'var(--fg-muted)', desc: 'Centralized swap services that support PulseChain assets.' },
];

const ANALYTICS_EXTRA = [
  { name: 'DexScreener', url: 'https://dexscreener.com', tag: 'Price Charts',    color: '#f59e0b', desc: 'DEX price charts and pair analytics for PulseChain tokens. Good for quick price checks.' },
  { name: 'DeFi Llama',  url: 'https://defillama.com',  tag: 'TVL',             color: '#06b6d4', desc: 'Total Value Locked by protocol across PulseChain DeFi ecosystem.' },
  { name: 'DeBank',      url: 'https://debank.com',     tag: 'Portfolio',        color: '#627EEA', desc: 'Multi-chain portfolio tracker with PulseChain support.' },
  { name: 'Koinly',      url: 'https://koinly.io',      tag: 'Tax & Portfolio', color: '#a855f7', desc: 'Crypto tax reporting and portfolio tracking, supports PulseChain transactions.' },
];

const WALLETS = [
  { name: 'MetaMask',        url: 'https://metamask.io',  tag: 'Browser/Mobile',     color: '#f97316',       desc: 'Most widely used EVM wallet. Add PulseChain as a custom network (Chain ID 369) to use with PulseChain dApps.' },
  { name: 'Rabby Wallet',    url: 'https://rabby.io',     tag: 'Multi-Chain',         color: '#627EEA',       desc: 'Multi-chain wallet with built-in PulseChain support and security features.' },
  { name: 'The Pulse Wallet', url: '#',                   tag: 'PulseChain Native',   color: 'var(--accent)', desc: 'Wallet built specifically for the PulseChain ecosystem.' },
  { name: 'Tangem',          url: 'https://tangem.com',  tag: 'Hardware',            color: '#a855f7',       desc: 'Hardware wallet card supporting PulseChain — cold storage for secure long-term holding.' },
];

const ONRAMPS = [
  { name: 'RampNow',    url: 'https://rampnow.io',      tag: 'Fiat On/Off Ramp',  color: '#f59e0b', desc: 'Direct fiat-to-PulseChain ramp — PLS, HEX, 1,500+ tokens, 60+ chains. Apple Pay, Google Pay, iDEAL. 160 countries.' },
  { name: 'ChangeNow',  url: 'https://changenow.io',    tag: 'Crypto Swap',       color: '#06b6d4', desc: 'Non-custodial crypto exchange with 1,400+ currencies including PLS. No registration, unlimited amounts.' },
  { name: '0xCoast',    url: 'https://0xcoast.com',     tag: 'CST Stablecoin',    color: 'var(--accent)', desc: 'Direct fiat on/off ramp using the CST stablecoin. Buy and sell PulseChain assets with fiat — no bridges required.' },
  { name: 'Guardarian', url: 'https://guardarian.com',  tag: 'EU Licensed',       color: '#a855f7', desc: 'EU-regulated fiat-to-crypto service supporting PulseChain assets via card and bank transfer.' },
];

const NFTS = [
  { name: 'Mintra',       url: 'https://mintra.ai', tag: 'Marketplace', color: 'var(--accent)', desc: 'Primary NFT marketplace on PulseChain — buy, sell, and mint NFTs.' },
  { name: 'BeatBox',      url: '#',                 tag: 'Marketplace', color: '#f739ff',       desc: 'NFT marketplace on PulseChain.' },
  { name: 'PulseMarket',  url: '#',                 tag: 'Marketplace', color: '#627EEA',       desc: 'NFT trading platform on PulseChain.' },
  { name: 'PulseCats',    url: '#',                 tag: 'Collection',  color: '#f59e0b',       desc: 'Popular NFT collection on PulseChain.' },
  { name: 'Pulse Punks',  url: '#',                 tag: 'Collection',  color: '#a855f7',       desc: 'PulseChain-native NFT collection.' },
  { name: 'Rentomania',   url: '#',                 tag: 'Game',        color: '#06b6d4',       desc: 'Blockchain-based game on PulseChain.' },
];

const DEVTOOLS = [
  { name: 'Moralis',           url: 'https://moralis.io',   tag: 'Web3 Dev',     color: '#627EEA',       desc: 'Web3 development platform with PulseChain APIs, data indexing, and SDK.' },
  { name: 'NOWnodes',          url: 'https://nownodes.io',  tag: 'RPC Nodes',    color: '#f59e0b',       desc: 'RPC node provider for PulseChain — use their endpoints in your dApps.' },
  { name: 'Dextools',          url: 'https://dextools.io',  tag: 'Analytics',    color: '#06b6d4',       desc: 'Token analytics, charts, and pair explorer for PulseChain DEXs.' },
  { name: 'Fetch Oracle',      url: '#',                    tag: 'Price Oracle', color: 'var(--accent)', desc: 'On-chain price oracle providing reliable price feeds for PulseChain smart contracts.' },
  { name: 'GoRealDefi',        url: '#',                    tag: 'DeFi Tools',   color: '#a855f7',       desc: 'Tools for interacting with PulseChain DeFi.' },
  { name: 'Pulse Domains (.pls)', url: '#',                 tag: 'Web3 Identity', color: '#f739ff',      desc: 'ENS-style naming service for PulseChain — register a human-readable .pls domain.' },
];

const COMMUNITY = [
  { name: 'PulseCoinList',  url: 'https://pulsecoinlist.com', tag: 'Directory',   color: 'var(--accent)', desc: 'Comprehensive ecosystem directory with 80+ verified PulseChain projects, analytics, and live supply/gas tracking.' },
  { name: 'PLSFolio',       url: 'https://plsfolio.com',      tag: 'Ecosystem',   color: '#627EEA',       desc: 'PulseChain ecosystem explorer and portfolio tool.' },
  { name: 'HowToPulse',     url: '#',                         tag: 'Education',   color: '#f59e0b',       desc: 'Educational guides and tutorials for new users entering the PulseChain ecosystem.' },
  { name: 'PulseTV',        url: '#',                         tag: 'Video',       color: '#f739ff',       desc: 'Video content, community streams, and ecosystem news.' },
  { name: 'PulseConference', url: '#',                        tag: 'Events',      color: '#a855f7',       desc: 'Ecosystem events, conferences, and community meetups.' },
];

const FAQS = [
  { q: 'What is PulseX and how does it work?', a: "PulseX is PulseChain's official DEX. Users can swap PRC20 tokens, provide liquidity, and stake LP tokens in farms to earn INC rewards. Trading fee is 0.29% — 76% goes to LPs, 21% buys and burns PLSX. It has two versions: V1 and V2 with improved routing." },
  { q: 'What is LibertySwap and how is it different from other bridges?', a: 'LibertySwap is an intent-based cross-chain DEX that uses zero-knowledge proofs for privacy. Unlike standard bridges, it never takes custody of your assets and transaction data is deleted after 48 hours. It has a gasless mode, a 0.3% fee, and supports swaps between PulseChain and other EVM chains including Base. Min $10, max $25,000.' },
  { q: 'What is Hedron and why would I use it?', a: "Hedron allows HEX stakers to tokenize their stakes as HSI tokens. Normal HEX stakes are illiquid — you can't transfer them. Hedron wraps them into tradeable tokens so you can sell or use a stake in DeFi without ending it early and triggering penalties." },
  { q: 'What is Maximus?', a: 'Maximus is a set of community-run shared HEX staking pools. Instead of staking HEX individually, you contribute to a shared pool and receive Maximus tokens representing your share. Pool variants include Base, Deci, Lucky, Perpetuals, Poly, Pool Party, and Trio.' },
  { q: 'What is INC and where do I earn it?', a: 'INC is the PulseX farm incentive token. Liquidity providers who stake their LP tokens in PulseX farms earn INC continuously. It has decreasing inflation over time and PLSX holders vote via DAO on which pairs receive INC incentives.' },
  { q: 'How are the Token League tiers determined?', a: 'Token leagues on PulseChainStats rank holders by what percentage of the total supply they hold: Poseidon (10%), Whale (1%), Shark (0.1%), Dolphin (0.01%), Squid (0.001%), Turtle (0.0001%).' },
  { q: 'What are the PulseChainStats bridge stats tracking?', a: 'The bridge-stats dashboard tracks official bridge TVL with 24h/7d/30d changes, top 5 and top 10 tokens bridged in/out by USD volume, daily net flow, Hyperlane USDC activity, and CST stablecoin supply growth as a proxy for fiat adoption.' },
  { q: 'What is the CST stablecoin?', a: 'CST is a stablecoin issued by 0xCoast, which operates a direct fiat on/off ramp for PulseChain. CST supply growth is tracked on PulseChainStats as a measure of real-world fiat adoption.' },
  { q: 'How do I get on-chain price data accurately?', a: 'The most accurate method is querying LP reserves directly via RPC (eth_call, getReserves selector 0x0902f1ac). For PLS/USD: use the WPLS/DAI, WPLS/USDC, and WPLS/USDT pairs — take the highest (most liquidity = most reliable). DexScreener and PulseX subgraph can lag.' },
  { q: 'Are there privacy options for trading on PulseChain?', a: 'Yes. LibertySwap offers private trading via ZK proofs. BlockBlend and Gibs Finance also offer privacy-focused bridging options for cross-chain transfers.' },
];

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

// ── Shared design primitives ──────────────────────────────────────────────────
const PINK = '#f739ff';

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

function StatBox({ label, value, color = PINK }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderBottom: `2px solid ${color}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function ProjectGrid({ items }: { items: { name: string; url: string; tag: string; color: string; desc: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      {items.map(p => (
        <div key={p.name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid ${p.color}`, borderRadius: '0 10px 10px 0', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: p.color, flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44`, whiteSpace: 'nowrap' }}>{p.tag}</span>
            {p.url !== '#' && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)', flexShrink: 0 }}><ExternalLink size={13} /></a>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function PulseChainCommunityPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(247,57,255,0.03) 100%)',
        border: '1px solid var(--border)', borderTop: `3px solid ${PINK}`,
        borderRadius: 16, padding: '28px 28px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(247,57,255,0.1)', border: '1px solid rgba(247,57,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={22} color={PINK} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)', margin: 0, letterSpacing: '-0.5px' }}>PulseChain Ecosystem</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '3px 0 0' }}>DEXs, DeFi, bridges, analytics, wallets, NFTs & community resources</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <StatBox label="Projects Listed" value="80+" />
          <StatBox label="Active DEXs" value="7+" color="#627EEA" />
          <StatBox label="DeFi Protocols" value="9+" color="#f97316" />
          <StatBox label="Bridge Options" value="7+" color="#a855f7" />
          <StatBox label="Wallet Options" value="4" color="var(--accent)" />
          <StatBox label="NFT Marketplaces" value="3" color="#f59e0b" />
        </div>
      </div>

      {/* ── Featured Tools ──────────────────────────────────────────────────── */}
      <Section title="Essential Tools" icon={<Zap size={15} color="var(--accent)" />} color="var(--accent)" badge="Must Know">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {FEATURED_TOOLS.map(p => (
            <div key={p.name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderTop: `2px solid ${p.color}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: p.color, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44`, whiteSpace: 'nowrap' as const }}>{p.tag}</span>
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={13} /></a>
              </div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── DEXs ────────────────────────────────────────────────────────────── */}
      <Section title="Decentralized Exchanges" icon={<Zap size={15} color={PINK} />} color={PINK} badge={`${DEXS.length} DEXs`}>
        <ProjectGrid items={DEXS} />
      </Section>

      {/* ── DeFi Protocols ──────────────────────────────────────────────────── */}
      <Section title="DeFi Protocols" icon={<BarChart2 size={15} color="#f97316" />} color="#f97316" badge={`${DEFI.length} protocols`}>
        <ProjectGrid items={DEFI} />
      </Section>

      {/* ── Bridges ─────────────────────────────────────────────────────────── */}
      <Section title="Bridges & Cross-Chain" icon={<Globe size={15} color="#a855f7" />} color="#a855f7" badge={`${BRIDGES.length + 1} options`}>
        {/* Liberty Swap feature card */}
        <div style={{
          background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.25)',
          borderLeft: '3px solid #a855f7', borderRadius: '0 12px 12px 0',
          padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Shield size={14} color="#a855f7" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#a855f7', flex: 1 }}>LibertySwap — Privacy-First Cross-Chain DEX</span>
            <a href="https://libertyswap.finance" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={12} /></a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Intent-based, non-custodial cross-chain exchange with on-chain zero-knowledge privacy. LibertySwap never holds your assets. Transaction data is automatically deleted after 48 hours.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Protocol Fee', value: '0.3%' },
              { label: 'Min / Max', value: '$10 / $25K' },
              { label: 'Swap Time', value: '~2–3 min' },
              { label: 'Gas', value: 'Gasless mode' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>Supported tokens:</strong> USDC, PLS, WETH, PLSX, HEX, INC, PCOCK, pDAI, eHEX, PRVX, ZERØ — also supports Base chain
          </div>
        </div>

        <ProjectGrid items={BRIDGES} />
      </Section>

      {/* ── Analytics ───────────────────────────────────────────────────────── */}
      <Section title="Analytics & Data Tools" icon={<BarChart2 size={15} color="var(--accent)" />} color="var(--accent)">
        {/* PulseChainStats feature card */}
        <div style={{
          background: 'rgba(0,255,159,0.04)', border: '1px solid var(--accent-border)',
          borderLeft: '3px solid var(--accent)', borderRadius: '0 12px 12px 0',
          padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <BarChart2 size={14} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)', flex: 1 }}>PulseChainStats — Complete Analytics Suite</span>
            <a href="https://pulsechainstats.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={12} /></a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
            The #1 PulseChain analytics platform. Real-time on-chain data — token prices, bridge flows, validator stats, DEX volumes, HEX staking, social intelligence. No paywall.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 }}>
            {[
              { path: '/intel',        label: 'Intel Dashboard', desc: 'Live pricing, TVL, gas stats, daily users, validator APR, PulseX volumes, burn metrics, ecosystem directory.' },
              { path: '/tokenintel',   label: 'Token Intel',     desc: 'Deep analytics for PLS, HEX, PLSX, INC, PRVX. Price charts (24h–all-time), ROI from launch, burn rates, holder counts.' },
              { path: '/bridge-stats', label: 'Bridge Stats',    desc: 'Bridge TVL, top bridged tokens, daily/monthly inflows/outflows, Hyperlane USDC activity, CST growth.' },
              { path: '/richardheart', label: 'Richard Heart',   desc: 'RH project stats, social metrics, and ecosystem performance by founder.' },
            ].map(({ path, label, desc }) => (
              <a key={path} href={`https://pulsechainstats.com${path}`} target="_blank" rel="noopener noreferrer"
                style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', textDecoration: 'none', display: 'block', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {label} <ExternalLink size={10} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{desc}</div>
              </a>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Token League Tiers (% of supply held)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { tier: 'Poseidon', pct: '10%', color: '#f739ff' },
                { tier: 'Whale',    pct: '1%',  color: '#627EEA' },
                { tier: 'Shark',    pct: '0.1%', color: '#06b6d4' },
                { tier: 'Dolphin',  pct: '0.01%', color: 'var(--accent)' },
                { tier: 'Squid',    pct: '0.001%', color: '#f59e0b' },
                { tier: 'Turtle',   pct: '0.0001%', color: '#a855f7' },
              ].map(({ tier, pct, color }) => (
                <div key={tier} style={{ padding: '4px 10px', borderRadius: 100, background: `${color}18`, border: `1px solid ${color}44`, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color }}>{tier}</span>
                  <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>≥{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProjectGrid items={ANALYTICS_EXTRA} />
      </Section>

      {/* ── Wallets ──────────────────────────────────────────────────────────── */}
      <Section title="Wallets" icon={<Shield size={15} color="#627EEA" />} color="#627EEA" badge={`${WALLETS.length} options`}>
        <ProjectGrid items={WALLETS} />
      </Section>

      {/* ── On-Ramps ─────────────────────────────────────────────────────────── */}
      <Section title="Fiat On/Off Ramps" icon={<Zap size={15} color="#f59e0b" />} color="#f59e0b" badge={`${ONRAMPS.length} services`}>
        <ProjectGrid items={ONRAMPS} />
      </Section>

      {/* ── NFTs ─────────────────────────────────────────────────────────────── */}
      <Section title="NFTs & Gaming" icon={<Layers size={15} color="#f739ff" />} color="#f739ff">
        <ProjectGrid items={NFTS} />
      </Section>

      {/* ── Dev Tools ────────────────────────────────────────────────────────── */}
      <Section title="Developer Tools & Infrastructure" icon={<BarChart2 size={15} color="#06b6d4" />} color="#06b6d4">
        <ProjectGrid items={DEVTOOLS} />
      </Section>

      {/* ── Community ────────────────────────────────────────────────────────── */}
      <Section title="Community & Education" icon={<Globe size={15} color="var(--accent)" />} color="var(--accent)">
        <ProjectGrid items={COMMUNITY} />
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <Section title="Frequently Asked Questions" icon={<Layers size={15} color={PINK} />} color={PINK} badge={`${FAQS.length} questions`}>
        {FAQS.map(item => <FaqItem key={item.q} {...item} />)}
      </Section>
    </div>
  );
}
