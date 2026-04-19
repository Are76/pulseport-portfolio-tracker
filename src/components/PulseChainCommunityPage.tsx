import React, { useState } from 'react';
import { Layers, ExternalLink, ChevronDown, ChevronUp, BarChart2, Shield, Zap, Globe } from 'lucide-react';

const DEXS = [
  { name: 'PulseX V1 / V2', url: 'https://app.pulsex.com', tag: 'Official', color: 'var(--accent)', desc: 'The primary DEX on PulseChain. 0.29% trading fee — 76% to LPs, 21% burns PLSX. V2 offers improved routing.' },
  { name: '9INCH / 9MM V3', url: 'https://9inch.io', tag: 'Concentrated Liquidity', color: '#627EEA', desc: 'Uniswap V3-style DEX with concentrated liquidity positions for higher capital efficiency.' },
  { name: 'PHUX', url: 'https://phux.io', tag: 'Balancer Fork', color: '#a855f7', desc: 'Balancer fork on PulseChain — supports weighted pools and multi-token liquidity.' },
  { name: 'Tide', url: '#', tag: 'Balancer Fork', color: '#06b6d4', desc: 'Another Balancer-style fork providing multi-asset pool trading.' },
  { name: 'EazySwap', url: '#', tag: 'DEX', color: '#f59e0b', desc: 'Alternative DEX for token swapping on PulseChain.' },
  { name: 'RichardSwap', url: '#', tag: 'DEX', color: '#f739ff', desc: 'Community-run DEX on PulseChain.' },
  { name: 'GoPulseX', url: '#', tag: 'Aggregator', color: 'var(--accent)', desc: 'DEX aggregator / frontend for finding best swap routes across PulseChain DEXs.' },
];

const DEFI = [
  { name: 'Liquid Loans', url: 'https://liquidloans.io', tag: 'Lending', color: 'var(--accent)', desc: 'Deposit PLS as collateral to borrow USDL interest-free. Similar to Liquity/MakerDAO on Ethereum.' },
  { name: 'Hedron', url: 'https://hedron.pro', tag: 'HEX Tooling', color: '#f739ff', desc: 'Tokenizes HEX stakes as HSI (HEX Stake Instance) tokens that can be traded or used in DeFi, making illiquid stakes transferable.' },
  { name: 'Maximus', url: 'https://maximus.farm', tag: 'HEX Staking Pool', color: '#f59e0b', desc: 'Community-run shared HEX staking pools. Variants: Base, Deci, Lucky, Perpetuals, Poly, Pool Party, Trio. Lowers capital requirement for long-term staking.' },
  { name: 'PHIAT', url: '#', tag: 'AAVE Fork', color: '#627EEA', desc: 'AAVE fork on PulseChain — lending and borrowing with interest rate markets.' },
  { name: 'INCprinter', url: '#', tag: 'Lending', color: '#06b6d4', desc: 'Lending and borrowing protocol on PulseChain.' },
  { name: 'FLEX Protocol', url: '#', tag: 'DeFi', color: '#a855f7', desc: 'DeFi protocol on PulseChain.' },
  { name: 'EARN Protocol', url: '#', tag: 'Yield', color: '#f97316', desc: 'Yield-generating protocol on PulseChain.' },
  { name: 'Vouch', url: '#', tag: 'Liquid Staking', color: 'var(--accent)', desc: 'Liquid staking on PulseChain — stake PLS while keeping liquidity via a tradeable receipt token.' },
  { name: 'Phame', url: '#', tag: 'GMX Fork', color: '#f739ff', desc: 'GMX-style perpetuals trading fork on PulseChain.' },
];

const BRIDGES = [
  { name: 'Official PulseChain Bridge', url: 'https://bridge.pulsechain.com', tag: 'Official', color: 'var(--accent)', desc: 'Primary bridge between Ethereum and PulseChain. Bridging creates wrapped tokens (e.g., ETH → pWETH). Track TVL and flows on PulseChainStats.' },
  { name: 'LibertySwap', url: 'https://libertyswap.finance', tag: 'Privacy Bridge', color: '#a855f7', desc: 'Intent-based cross-chain DEX with zero-knowledge privacy. Transactions delete after 48hrs. Gasless mode available. 0.3% fee, $10–$25K limits, ~2-3 min swaps.' },
  { name: 'Hyperlane', url: 'https://hyperlane.xyz', tag: 'Cross-Chain', color: '#627EEA', desc: 'Connects PulseChain to 160+ blockchains. Tracked on the PulseChainStats bridge dashboard.' },
  { name: 'BlockBlend', url: '#', tag: 'Privacy Bridge', color: '#f739ff', desc: 'Privacy-focused bridge for moving assets across chains with enhanced anonymity.' },
  { name: 'Gibs Finance', url: '#', tag: 'Privacy Bridge', color: '#06b6d4', desc: 'Privacy bridge for cross-chain transfers.' },
  { name: 'TokensEx', url: '#', tag: 'BSC Bridge', color: '#f59e0b', desc: 'Bridge connecting PulseChain to Binance Smart Chain.' },
  { name: 'PortalX / StealthEX / SimpleSwap', url: '#', tag: 'CEX Bridge', color: 'var(--fg-muted)', desc: 'Centralized swap services that support PulseChain assets.' },
];

const ANALYTICS = [
  { name: 'PulseChainStats', url: 'https://pulsechainstats.com', tag: 'Full Suite', color: 'var(--accent)', desc: 'The #1 PulseChain analytics platform. Real-time on-chain data: token intel, bridge stats, validator stats, DEX volumes, HEX staking, gas comparisons, ecosystem directory (80+ projects), portfolio tracker, and social intelligence. No paywall.' },
  { name: '— /intel', url: 'https://pulsechainstats.com/intel', tag: 'Dashboard', color: 'var(--accent)', desc: 'Live pricing, market caps, TVL, daily users, wallet creation, validator APR, gas stats, and PulseX volume/burns. Includes league rankings (Shrimp → Poseidon tiers by supply %).' },
  { name: '— /tokenintel', url: 'https://pulsechainstats.com/tokenintel', tag: 'Token Data', color: 'var(--accent)', desc: 'Deep per-token analytics for PLS, HEX, PLSX, INC, PRVX. Price charts (24h to all-time), ROI from launch, supply/burn analysis, liquidity breakdowns across PulseX V1+V2, holder trends, staking metrics.' },
  { name: '— /bridge-stats', url: 'https://pulsechainstats.com/bridge-stats', tag: 'Bridge', color: '#627EEA', desc: 'Bridge TVL, top 5/10 tokens bridged in and out, daily/weekly/monthly flows, Hyperlane USDC transfers, CST stablecoin supply growth. Updated daily from on-chain data.' },
  { name: '— /richardheart', url: 'https://pulsechainstats.com/richardheart', tag: 'Founder Stats', color: '#f739ff', desc: 'Richard Heart project stats, social metrics, and ecosystem performance tracking.' },
  { name: 'DexScreener', url: 'https://dexscreener.com', tag: 'Price Charts', color: '#f59e0b', desc: 'DEX price charts and pair analytics for PulseChain tokens. Good for quick price checks — use on-chain reserves for accuracy.' },
  { name: 'DeFi Llama', url: 'https://defillama.com', tag: 'TVL', color: '#06b6d4', desc: 'Total Value Locked by protocol across PulseChain DeFi ecosystem.' },
  { name: 'DeBank', url: 'https://debank.com', tag: 'Portfolio', color: '#627EEA', desc: 'Multi-chain portfolio tracker with PulseChain support.' },
  { name: 'Koinly', url: 'https://koinly.io', tag: 'Tax & Portfolio', color: '#a855f7', desc: 'Crypto tax reporting and portfolio tracking, supports PulseChain transactions.' },
];

const ONRAMPS = [
  { name: '0xCoast', url: '#', tag: 'Fiat On/Off Ramp', color: 'var(--accent)', desc: 'Direct fiat on and off ramp for PulseChain using the CST stablecoin. Buy and sell crypto directly with fiat currency.' },
  { name: 'Guardarian', url: 'https://guardarian.com', tag: 'Fiat Ramp', color: '#f59e0b', desc: 'Fiat-to-crypto conversion service supporting PulseChain assets.' },
];

const WALLETS = [
  { name: 'MetaMask', url: 'https://metamask.io', tag: 'Browser/Mobile', color: '#f97316', desc: 'Most widely used EVM wallet. Add PulseChain as a custom network (Chain ID 369) to use with PulseChain dApps.' },
  { name: 'Rabby Wallet', url: 'https://rabby.io', tag: 'Multi-Chain', color: '#627EEA', desc: 'Multi-chain wallet with built-in PulseChain support and security features.' },
  { name: 'The Pulse Wallet', url: '#', tag: 'PulseChain Native', color: 'var(--accent)', desc: 'Wallet built specifically for the PulseChain ecosystem.' },
  { name: 'Tangem', url: 'https://tangem.com', tag: 'Hardware', color: '#a855f7', desc: 'Hardware wallet card supporting PulseChain — cold storage for secure long-term holding.' },
];

const NFTS = [
  { name: 'Mintra', url: 'https://mintra.ai', tag: 'Marketplace', color: 'var(--accent)', desc: 'Primary NFT marketplace on PulseChain — buy, sell, and mint NFTs.' },
  { name: 'BeatBox', url: '#', tag: 'Marketplace', color: '#f739ff', desc: 'NFT marketplace on PulseChain.' },
  { name: 'PulseMarket', url: '#', tag: 'Marketplace', color: '#627EEA', desc: 'NFT trading platform on PulseChain.' },
  { name: 'PulseCats', url: '#', tag: 'Collection', color: '#f59e0b', desc: 'Popular NFT collection on PulseChain.' },
  { name: 'Pulse Punks', url: '#', tag: 'Collection', color: '#a855f7', desc: 'PulseChain-native NFT collection.' },
  { name: 'Rentomania', url: '#', tag: 'Game', color: '#06b6d4', desc: 'Blockchain-based game on PulseChain.' },
];

const DEVTOOLS = [
  { name: 'Moralis', url: 'https://moralis.io', tag: 'Web3 Dev', color: '#627EEA', desc: 'Web3 development platform with PulseChain APIs, data indexing, and SDK.' },
  { name: 'NOWnodes', url: 'https://nownodes.io', tag: 'RPC Nodes', color: '#f59e0b', desc: 'RPC node provider for PulseChain — use their endpoints in your dApps.' },
  { name: 'Dextools', url: 'https://dextools.io', tag: 'Analytics', color: '#06b6d4', desc: 'Token analytics, charts, and pair explorer for PulseChain DEXs.' },
  { name: 'Fetch Oracle', url: '#', tag: 'Price Oracle', color: 'var(--accent)', desc: 'On-chain price oracle providing reliable price feeds for PulseChain smart contracts.' },
  { name: 'GoRealDefi', url: '#', tag: 'DeFi Tools', color: '#a855f7', desc: 'Tools for interacting with PulseChain DeFi.' },
  { name: 'Pulse Domains (.pls)', url: '#', tag: 'Web3 Identity', color: '#f739ff', desc: 'ENS-style naming service for PulseChain — register a human-readable .pls domain for your wallet address.' },
];

const COMMUNITY = [
  { name: 'PulseCoinList', url: 'https://pulsecoinlist.com', tag: 'Directory', color: 'var(--accent)', desc: 'Comprehensive ecosystem directory with 80+ verified PulseChain projects, analytics, and live supply/gas tracking.' },
  { name: 'PLSFolio', url: 'https://plsfolio.com', tag: 'Ecosystem', color: '#627EEA', desc: 'PulseChain ecosystem explorer and portfolio tool.' },
  { name: 'HowToPulse', url: '#', tag: 'Education', color: '#f59e0b', desc: 'Educational guides and tutorials for new users entering the PulseChain ecosystem.' },
  { name: 'PulseTV', url: '#', tag: 'Video Content', color: '#f739ff', desc: 'Video content, community streams, and ecosystem news.' },
  { name: 'PulseConference', url: '#', tag: 'Events', color: '#a855f7', desc: 'Ecosystem events, conferences, and community meetups.' },
];

const FAQS = [
  {
    q: 'What is PulseX and how does it work?',
    a: 'PulseX is PulseChain\'s official DEX (decentralized exchange), similar to Uniswap. Users can swap PRC20 tokens, provide liquidity to earn trading fees, and stake LP tokens in farms to earn INC rewards. Trading fee is 0.29% — 76% goes to LPs, 21% buys and burns PLSX. It has two versions: V1 and V2 with improved routing.',
  },
  {
    q: 'What is LibertySwap and how is it different from other bridges?',
    a: 'LibertySwap is an intent-based cross-chain DEX that uses zero-knowledge proofs for privacy. Unlike standard bridges, it never takes custody of your assets and transaction data is deleted after 48 hours. It has a gasless mode, a 0.3% fee, and supports swaps between PulseChain and other EVM chains including Base. Min $10, max $25,000 per transaction.',
  },
  {
    q: 'What is Hedron and why would I use it?',
    a: 'Hedron allows HEX stakers to tokenize their stakes as HSI (HEX Stake Instance) tokens. Normal HEX stakes are illiquid — you can\'t transfer them during the staking period. Hedron wraps them into tradeable tokens so you can sell or use a stake in DeFi without ending it early and triggering penalties.',
  },
  {
    q: 'What is Maximus?',
    a: 'Maximus is a set of community-run shared HEX staking pools. Instead of staking HEX individually, you contribute to a shared pool and receive Maximus tokens representing your share. It reduces the complexity and minimum capital needed for long-term HEX staking. Pool variants include Base, Deci, Lucky, Perpetuals, Poly, Pool Party, and Trio.',
  },
  {
    q: 'What is INC and where do I earn it?',
    a: 'INC is the PulseX farm incentive token. Liquidity providers who stake their LP tokens in PulseX farms earn INC continuously. It has decreasing inflation over time and PLSX holders vote via DAO on which trading pairs receive INC incentives.',
  },
  {
    q: 'How are the Token League tiers determined?',
    a: 'Token leagues on PulseChainStats rank holders by what percentage of the total token supply they hold: Poseidon (10%), Whale (1%), Shark (0.1%), Dolphin (0.01%), Squid (0.001%), Turtle (0.0001%). Smaller holders fall into Shrimp and below.',
  },
  {
    q: 'What are the PulseChainStats bridge stats tracking?',
    a: 'The bridge-stats dashboard tracks the official PulseChain bridge TVL (total value locked) with 24h/7d/30d changes, top 5 and top 10 tokens bridged in and out by USD volume, daily inflow/outflow net flow, Hyperlane cross-chain USDC activity, and CST stablecoin supply growth as a proxy for fiat on-ramp adoption.',
  },
  {
    q: 'What is the CST stablecoin?',
    a: 'CST is a stablecoin issued by 0xCoast, which operates a direct fiat on/off ramp for PulseChain. CST supply growth is tracked on PulseChainStats as a measure of real-world fiat adoption of PulseChain.',
  },
  {
    q: 'How do I get on-chain price data accurately?',
    a: 'The most accurate method is querying LP reserves directly via RPC (eth_call with getReserves selector 0x0902f1ac). For PLS/USD: use the WPLS/DAI, WPLS/USDC, and WPLS/USDT pairs — take the highest price (most liquidity = most reliable). For other tokens: derive tokenPriceUSD = (tokenPriceInWPLS) × (wplsPriceUSD). DexScreener and PulseX subgraph can lag or rate-limit.',
  },
  {
    q: 'Are there privacy options for trading on PulseChain?',
    a: 'Yes. LibertySwap offers a private trading mode using zero-knowledge proofs where transaction metadata is not exposed on public ledgers. BlockBlend and Gibs Finance also offer privacy-focused bridging options for cross-chain asset transfers.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg)', fontWeight: 600, fontSize: 14, textAlign: 'left', gap: 12,
        }}
      >
        <span>{q}</span>
        {open ? <ChevronUp size={15} color="var(--fg-muted)" /> : <ChevronDown size={15} color="var(--fg-muted)" />}
      </button>
      {open && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.7, paddingBottom: 14, margin: 0 }}>{a}</p>
      )}
    </div>
  );
}

const s = {
  section: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.6px' },
  badge: (color: string) => ({ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${color}22`, color, border: `1px solid ${color}44`, whiteSpace: 'nowrap' as const }),
};

function ProjectGrid({ items }: { items: typeof DEXS }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      {items.map(p => (
        <div key={p.name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: p.color }}>{p.name}</span>
              <span style={s.badge(p.color)}>{p.tag}</span>
            </div>
            {p.url !== '#' && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)', flexShrink: 0 }}>
                <ExternalLink size={13} />
              </a>
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
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(247,57,255,0.1)', border: '1px solid rgba(247,57,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} color="#f739ff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>PulseChain Community</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>DEXs, DeFi, bridges, analytics, wallets, NFTs & community resources</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Projects Listed', value: '80+' },
          { label: 'Active DEXs', value: '7+' },
          { label: 'DeFi Protocols', value: '9+' },
          { label: 'Bridge Options', value: '7+' },
          { label: 'Wallet Options', value: '4' },
          { label: 'NFT Marketplaces', value: '3' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={s.label}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f739ff', marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* DEXs */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Zap size={15} color="#f739ff" /> Decentralized Exchanges</div>
        <ProjectGrid items={DEXS} />
      </div>

      {/* DeFi Protocols */}
      <div style={s.section}>
        <div style={s.sectionTitle}><BarChart2 size={15} color="#f739ff" /> DeFi Protocols</div>
        <ProjectGrid items={DEFI} />
      </div>

      {/* Bridges */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Globe size={15} color="#f739ff" /> Bridges & Cross-Chain</div>

        {/* LibertySwap highlight */}
        <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Shield size={14} color="#a855f7" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#a855f7' }}>LibertySwap — Privacy-First Cross-Chain DEX</span>
            <a href="https://libertyswap.finance" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={12} /></a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 10px', lineHeight: 1.6 }}>
            Intent-based, non-custodial cross-chain exchange with on-chain zero-knowledge privacy. Users specify what they want to swap — the protocol handles execution across chains while preserving privacy. LibertySwap never holds your assets or accesses private keys. Transaction data is automatically deleted after 48 hours.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {[
              { label: 'Protocol Fee', value: '0.3%' },
              { label: 'Min / Max', value: '$10 / $25K' },
              { label: 'Swap Time', value: '~2–3 min' },
              { label: 'Gas', value: 'Gasless mode' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={s.label}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', marginTop: 3 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>Roadmap:</strong> Phase 1 — cross-chain swap/send (live) · Phase 2 — additional privacy routes · Phase 3 — full trading suite for PulseChain, Ethereum, and all EVM networks
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>Supported tokens:</strong> USDC, PLS, WETH, PLSX, HEX, INC, PCOCK, pDAI, eHEX, PRVX, ZERØ — also supports Base chain
          </div>
        </div>

        <ProjectGrid items={BRIDGES} />
      </div>

      {/* Analytics */}
      <div style={s.section}>
        <div style={s.sectionTitle}><BarChart2 size={15} color="#f739ff" /> Analytics & Data Tools</div>

        {/* PulseChainStats highlight */}
        <div style={{ background: 'rgba(0,255,159,0.04)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={14} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>PulseChainStats — Complete Analytics Suite</span>
            </div>
            <a href="https://pulsechainstats.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }}><ExternalLink size={12} /></a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
            The #1 PulseChain analytics platform. Real-time on-chain data with no paywall or subscription. Covers everything from live token prices to validator geography, bridge flows, HEX staking metrics, and social intelligence.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {[
              { path: '/intel', label: 'Intel Dashboard', desc: 'Live pricing, TVL, gas stats, daily users, validator APR, PulseX volumes, burn metrics, and ecosystem directory (80+ projects).' },
              { path: '/tokenintel', label: 'Token Intel', desc: 'Deep analytics for PLS, HEX, PLSX, INC, PRVX. Price charts (24h–all-time), ROI from launch, burn rates, liquidity breakdowns, holder counts, staking metrics.' },
              { path: '/bridge-stats', label: 'Bridge Stats', desc: 'Bridge TVL, top bridged tokens, daily/monthly inflows/outflows, Hyperlane USDC activity, CST stablecoin supply growth.' },
              { path: '/richardheart', label: 'Richard Heart', desc: 'RH project stats, social metrics, and ecosystem performance by founder.' },
            ].map(({ path, label, desc }) => (
              <a key={path} href={`https://pulsechainstats.com${path}`} target="_blank" rel="noopener noreferrer"
                style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', textDecoration: 'none', display: 'block', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                  {label} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{desc}</div>
              </a>
            ))}
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Token League Tiers (% of supply held)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { tier: 'Poseidon', pct: '10%', color: '#f739ff' },
                { tier: 'Whale', pct: '1%', color: '#627EEA' },
                { tier: 'Shark', pct: '0.1%', color: '#06b6d4' },
                { tier: 'Dolphin', pct: '0.01%', color: 'var(--accent)' },
                { tier: 'Squid', pct: '0.001%', color: '#f59e0b' },
                { tier: 'Turtle', pct: '0.0001%', color: '#a855f7' },
              ].map(({ tier, pct, color }) => (
                <div key={tier} style={{ padding: '4px 10px', borderRadius: 100, background: `${color}18`, border: `1px solid ${color}44`, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color }}>{tier}</span>
                  <span style={{ color: 'var(--fg-muted)', marginLeft: 4 }}>≥{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProjectGrid items={ANALYTICS.filter(a => !a.name.startsWith('—') && a.name !== 'PulseChainStats')} />
      </div>

      {/* Wallets */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Shield size={15} color="#f739ff" /> Wallets</div>
        <ProjectGrid items={WALLETS} />
      </div>

      {/* On/Off Ramps */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Zap size={15} color="#f739ff" /> Fiat On/Off Ramps</div>
        <ProjectGrid items={ONRAMPS} />
      </div>

      {/* NFTs & Gaming */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Layers size={15} color="#f739ff" /> NFTs & Gaming</div>
        <ProjectGrid items={NFTS} />
      </div>

      {/* Developer Tools */}
      <div style={s.section}>
        <div style={s.sectionTitle}><BarChart2 size={15} color="#f739ff" /> Developer Tools & Infrastructure</div>
        <ProjectGrid items={DEVTOOLS} />
      </div>

      {/* Community */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Globe size={15} color="#f739ff" /> Community & Education</div>
        <ProjectGrid items={COMMUNITY} />
      </div>

      {/* FAQ */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Layers size={15} color="#f739ff" /> Frequently Asked Questions</div>
        <div>
          {FAQS.map(item => <FaqItem key={item.q} {...item} />)}
        </div>
      </div>
    </div>
  );
}
