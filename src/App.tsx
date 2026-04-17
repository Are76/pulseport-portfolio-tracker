import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet as WalletIcon, 
  Coins,
  Lock,
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2,
  Copy,
  ExternalLink,
  RefreshCcw,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  History,
  Filter,
  Download,
  LayoutDashboard,
  User,
  ArrowLeftRight,
  Settings,
  Eye,
  EyeOff,
  Calculator,
  X,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Pencil,
  Check,
  KeyRound,
  Zap,
  BarChart2,
  Droplets,
  Menu
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { createPublicClient, http, fallback, formatUnits, getAddress } from 'viem';
import { cn } from './lib/utils';
import { CHAINS, HEX_ABI, TOKENS, PULSEX_V2_PAIR_ABI, PULSEX_LP_PAIRS, PHEX_YIELD_PER_TSHARE, EHEX_YIELD_PER_TSHARE, PHEX_YIELD_BI_NUM, PHEX_YIELD_BI_DEN, EHEX_YIELD_BI_NUM, EHEX_YIELD_BI_DEN, FALLBACK_DESCRIPTIONS } from './constants';
import type { Asset, Wallet, Chain, HexStake, LpPosition, FarmPosition, PortfolioSummary, HistoryPoint, Transaction } from './types';
import { LiquidityOverviewStrip, LiquiditySection } from './components/LiquiditySection';
import { TokenPnLCard } from './components/TokenPnLCard';
import { PnLModal } from './components/PnLModal';
import { ProfitPlannerModal } from './components/ProfitPlannerModal';
import { StakesSection } from './components/StakesSection';
import { TokenCardModal } from './components/TokenCardModal';
import { MarketWatchModal } from './components/MarketWatchModal';
import { TransactionList } from './components/TransactionList';
import { normalizeTransactions } from './utils/normalizeTransactions';

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }
] as const;

// Mock data for demonstration when no wallets are added
const MOCK_ASSETS: Asset[] = [
  { id: 'pls', symbol: 'PLS', name: 'PulseChain', balance: 1250000, price: 0.000065, value: 81.25, chain: 'pulsechain', pnl24h: 5.4 },
  { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 5000000, price: 0.000032, value: 160, chain: 'pulsechain', pnl24h: -2.1 },
  { id: 'ehex', symbol: 'eHEX', name: 'HEX (from Ethereum)', balance: 250000, price: 0.004, value: 1000, chain: 'pulsechain', pnl24h: 8.2 },
  { id: 'pdai', symbol: 'pDAI', name: 'DAI (System Copy)', balance: 10000, price: 0.00189, value: 18.9, chain: 'pulsechain', pnl24h: -1.5 },
  { id: 'inc', symbol: 'INC', name: 'Incentive', balance: 50, price: 5.20, value: 260, chain: 'pulsechain', pnl24h: 12.4 },
  { id: 'prvx', symbol: 'PRVX', name: 'PrivacyX', balance: 1000, price: 0.15, value: 150, chain: 'pulsechain', pnl24h: 0 },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', balance: 1.5, price: 3450, value: 5175, chain: 'ethereum', pnl24h: 1.2 },
  { id: 'hex-p', symbol: 'HEX', name: 'HEX (PulseChain)', balance: 100000, price: 0.004, value: 400, chain: 'pulsechain', pnl24h: 12.5 },
  { id: 'hex-e', symbol: 'HEX', name: 'HEX (Ethereum)', balance: 50000, price: 0.0035, value: 175, chain: 'ethereum', pnl24h: -0.5 },
  { id: 'usdc-b', symbol: 'USDC', name: 'USD Coin (Base)', balance: 2500, price: 1, value: 2500, chain: 'base', pnl24h: 0.01 },
];

const MOCK_STAKES: HexStake[] = [
  { id: 'mock-1', stakeId: 1, stakedHearts: 100000000000n, stakeShares: 5000000000000n, lockedDay: 1500, stakedDays: 365, unlockedDay: 1865, isAutoStake: false, progress: 45, estimatedValueUsd: 1200, chain: 'pulsechain' },
  { id: 'mock-2', stakeId: 2, stakedHearts: 500000000000n, stakeShares: 25000000000000n, lockedDay: 1200, stakedDays: 5555, unlockedDay: 6755, isAutoStake: false, progress: 12, estimatedValueUsd: 8500, chain: 'ethereum' },
];

const MOCK_HISTORY: HistoryPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const baseValue = 8000;
  const randomFluc = Math.sin(i * 0.5) * 500 + (Math.random() * 200);
  const value = baseValue + randomFluc + (i * 50);
  
  // Mock chain PNLs
  const chainPnl: Record<Chain, number> = {
    pulsechain: randomFluc * 0.6 + (Math.random() * 100 - 50),
    ethereum: randomFluc * 0.3 + (Math.random() * 100 - 50),
    base: randomFluc * 0.1 + (Math.random() * 50 - 25)
  };

  return {
    timestamp: date.getTime(),
    value: value,
    nativeValue: value / 0.000065,
    pnl: randomFluc,
    chainPnl: chainPnl
  };
});

// ─── Bridge Activity helpers ──────────────────────────────────────────────────
/** Groups bridge activities by calendar date (e.g. "Apr 12, 2026"), newest date first. */
function groupByDate(bridgeActivities: Transaction[]): Record<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  const sorted = [...bridgeActivities].sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((activity) => {
    const dateKey = new Date(activity.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const bucket = groups.get(dateKey) ?? [];
    bucket.push(activity);
    groups.set(dateKey, bucket);
  });

  return Object.fromEntries(groups.entries());
}

function fmtTxAmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(a / 1e3).toFixed(1)}K`;
  return a.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const BRIDGE_CHAIN_COLORS: Record<string, string> = {
  pulsechain: '#9b5de5',
  ethereum: '#627EEA',
  base: '#0052FF',
};

type BridgeTimelineEventProps = {
  key?: React.Key;
  tx: Transaction;
  matchedAsset?: Asset;
  logoUrl?: string;
  themeCardColor: string;
  hidden: boolean;
  isSelected: boolean;
  tokenTransactions: Transaction[];
  plsPriceUsd: number;
  onSelect: (tx: Transaction, asset?: Asset) => void;
  onToggleHide: (id: string) => void;
};

function BridgeTimelineEvent({
  tx,
  matchedAsset,
  logoUrl,
  themeCardColor,
  hidden,
  isSelected,
  tokenTransactions,
  plsPriceUsd,
  onSelect,
  onToggleHide,
}: BridgeTimelineEventProps) {
  const isDeposit = tx.type === 'deposit';
  const isSwap = tx.type === 'swap';
  const dotColor = isDeposit ? 'var(--accent)' : isSwap ? '#8b5cf6' : '#f97316';
  const chainColor = BRIDGE_CHAIN_COLORS[tx.chain] || '#888';
  const chainLabel = tx.chain === 'pulsechain' ? 'PulseChain' : tx.chain === 'ethereum' ? 'Ethereum' : 'Base';
  const timeStr = new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const usdVal = tx.valueUsd ?? 0;
  const fromChain = tx.type === 'withdraw' ? chainLabel : (tx.type === 'swap' ? chainLabel : 'External');
  const toChain = tx.type === 'deposit' ? chainLabel : (tx.type === 'swap' ? chainLabel : 'External');

  return (
    <div className="bridge-timeline-event">
      <div className="bridge-timeline-dot" style={{ background: dotColor, borderColor: themeCardColor }} />
      <div className={`bridge-event-card${hidden ? ' bridge-event-card--hidden' : ''}`} onClick={() => onSelect(tx, matchedAsset)}>
        <div className="bridge-event-head">
          <div className="bridge-event-logo">
            {logoUrl
              ? <img src={logoUrl} alt={tx.asset} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : tx.asset[0]}
          </div>
          <span className="bridge-event-asset">{tx.asset}</span>
          <div className="bridge-event-type-icon" style={{ background: `${dotColor}1a`, borderColor: `${dotColor}44` }}>
            {isDeposit ? <ArrowDownLeft size={10} style={{ color: dotColor }} /> : isSwap ? <ArrowLeftRight size={10} style={{ color: dotColor }} /> : <ArrowUpRight size={10} style={{ color: dotColor }} />}
          </div>
          <span className="bridge-event-chain-chip" style={{ background: `${chainColor}18`, color: chainColor, borderColor: `${chainColor}33` }}>
            {chainLabel}
          </span>
          <span className="bridge-event-time">{timeStr}</span>
        </div>

        <div className="bridge-event-flow">
          <div className="bridge-event-flow-row">
            <span className="bridge-event-flow-label">Chain</span>
            <span className="bridge-event-flow-value">{fromChain} <ArrowRight size={10} /> {toChain}</span>
          </div>
          <div className="bridge-event-flow-row">
            <span className="bridge-event-flow-label">Asset</span>
            <span className="bridge-event-flow-value">
              {isSwap ? `${fmtTxAmt(tx.counterAmount ?? 0)} ${tx.counterAsset} → ${fmtTxAmt(tx.amount)} ${tx.asset}` : `${isDeposit ? '+' : '−'}${fmtTxAmt(tx.amount)} ${tx.asset}`}
            </span>
          </div>
        </div>

        <div className="bridge-event-footer">
          {usdVal > 0 && (
            <span className="bridge-event-usd">${usdVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleHide(tx.id); }}
            title={hidden ? 'Show' : 'Hide'}
            className="bridge-event-icon-btn"
          >
            <EyeOff size={11} />
          </button>
          {tx.hash && tx.hash.length > 6 && (
            <a
              href={tx.chain === 'pulsechain' ? `https://scan.pulsechain.com/tx/${tx.hash}` : tx.chain === 'base' ? `https://basescan.org/tx/${tx.hash}` : `https://etherscan.io/tx/${tx.hash}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="View on explorer"
              className="bridge-event-icon-btn"
            >
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {isSelected && matchedAsset && (
        <div className="bridge-event-pnl">
          <TokenPnLCard
            symbol={matchedAsset.symbol}
            transactions={tokenTransactions}
            asset={matchedAsset}
            priceUsd={matchedAsset.price ?? 0}
            plsPriceUsd={plsPriceUsd}
            logoUrl={logoUrl}
          />
        </div>
      )}
    </div>
  );
}

const MOCK_WALLET = '0xdemo0000000000000000000000000000000001';
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'm1', hash: '0x123...', timestamp: Date.now() - 86400000 * 2, type: 'deposit', from: '0xabc...', to: MOCK_WALLET, asset: 'ETH', amount: 1.5, chain: 'ethereum', valueUsd: 5175 },
  { id: 'm2', hash: '0x456...', timestamp: Date.now() - 86400000 * 5, type: 'deposit', from: '0xdef...', to: MOCK_WALLET, asset: 'USDC', amount: 2500, chain: 'base', valueUsd: 2500 },
  { id: 'm-bridge-1', hash: '0xb1d9e001...', timestamp: Date.now() - 86400000 * 1.25, type: 'deposit', from: '0xbridge...', to: MOCK_WALLET, asset: 'DAI (from Ethereum)', amount: 1250, chain: 'pulsechain', valueUsd: 1248.5, bridged: true, status: 'Confirmed' },
  { id: 'm-bridge-2', hash: '0xb1d9e002...', timestamp: Date.now() - 86400000 * 6.5, type: 'deposit', from: '0xbridge...', to: MOCK_WALLET, asset: 'WETH (from Ethereum)', amount: 0.42, chain: 'pulsechain', valueUsd: 1449, bridged: true, status: 'Confirmed' },
  { id: 'm3', hash: '0x789...', timestamp: Date.now() - 86400000 * 10, type: 'swap', from: MOCK_WALLET, to: MOCK_WALLET, asset: 'ETH', amount: 0.5, chain: 'ethereum', valueUsd: 1725, counterAsset: 'USDC', counterAmount: 1725 },
  { id: 'm4', hash: '0xabc...', timestamp: Date.now() - 86400000 * 15, type: 'deposit', from: '0xghi...', to: MOCK_WALLET, asset: 'ETH', amount: 2.0, chain: 'ethereum', valueUsd: 6800 },
  { id: 'm5', hash: '0xdef...', timestamp: Date.now() - 86400000 * 20, type: 'deposit', from: '0xjkl...', to: MOCK_WALLET, asset: 'USDC', amount: 5000, chain: 'ethereum', valueUsd: 5000 },
  { id: 'm6', hash: '0x000...', timestamp: Date.now() - 86400000 * 1, type: 'deposit', from: '0x000...', to: MOCK_WALLET, asset: 'USDC', amount: 1000, chain: 'ethereum', valueUsd: 1000 },
  { id: 'm7', hash: '0x999...', timestamp: Date.now() - 86400000 * 0.5, type: 'deposit', from: '0x123...', to: MOCK_WALLET, asset: 'USDC', amount: 25000, chain: 'ethereum', valueUsd: 25000 },
];

const fP = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(0);
};

const PriceDisplay = ({ price, className }: { price: number, className?: string }) => {
  if (price === 0) return <span className={className}>$0.00</span>;
  
  // Handle very small prices with subscript for zeros
  if (price < 0.0001 && price > 0) {
    const priceStr = price.toFixed(12);
    const match = priceStr.match(/^0\.0+(?=[1-9])/);
    if (match) {
      const zerosCount = match[0].length - 2;
      const remaining = priceStr.slice(match[0].length);
      return (
        <span className={cn("font-mono", className)}>
          $0.0<sub className="price-sub">{zerosCount}</sub>{remaining.slice(0, 4)}
        </span>
      );
    }
  }
  
  return (
    <span className={cn("font-mono", className)}>
      ${price.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: price < 1 ? 6 : 2 
      })}
    </span>
  );
};

// ── localStorage cache helpers (BigInt-safe) ──────────────────────────────────
const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? `__bi__${value.toString()}` : value;
const bigIntReviver = (_key: string, value: unknown) =>
  typeof value === 'string' && value.startsWith('__bi__')
    ? BigInt(value.slice(6))
    : value;

function tryReadCache<T>(key: string, withBigInt = false): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return withBigInt ? JSON.parse(raw, bigIntReviver) : JSON.parse(raw);
  } catch {
    return null;
  }
}

function readStoredJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── StakingLadder ─────────────────────────────────────────────────────────────
// Bar chart showing stake distribution by 30-day end-date buckets (from pulsechain-dashboard)
function StakingLadder({ stakes }: { stakes: HexStake[] }) {
  if (!stakes || stakes.length === 0) return null;
  const bucketSize = 30;
  const buckets: Record<number, { totalShares: number; stakeCount: number; bucketRange: string }> = {};

  stakes.forEach(stake => {
    const days = Math.max(0, Math.min(5555, Math.floor(stake.daysRemaining ?? 0)));
    const bucketIdx = Math.floor(days / bucketSize);
    if (!buckets[bucketIdx]) {
      const start = bucketIdx * bucketSize;
      buckets[bucketIdx] = { totalShares: 0.001, stakeCount: 0, bucketRange: `${start}-${start + bucketSize - 1}` };
    }
    buckets[bucketIdx].totalShares = (buckets[bucketIdx].totalShares === 0.001 ? 0 : buckets[bucketIdx].totalShares) + (stake.tShares ?? 0);
    buckets[bucketIdx].stakeCount += 1;
  });

  const chartData = Object.entries(buckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idx, d]) => ({ daysRemaining: Number(idx) * bucketSize + bucketSize / 2, ...d }));

  const CustomTip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="chart-tooltip" style={{ fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>Days: {d.bucketRange}</div>
        <div>T-Shares: {d.totalShares.toFixed(2)}</div>
        <div>Stakes: {d.stakeCount}</div>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px 10px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Staking Ladder</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="daysRemaining" tick={{ fill: 'var(--fg-subtle)', fontSize: 13 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false}
            label={{ value: 'Days Remaining', position: 'insideBottom', offset: -10, fill: 'var(--fg-subtle)', fontSize: 13 }} />
          <YAxis tick={{ fill: 'var(--fg-subtle)', fontSize: 13 }} axisLine={false} tickLine={false} scale="log" domain={['auto', 'auto']} allowDataOverflow={false} />
          <RechartsTooltip content={<CustomTip />} />
          <Bar dataKey="totalShares" fill="#00FF9F" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── StakingPie ─────────────────────────────────────────────────────────────────
// Donut chart showing HEX stake distribution grouped by wallet (from pulsechain-dashboard)
function StakingPie({ stakes, hexUsdPrice }: { stakes: HexStake[]; hexUsdPrice: number }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  if (!stakes || stakes.length === 0) return null;

  const byWallet: Record<string, { label: string; tShares: number; stakedHex: number; yieldHex: number; totalHex: number; totalUsd: number; count: number }> = {};
  stakes.forEach(s => {
    const key = s.walletAddress ?? s.id;
    const label = s.walletLabel ?? key.slice(0, 8) + '...';
    if (!byWallet[key]) byWallet[key] = { label, tShares: 0, stakedHex: 0, yieldHex: 0, totalHex: 0, totalUsd: 0, count: 0 };
    const tsh = s.tShares ?? 0;
    const staked = s.stakedHex ?? 0;
    const yld = s.stakeHexYield ?? 0;
    byWallet[key].tShares += tsh;
    byWallet[key].stakedHex += staked;
    byWallet[key].yieldHex += yld;
    byWallet[key].totalHex += staked + yld;
    byWallet[key].totalUsd += (staked + yld) * hexUsdPrice;
    byWallet[key].count += 1;
  });

  const totalTShares = Object.values(byWallet).reduce((a, b) => a + b.tShares, 0);
  const totalUsd = Object.values(byWallet).reduce((a, b) => a + b.totalUsd, 0);
  const totalHex = Object.values(byWallet).reduce((a, b) => a + b.totalHex, 0);

  const sorted = Object.values(byWallet).sort((a, b) => b.tShares - a.tShares);
  const threshold = 0.02;
  const large = sorted.filter(w => w.tShares / totalTShares >= threshold);
  const small = sorted.filter(w => w.tShares / totalTShares < threshold);
  const chartData = small.length > 0
    ? [...large, { label: 'Others', tShares: small.reduce((a, b) => a + b.tShares, 0), totalUsd: small.reduce((a, b) => a + b.totalUsd, 0), count: small.reduce((a, b) => a + b.count, 0) }]
    : large;

  const GRADIENT = ['#00FF9F', '#627EEA', '#f739ff', '#fb923c', '#3b82f6', '#a855f7'];
  const getColor = (i: number) => GRADIENT[i % GRADIENT.length];

  const fmtK = (n: number) => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
      <g>
        <text x={cx} y={cy - 14} textAnchor="middle" fill="var(--fg-subtle)" fontSize="12">{payload.label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--fg)" fontSize="18" fontWeight="700">{fmtK(payload.tShares)}</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="var(--fg-subtle)" fontSize="11">T-Shares</text>
        <Pie data={[]} cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} dataKey="value" />
      </g>
    );
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Stake Distribution</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>${fmtK(totalUsd)}</span>
          {' · '}<span style={{ color: '#fb923c' }}>{fmtK(totalHex)} HEX</span>
          {' · '}<span style={{ color: 'var(--accent)' }}>{fmtK(totalTShares)} T-Shares</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="tShares"
            activeIndex={activeIndex} activeShape={renderActiveShape}
            onMouseEnter={(_, i) => setActiveIndex(i)}>
            {chartData.map((_, i) => <Cell key={i} fill={getColor(i)} />)}
          </Pie>
          <RechartsTooltip formatter={(val: any, _: any, entry: any) => [`${fmtK(Number(val))} T-Shares · $${fmtK(entry.payload.totalUsd)}`, entry.payload.label]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 4 }}>
        {chartData.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(i), flexShrink: 0 }} />
            <span>{w.label}</span>
            <span style={{ color: 'var(--fg-subtle)' }}>({w.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Wallet Selector ─────────────────────────────────────────────────────────
function shortenAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface WalletSelectorProps {
  wallets: string[];
  activeWallet: string | null;
  onSelect: (addr: string | null) => void;
  onAdd: () => void;
  walletLabels?: Record<string, string>;
}

const WALLET_DOT_COLORS = ['#00FF9F','#f739ff','#627EEA','#f97316','#a855f7','#f59e0b','#06b6d4','#ec4899'];

function WalletSelector({ wallets, activeWallet, onSelect, onAdd, walletLabels = {} }: WalletSelectorProps) {
  if (wallets.length === 0) {
    return (
      <button onClick={onAdd} className="btn-ghost" style={{ fontSize: 12, gap: 6 }}>
        <span style={{ fontSize: 14 }}>＋</span> Add Wallet
      </button>
    );
  }
  return (
    <div className="wallet-selector-bar">
      <button className={`wallet-pill${activeWallet === null ? ' active' : ''}`} onClick={() => onSelect(null)}>
        <span className="wallet-dot wallet-dot-multi" />
        All ({wallets.length})
      </button>
      {wallets.map((addr, idx) => {
        const label = walletLabels[addr] ?? shortenAddr(addr);
        const dotColor = WALLET_DOT_COLORS[idx % WALLET_DOT_COLORS.length];
        const isActive = activeWallet === addr;
        return (
          <button
            key={addr}
            className={`wallet-pill${isActive ? ' active' : ''}`}
            onClick={() => onSelect(addr)}
            title={addr}
            style={isActive ? {
              background: `${dotColor}1a`,
              borderColor: `${dotColor}55`,
              color: dotColor,
            } : undefined}
          >
            <span className="wallet-dot" style={{ background: dotColor, boxShadow: `0 0 5px ${dotColor}bb` }} />
            {label}
          </button>
        );
      })}
      <button
        onClick={onAdd}
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 10px', borderRadius: 999,
          border: '1px dashed var(--border-strong)',
          background: 'transparent', color: 'var(--fg-subtle)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s',
        }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-subtle)'; }}
      >
        ＋
      </button>
    </div>
  );
}

// ── Module-level logo overrides — these always win over CoinGecko / DexScreener ─
// Keyed by lowercase contract address on PulseChain.
// Nothing may ever overwrite these entries in tokenLogos or asset.logoUrl.
const STATIC_LOGOS: Record<string, string> = {
  '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d': 'https://tokens.app.pulsex.com/images/tokens/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png', // INC
  '0xf6f8db0aba00007681f8faf16a0fda1c9b030b11': 'https://cdn.dexscreener.com/cms/images/ODHYYN7yppDHnd6u?width=64&height=64&fit=crop&quality=95&format=auto', // PRVX
  '0xefd766ccb38eaf1dfd701853bfce31359239f305': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png', // pDAI (bridged DAI) — never use golden CoinGecko DAI coin here
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'https://tokens.app.pulsex.com/images/tokens/0x6B175474E89094C44Da98b954EedeAC495271d0F.png', // pDAI system copy (fork of Ethereum DAI) — prevents CoinGecko golden-coin from replacing this on reload
};

// Bridged HEX (eHEX) on PulseChain — no on-chain WPLS LP, falls back to CoinGecko 'hex'
const EHEX_PULSECHAIN_ADDR = '0x57fde0a71132198bbec939b98976993d8d89d225';

// Below this threshold (USD) we consider netInvestment effectively zero and hide the P&L %.
// PulseChain-only wallets have no ETH/stable inflows so netInvestment stays near 0.
const MIN_INVESTMENT_THRESHOLD = 100;
const OPENPULSECHAIN_API_BASE = 'https://api.openpulsechain.com';

export default function App() {
  // ── Formatting helpers (defined once here, used throughout) ────────────────
  const fmtBigNum = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
  const fmtDec = (n: number, dp = 2) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtTok = (n: number) => n > 1e6 ? `${(n/1e6).toFixed(2)}M` : n > 1000 ? `${(n/1000).toFixed(2)}K` : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

  // ── CSV Export helper ──────────────────────────────────────────────────────
  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escCell = (c: string | number) => {
      const s = String(c);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [headers, ...rows].map(r => r.map(escCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    return readStoredJSON<Wallet[]>('pulseport_wallets', []);
  });
  const [realAssets, setRealAssets] = useState<Asset[]>(() => tryReadCache<Asset[]>('pulseport_cache_assets') ?? []);
  const [realStakes, setRealStakes] = useState<HexStake[]>(() => tryReadCache<HexStake[]>('pulseport_cache_stakes', true) ?? []);
  const [lpPositions, setLpPositions] = useState<LpPosition[]>(() => tryReadCache<LpPosition[]>('pulseport_cache_lp') ?? []);
  const [farmPositions, setFarmPositions] = useState<FarmPosition[]>(() => tryReadCache<FarmPosition[]>('pulseport_cache_farms') ?? []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => tryReadCache<Transaction[]>('pulseport_cache_txs') ?? []);
  const [history, setHistory] = useState<HistoryPoint[]>(() => readStoredJSON<HistoryPoint[]>('pulseport_history', []));
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [walletFormError, setWalletFormError] = useState('');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [editingWalletAddress, setEditingWalletAddress] = useState<string | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [isCustomCoinsModalOpen, setIsCustomCoinsModalOpen] = useState(false);
  const [customCoins, setCustomCoins] = useState<any[]>(() => readStoredJSON<any[]>('custom_coins', []));

  useEffect(() => {
    localStorage.setItem('custom_coins', JSON.stringify(customCoins));
  }, [customCoins]);

  const addCustomCoin = (coin: any) => {
    setCustomCoins([...customCoins, { ...coin, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeCustomCoin = (id: string) => {
    setCustomCoins(customCoins.filter(c => c.id !== id));
  };
  const [sidebarWalletsOpen, setSidebarWalletsOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'stakes' | 'history' | 'tracker' | 'wallets' | 'defi'>('overview');
  const [selectedWalletAddr, setSelectedWalletAddr] = useState<string>('all');
  const [walletAssets, setWalletAssets] = useState<Record<string, Asset[]>>(() => tryReadCache<Record<string, Asset[]>>('pulseport_cache_wallet_assets') ?? {});
  const [walletChainFilter, setWalletChainFilter] = useState<'all' | 'pulsechain' | 'ethereum' | 'base'>('all');
  const [overviewChainFilter, setOverviewChainFilter] = useState<'all' | 'pulsechain' | 'ethereum' | 'base'>('all');
  const [overviewTokenSearch, setOverviewTokenSearch] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [historyRange, setHistoryRange] = useState<'1D' | '1W' | '1M'>('1M');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txAssetFilter, setTxAssetFilter] = useState<string>('all');
  const [txChainFilter, setTxChainFilter] = useState<string>('all');
  const [txYearFilter, setTxYearFilter] = useState<string>('all');
  const [txCoinCategory, setTxCoinCategory] = useState<string>('all');
  const [viewAsYou, setViewAsYou] = useState(false);
  const [txCompact, setTxCompact] = useState(false);
  const [receivedCoinFilter, setReceivedCoinFilter] = useState<string>('all');
  const [receivedChainFilter, setReceivedChainFilter] = useState<string>('all');
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<number>(0);
  const [manualEntries, setManualEntries] = useState<Record<string, number>>(() => readStoredJSON<Record<string, number>>('pulseport_manual_entries', {}));
  const [prices, setPrices] = useState<Record<string, any>>(() => tryReadCache<Record<string, any>>('pulseport_cache_prices') ?? {});
  const [etherscanApiKey, setEtherscanApiKey] = useState<string>(() => localStorage.getItem('pulseport_etherscan_key') || '');
  const [basescanApiKey, setBasescanApiKey] = useState<string>(() => localStorage.getItem('pulseport_basescan_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [basescanApiKeyInput, setBasescanApiKeyInput] = useState('');
  const [hideDust, setHideDust] = useState<boolean>(() => readStoredJSON<boolean>('pulseport_hide_dust', false));
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    return readStoredJSON<string[]>('pulseport_hidden_tokens', []);
  });
  const [priceChangePeriod, setPriceChangePeriod] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [assetSortField, setAssetSortField] = useState<'value' | 'change'>('value');
  const [assetSortDir, setAssetSortDir] = useState<'desc' | 'asc'>('desc');
  // tokenLogos is seeded from the module-level STATIC_LOGOS map so overrides are
  // available before any remote fetch completes.
  const [tokenLogos, setTokenLogos] = useState<Record<string, string>>(STATIC_LOGOS);
  const [stakeChainFilter, setStakeChainFilter] = useState<'all' | 'pulsechain' | 'ethereum'>('all');
  const [yieldUnit, setYieldUnit] = useState<'hex' | 'usd'>(() => {
    return (localStorage.getItem('pulseport_yield_unit') as 'hex' | 'usd') || 'usd';
  });
  const [expandedStakeIds, setExpandedStakeIds] = useState<Set<string>>(new Set());
  const [expandedAssetIds, setExpandedAssetIds] = useState<Set<string>>(new Set());
  const [priceDisplayCurrency, setPriceDisplayCurrency] = useState<'usd' | 'pls'>('usd');
  const [pnlAsset, setPnlAsset] = useState<Asset | null>(null);
  const [selectedBridgeTxId, setSelectedBridgeTxId] = useState<string | null>(null);
  const [profitPlannerOpen, setProfitPlannerOpen] = useState(false);
  const [allocWheelOpen, setAllocWheelOpen] = useState(true);
  const [allocationCalculatorOpen, setAllocationCalculatorOpen] = useState(false);
  const [allocationDraftPercentages, setAllocationDraftPercentages] = useState<Record<string, number>>({});
  const [perfPeriod, setPerfPeriod] = useState<'1w' | '1m' | '1y' | 'all'>('all');
  const fmtLabel = (ts: number) => {
    if (perfPeriod === '1w') return format(ts, 'EEE d');
    if (perfPeriod === '1m') return format(ts, 'MMM d');
    if (perfPeriod === '1y') return format(ts, 'MMM yy');
    return format(ts, 'MMM yy');
  };
  const [hiddenTxIds, setHiddenTxIds] = useState<string[]>(() => {
    return readStoredJSON<string[]>('pulseport_hidden_txs', []);
  });
  const [showHiddenTxs, setShowHiddenTxs] = useState(false);
  const [showReceivedAssets, setShowReceivedAssets] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(true);
  const [hideSpam, setHideSpam] = useState<boolean>(() => readStoredJSON<boolean>('pulseport_hide_spam', true));
  const [spamTokenIds, setSpamTokenIds] = useState<string[]>(() => {
    return readStoredJSON<string[]>('pulseport_spam_tokens', []);
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => readStoredJSON<Record<string, boolean>>('pulseport_collapsed', {}));
  const [tokenMarketData, setTokenMarketData] = useState<Record<string, any>>({});
  const [tokenCardModal, setTokenCardModal] = useState<Asset | null>(null);
  const [tokenCardModalLoading, setTokenCardModalLoading] = useState(false);
  const [showMarketWatch, setShowMarketWatch] = useState(false);
  const [expandedWalletAssetIds, setExpandedWalletAssetIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('pulseport_theme');
    return (saved === 'light') ? 'light' : 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulseport_theme', theme);
  }, [theme]);

  // Prevent background scroll when the mobile sidebar drawer is open.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const previousOverflow = document.body.style.overflow;
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  // Theme-aware color helpers — CSS variable-backed for automatic light/dark theming
  const t = useMemo(() => ({
    surface: 'var(--bg-void)',
    card: 'var(--bg-surface)',
    cardHigh: 'var(--bg-elevated)',
    cardHighest: 'var(--bg-elevated)',
    border: 'var(--border)',
    borderLight: 'var(--border)',
    text: 'var(--fg)',
    textSecondary: 'var(--fg-muted)',    /* labels, prices, % values — 7.2:1 contrast ✅ */
    textMuted: 'var(--fg-subtle)',       /* icons, separators — 5.4:1 contrast ✅ */
    textTertiary: 'var(--fg-subtle)',    /* helper text — 5.4:1 contrast ✅ */
    sidebar: 'var(--bg-sidebar)',
    header: 'var(--bg-header)',
    hoverBg: 'var(--bg-elevated)',
    expandedBg: 'var(--bg-elevated)',
    green: theme === 'dark' ? '#00FF9F' : '#059669',
    red: theme === 'dark' ? '#f43f5e' : '#dc2626',
    purple: '#8b5cf6',
    orange: '#f97316',
    blue: 'var(--chain-eth)',
    pink: 'var(--chain-pulse)',
    gradientHero: theme === 'dark'
      ? 'linear-gradient(135deg, #0b1a12 0%, #08100e 40%, #080d16 100%)'
      : 'linear-gradient(135deg, #eef8f4 0%, #f5f5f5 40%, #eef0fa 100%)',
  }), [theme]);

  useEffect(() => {
    localStorage.setItem('pulseport_collapsed', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (id: string) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const isCollapsed = (id: string) => !!collapsedSections[id];

  // ── Portfolio cache persistence (prevents blank screen on reload) ──────────
  useEffect(() => {
    if (realAssets.length > 0) {
      try { localStorage.setItem('pulseport_cache_assets', JSON.stringify(realAssets)); } catch {}
    }
  }, [realAssets]);

  useEffect(() => {
    if (realStakes.length > 0) {
      try { localStorage.setItem('pulseport_cache_stakes', JSON.stringify(realStakes, bigIntReplacer)); } catch {}
    }
  }, [realStakes]);

  useEffect(() => {
    try { localStorage.setItem('pulseport_cache_lp', JSON.stringify(lpPositions)); } catch {}
  }, [lpPositions]);

  useEffect(() => {
    try { localStorage.setItem('pulseport_cache_farms', JSON.stringify(farmPositions)); } catch {}
  }, [farmPositions]);

  useEffect(() => {
    if (transactions.length > 0) {
      // Limit to 200 most recent to avoid localStorage quota issues
      try { localStorage.setItem('pulseport_cache_txs', JSON.stringify(transactions.slice(0, 200))); } catch {}
    }
  }, [transactions]);

  useEffect(() => {
    if (Object.keys(walletAssets).length > 0) {
      try { localStorage.setItem('pulseport_cache_wallet_assets', JSON.stringify(walletAssets)); } catch {}
    }
  }, [walletAssets]);

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      try { localStorage.setItem('pulseport_cache_prices', JSON.stringify(prices)); } catch {}
    }
  }, [prices]);

  useEffect(() => {
    localStorage.setItem('pulseport_hide_dust', JSON.stringify(hideDust));
  }, [hideDust]);

  useEffect(() => {
    localStorage.setItem('pulseport_hide_spam', JSON.stringify(hideSpam));
  }, [hideSpam]);

  useEffect(() => {
    localStorage.setItem('pulseport_spam_tokens', JSON.stringify(spamTokenIds));
  }, [spamTokenIds]);

  useEffect(() => {
    localStorage.setItem('pulseport_hidden_tokens', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  useEffect(() => {
    localStorage.setItem('pulseport_hidden_txs', JSON.stringify(hiddenTxIds));
  }, [hiddenTxIds]);

  useEffect(() => {
    localStorage.setItem('pulseport_yield_unit', yieldUnit);
  }, [yieldUnit]);

  useEffect(() => {
    localStorage.setItem('pulseport_manual_entries', JSON.stringify(manualEntries));
  }, [manualEntries]);

  useEffect(() => {
    if (wallets.length > 0) {
      fetchPortfolio();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchPortfolio();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [wallets]);

  useEffect(() => {
    try {
      localStorage.setItem('pulseport_wallets', JSON.stringify(wallets));
    } catch {}
  }, [wallets]);

  useEffect(() => {
    if (isAddingWallet) setWalletFormError('');
  }, [isAddingWallet]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        setTimeSinceLastUpdate(Math.floor((Date.now() - lastUpdated) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    localStorage.setItem('pulseport_history', JSON.stringify(history));
  }, [history]);

  const fetchPortfolio = async () => {
    if (isFetchingRef.current) return; // prevent concurrent fetches
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      // 1. Fetch Prices with 1h, 24h, 7d changes
      const coinIds = Array.from(new Set(Object.values(TOKENS).flat().map(t => t.coinGeckoId))).join(',');
      const fetchedPrices: Record<string, any> = {};
      try {
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&price_change_percentage=1h,24h,7d&per_page=250&order=market_cap_desc`);
        const priceArray = await priceRes.json();
        if (Array.isArray(priceArray) && priceArray.length > 0) {
          const newLogos: Record<string, string> = {};
          priceArray.forEach((coin: any) => {
            fetchedPrices[coin.id] = {
              usd: coin.current_price,
              usd_24h_change: coin.price_change_percentage_24h_in_currency,
              usd_1h_change: coin.price_change_percentage_1h_in_currency,
              usd_7d_change: coin.price_change_percentage_7d_in_currency,
              image: coin.image
            };
            if (coin.image) newLogos[coin.id] = coin.image;
          });
          setTokenLogos(prev => ({ ...prev, ...newLogos }));
        }
      } catch (e) {
        console.warn('coins/markets failed, will try simple/price fallback');
      }
      // Fallback: if markets API returned nothing (rate limit etc), use simple/price
      if (Object.keys(fetchedPrices).length === 0) {
        try {
          const simpleRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`);
          const simpleData = await simpleRes.json();
          Object.entries(simpleData).forEach(([id, data]: [string, any]) => {
            fetchedPrices[id] = { usd: data.usd, usd_24h_change: data.usd_24h_change };
          });
        } catch (e) {
          console.warn('simple/price fallback also failed');
        }
      }
      
      // 1a2. Fetch DexScreener 24h % change for PulseChain tokens (INC, PRVX, etc.)
      // Use specific pair addresses (pairs endpoint) — more reliable than the token endpoint
      // which requires chainId filtering that can fail when DexScreener rate-limits or changes format.
      const dexScreenerChanges: Record<string, number> = {};
      try {
        const dsPairs: Array<{ tokenAddr: string; pairAddr: string }> = [
          { tokenAddr: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', pairAddr: '0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa' }, // INC/WPLS
          { tokenAddr: '0xf6f8db0aba00007681f8faf16a0fda1c9b030b11', pairAddr: '0x7f681a5ad615238357ba148c281e2eaefd2de55a' }, // PRVX/USDC
          { tokenAddr: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', pairAddr: '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9' }, // PLSX/WPLS
          { tokenAddr: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', pairAddr: '0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65' }, // pHEX/WPLS
          { tokenAddr: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', pairAddr: '0x322df7921f28f1146cdf62afdac0d6bc0ab80711' }, // WPLS/USDT
        ];
        await Promise.allSettled(
          dsPairs.map(({ tokenAddr, pairAddr }) =>
            fetch(`https://api.dexscreener.com/latest/dex/pairs/pulsechain/${pairAddr}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                // Pair endpoint returns { pairs: [...] } — use first entry directly
                const pair = data?.pairs?.[0] ?? data?.pair ?? (Array.isArray(data) ? data[0] : null);
                const change = pair?.priceChange?.h24;
                if (change != null) {
                  dexScreenerChanges[tokenAddr] = parseFloat(change);
                }
              })
          )
        );
      } catch (e) {
        console.warn('DexScreener 24h change fetch failed:', e);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const openPulseRes = await fetch(`${OPENPULSECHAIN_API_BASE}/api/v1/tokens?limit=5000`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!openPulseRes.ok) throw new Error(`HTTP ${openPulseRes.status}`);
        const openPulseData = await openPulseRes.json();
        const openPulseTokens = Array.isArray(openPulseData)
          ? openPulseData
          : Array.isArray(openPulseData?.data)
            ? openPulseData.data
            : [];

        openPulseTokens.forEach((token: any) => {
          const address = String(token.address || '').toLowerCase();
          const symbol = String(token.symbol || '').toUpperCase();
          const price = Number(token.price_usd ?? token.priceUsd ?? 0);
          if (!address || price <= 0) return;

          const change24h = Number(token.price_change_24h_pct ?? token.priceChange24hPct ?? token.price_change_24h ?? NaN);
          const priceKey = `pulsechain:${address}`;
          const existing = fetchedPrices[priceKey] || {};
          fetchedPrices[priceKey] = {
            ...existing,
            usd: existing.usd ?? price,
            ...(Number.isFinite(change24h) && existing.usd_24h_change == null ? { usd_24h_change: change24h } : {}),
          };

          if (symbol === 'WPLS' || symbol === 'PLS') {
            const existingPls = fetchedPrices.pulsechain || {};
            fetchedPrices.pulsechain = {
              ...existingPls,
              usd: existingPls.usd ?? price,
              ...(Number.isFinite(change24h) && existingPls.usd_24h_change == null ? { usd_24h_change: change24h } : {}),
            };
            fetchedPrices['pulsechain:native'] = {
              ...(fetchedPrices['pulsechain:native'] || {}),
              usd: fetchedPrices['pulsechain:native']?.usd ?? price,
              ...(Number.isFinite(change24h) && fetchedPrices['pulsechain:native']?.usd_24h_change == null ? { usd_24h_change: change24h } : {}),
            };
          }
        });
      } catch (e) {
        console.warn('OpenPulseChain token price fetch failed:', e);
      }

      // 1b. Fetch PulseChain prices from on-chain LP reserves (authoritative source per skill doc)
      // Uses getReserves() on PulseX V2 LP pairs — more reliable than subgraph which can lag/rate-limit
      try {
        const GET_RESERVES = '0x0902f1ac';
        const pcRpc = CHAINS.pulsechain.rpc;

        const lpKeys = Object.keys(PULSEX_LP_PAIRS) as (keyof typeof PULSEX_LP_PAIRS)[];
        const batchReq = lpKeys.map((key, i) => ({
          jsonrpc: '2.0',
          id: i,
          method: 'eth_call',
          params: [{ to: PULSEX_LP_PAIRS[key], data: GET_RESERVES }, 'latest']
        }));

        const batchRes = await fetch(pcRpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchReq)
        });
        const batchData: any[] = await batchRes.json();
        batchData.sort((a, b) => a.id - b.id);

        const parseRes = (hex: string): [number, number] => {
          if (!hex || hex === '0x') return [0, 0];
          const d = hex.replace('0x', '').padStart(192, '0');
          // Use parseFloat on hex to avoid BigInt → Number precision loss on large reserves
          // Division normalises the magnitude before conversion
          const r0 = parseInt(d.slice(0, 64), 16);
          const r1 = parseInt(d.slice(64, 128), 16);
          return [r0, r1];
        };

        // --- WPLS price from 3 stablecoin pairs; pick max (highest = most liquidity) ---
        const [daiR0, daiR1]   = parseRes(batchData[lpKeys.indexOf('WPLS_DAI')].result);
        const [usdcR0, usdcR1] = parseRes(batchData[lpKeys.indexOf('WPLS_USDC')].result);
        const [usdtR0, usdtR1] = parseRes(batchData[lpKeys.indexOf('WPLS_USDT')].result);

        // WPLS/USDC: token0=pUSDC(6dec), token1=WPLS(18dec) → plsPrice = (usdcR0/1e6) / (usdcR1/1e18)
        const plsFromUSDC = usdcR0 > 0 && usdcR1 > 0 ? (usdcR0 / 1e6) / (usdcR1 / 1e18)    : 0;
        // WPLS/USDT: same layout as USDC
        const plsFromUSDT = usdtR0 > 0 && usdtR1 > 0 ? (usdtR0 / 1e6) / (usdtR1 / 1e18)    : 0;

        // DO NOT use the DAI pair for WPLS oracle — pDAI trades far below $1 on PulseChain.
        // plsFromDAI would be "pDAI per WPLS" (not USD per WPLS), which is much larger than
        // the true USD price and would dominate Math.max(), inflating wplsUSD ~35x.
        // Use only USDC + USDT which stay close to $1.
        const wplsUSD = Math.max(plsFromUSDC, plsFromUSDT);

        if (wplsUSD > 0) {
          if (!fetchedPrices.pulsechain) fetchedPrices.pulsechain = {};
          const plsDs24h = dexScreenerChanges['0xa1077a294dde1b09bb078844df40758a5d0f9a27'];
          fetchedPrices.pulsechain.usd = wplsUSD;
          if (plsDs24h != null) fetchedPrices.pulsechain.usd_24h_change = plsDs24h;
          fetchedPrices['pulsechain:native'] = { usd: wplsUSD, ...(plsDs24h != null ? { usd_24h_change: plsDs24h } : {}) };

          const setTokenPrice = (addrLower: string, priceUSD: number, cgId?: string) => {
            if (priceUSD <= 0) return;
            const existing = cgId ? (fetchedPrices[cgId] || {}) : {};
            const ds24h = dexScreenerChanges[addrLower];
            // Prefer DexScreener 24h change (PulseChain-specific) over CoinGecko (may be ETH-based or missing)
            const change24h = ds24h != null ? ds24h : existing.usd_24h_change;
            fetchedPrices[`pulsechain:${addrLower}`] = { ...existing, usd: priceUSD, ...(change24h != null ? { usd_24h_change: change24h } : {}) };
          };

          // PLSX/WPLS — token0=PLSX(18), token1=WPLS(18)
          const [plsxR0, plsxR1] = parseRes(batchData[lpKeys.indexOf('PLSX_WPLS')].result);
          if (plsxR0 > 0 && plsxR1 > 0)
            setTokenPrice('0x95b303987a60c71504d99aa1b13b4da07b0790ab', (plsxR1 / plsxR0) * wplsUSD, 'pulsex');

          // INC/WPLS — token0=INC(18), token1=WPLS(18)
          const [incR0, incR1] = parseRes(batchData[lpKeys.indexOf('INC_WPLS')].result);
          if (incR0 > 0 && incR1 > 0)
            setTokenPrice('0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', (incR1 / incR0) * wplsUSD, 'incentive');

          // pHEX/WPLS — token0=pHEX(8dec), token1=WPLS(18dec)
          const [hexR0, hexR1] = parseRes(batchData[lpKeys.indexOf('PHEX_WPLS')].result);
          if (hexR0 > 0 && hexR1 > 0) {
            const pHexUSD = ((hexR1 / 1e18) / (hexR0 / 1e8)) * wplsUSD;
            setTokenPrice('0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', pHexUSD, 'hex');
            fetchedPrices['pulsechain:hex'] = { usd: pHexUSD };
            // eHEX (bridged HEX, 0x57fde0a7...) has no on-chain WPLS LP; use CoinGecko 'hex'
            // price when available, otherwise fall back to pHEX on-chain price so holdings
            // are never shown as $0 when CoinGecko is rate-limited.
            if (!fetchedPrices[`pulsechain:${EHEX_PULSECHAIN_ADDR}`]?.usd) {
              const ehexUsd = fetchedPrices['hex']?.usd || pHexUSD;
              fetchedPrices[`pulsechain:${EHEX_PULSECHAIN_ADDR}`] = {
                usd: ehexUsd,
                usd_24h_change: fetchedPrices['hex']?.usd_24h_change,
              };
            }
            // Also set the ethereum chain key so eHEX held on Ethereum mainnet never shows $0.
            // Uses CoinGecko 'hex' price when available; falls back to on-chain pHEX LP price
            // — the same fallback strategy used for eHEX on PulseChain above.
            if (!fetchedPrices['ethereum:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd) {
              fetchedPrices['ethereum:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'] = {
                usd: fetchedPrices['hex']?.usd || pHexUSD,
                usd_24h_change: fetchedPrices['hex']?.usd_24h_change,
              };
            }
          } else {
            // On-chain LP failed — fall back to CoinGecko for both HEX variants
            const cgHex = fetchedPrices['hex']?.usd;
            if (cgHex) {
              fetchedPrices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'] = { usd: cgHex, usd_24h_change: fetchedPrices['hex']?.usd_24h_change };
              fetchedPrices['pulsechain:hex'] = { usd: cgHex };
              fetchedPrices[`pulsechain:${EHEX_PULSECHAIN_ADDR}`] = { usd: cgHex, usd_24h_change: fetchedPrices['hex']?.usd_24h_change };
              fetchedPrices['ethereum:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39'] = { usd: cgHex, usd_24h_change: fetchedPrices['hex']?.usd_24h_change };
            }
          }

          // pWETH/WPLS — token0=pWETH(18), token1=WPLS(18)
          const [wethR0, wethR1] = parseRes(batchData[lpKeys.indexOf('PWETH_WPLS')].result);
          if (wethR0 > 0 && wethR1 > 0) {
            const ethFromLp = (wethR1 / wethR0) * wplsUSD;
            setTokenPrice('0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', ethFromLp, 'ethereum');
            // Propagate ETH price to the native-token keys used by ETH balance valuation and
            // transaction valueUsd fallback.  CoinGecko covers these when available; this ensures
            // they are never $0 when CoinGecko is rate-limited, so netInvestment stays correct.
            if (!fetchedPrices['ethereum']?.usd) {
              fetchedPrices['ethereum'] = { usd: ethFromLp };
            }
            if (!fetchedPrices['ethereum:native']?.usd) {
              fetchedPrices['ethereum:native'] = { usd: ethFromLp };
            }
            if (!fetchedPrices['base:native']?.usd) {
              fetchedPrices['base:native'] = { usd: ethFromLp };
            }
          }

          // pWBTC/WPLS — REVERSED: token0=WPLS(18), token1=pWBTC(8)
          const [wbtcR0, wbtcR1] = parseRes(batchData[lpKeys.indexOf('PWBTC_WPLS')].result);
          if (wbtcR0 > 0 && wbtcR1 > 0)
            setTokenPrice('0xb17d901469b9208b17d916112988a3fed19b5ca1', ((wbtcR0 / 1e18) / (wbtcR1 / 1e8)) * wplsUSD, 'wrapped-bitcoin');

          // Bridged stablecoin prices derived from LP — these do NOT trade at $1 on PulseChain
          // WPLS/DAI: token0=WPLS(18), token1=pDAI(18) → pDAI_USD = (daiR0/daiR1) * wplsUSD
          if (daiR0 > 0 && daiR1 > 0)
            setTokenPrice('0xefd766ccb38eaf1dfd701853bfce31359239f305', (daiR0 / daiR1) * wplsUSD);
          // WPLS/USDC: token0=pUSDC(6dec), token1=WPLS(18dec) → pUSDC_USD = (usdcR1/1e18)/(usdcR0/1e6) * wplsUSD
          if (usdcR0 > 0 && usdcR1 > 0)
            setTokenPrice('0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', (usdcR1 / 1e18) / (usdcR0 / 1e6) * wplsUSD);
          // WPLS/USDT: token0=pUSDT(6dec), token1=WPLS(18dec) → pUSDT_USD = (usdtR1/1e18)/(usdtR0/1e6) * wplsUSD
          if (usdtR0 > 0 && usdtR1 > 0)
            setTokenPrice('0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', (usdtR1 / 1e18) / (usdtR0 / 1e6) * wplsUSD);
          // System copy pDAI (0x6b175474... — Ethereum's DAI address, fork-copied)
          // token0=pDAI_sys(18dec), token1=WPLS(18dec) → pDAI_sys_USD = (sysR1/sysR0) * wplsUSD
          const [sysR0, sysR1] = parseRes(batchData[lpKeys.indexOf('PDAI_SYS_WPLS')].result);
          if (sysR0 > 0 && sysR1 > 0)
            setTokenPrice('0x6b175474e89094c44da98b954eedeac495271d0f', (sysR1 / sysR0) * wplsUSD);
          // PRVX: use high-liquidity USDC pair ($1M) — token0=pUSDC(6dec), token1=PRVX(18dec)
          // Direct stablecoin price — no WPLS conversion needed
          const [prvxR0, prvxR1] = parseRes(batchData[lpKeys.indexOf('PRVX_USDC')].result);
          if (prvxR0 > 0 && prvxR1 > 0)
            setTokenPrice('0xf6f8db0aba00007681f8faf16a0fda1c9b030b11', (prvxR0 / 1e6) / (prvxR1 / 1e18));
        }
      } catch (e) {
        console.warn('Could not fetch PulseChain on-chain LP prices:', e);
      }

      setPrices(prev => ({ ...prev, ...fetchedPrices }));

      const assetMap: Record<string, Asset> = {};
      const walletAssetMap: Record<string, Record<string, Asset>> = {};
      const allStakes: HexStake[] = [];
      const allTransactions: Transaction[] = [];

      // Helper for retrying RPC calls
      const withRetry = async <T,>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> => {
        try {
          return await fn();
        } catch (e: any) {
          const errMsg = e.message?.toLowerCase() || '';
          const shouldRetry = 
            retries > 0 && (
              errMsg.includes('rate limit') || 
              errMsg.includes('429') || 
              errMsg.includes('request failed') ||
              errMsg.includes('internal error') ||
              errMsg.includes('timeout') ||
              errMsg.includes('retry')
            );

          if (shouldRetry) {
            console.warn(`RPC call failed, retrying... (${retries} left). Error: ${errMsg.slice(0, 100)}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 1.5);
          }
          throw e;
        }
      };

      // 2. Fetch Balances and Transactions for each chain
      for (const chainKey of Object.keys(CHAINS) as Chain[]) {
        const chainConfig = CHAINS[chainKey];
        if (!chainConfig) continue;

        const transports = [http(chainConfig.rpc)];
        if ((chainConfig as any).fallbackRpcs) {
          (chainConfig as any).fallbackRpcs.forEach((rpc: string) => {
            transports.push(http(rpc));
          });
        }

        const client = createPublicClient({
          transport: fallback(transports, { rank: true })
        });

        // Parallelize wallet processing for each chain
        await Promise.all(wallets.map(async (wallet) => {
          const address = wallet.address as `0x${string}`;
          const discoveredTokens: any[] = [];

          // 1. Fetch Transactions and discovered tokens in parallel
          try {
            if (chainKey === 'pulsechain') {
              // PulseChain uses Blockscout V2 API.
              // scan.pulsechain.com has no CORS headers, so browsers need a proxy.
              // Dev: Vite proxy | Electron: direct (webSecurity:false) | Vercel: vercel.json rewrite
              const isElectron = /electron/i.test(navigator.userAgent);
              const bsBase = isElectron
                ? 'https://api.scan.pulsechain.com/api/v2'
                : '/proxy/pulsechain/api/v2';
              const nativePrice = fetchedPrices['pulsechain']?.usd || 0;

              const fetchPcV2Pages = async (endpoint: string, maxPages = 50): Promise<any[]> => {
                const results: any[] = [];
                let nextParams: Record<string, string> | null = {};
                let page = 0;
                while (nextParams !== null && page < maxPages) {
                  const hasExistingQuery = endpoint.includes('?');
                  const paramStr = Object.keys(nextParams).length
                    ? (hasExistingQuery ? '&' : '?') + new URLSearchParams(nextParams).toString()
                    : '';
                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 58000);
                  let res: Response;
                  try {
                    res = await fetch(`${bsBase}${endpoint}${paramStr}`, { signal: controller.signal });
                  } catch {
                    console.warn(`[pulsechain] ${endpoint} → timeout/network error`);
                    break;
                  } finally {
                    clearTimeout(timeout);
                  }
                  if (!res.ok) { console.warn(`[pulsechain] ${endpoint} → HTTP ${res.status}`); break; }
                  const data = await res.json();
                  if (data.items && Array.isArray(data.items)) {
                    results.push(...data.items);
                    nextParams = data.next_page_params || null;
                    if (!data.next_page_params || data.items.length === 0) break;
                  } else {
                    break;
                  }
                  page++;
                }
                return results;
              };

              // Etherscan-compat base — same proxy logic as above
              const esBase = isElectron
                ? 'https://api.scan.pulsechain.com/api'
                : '/proxy/pulsechain/api';

              // Fetch per-token transfers in parallel using Etherscan-compat API.
              // Per-token queries use a contract index and are ~instant even for active wallets,
              // unlike the V2 /token-transfers endpoint which times out for busy addresses.
              const pcTokenContracts = (TOKENS['pulsechain'] as any[]).filter(t => t.address !== 'native');

              const fetchEsTokenTx = async (contractAddress: string): Promise<any[]> => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                try {
                  const url = `${esBase}?module=account&action=tokentx&address=${address}&contractaddress=${contractAddress}&page=1&offset=50&sort=desc`;
                  const res = await fetch(url, { signal: controller.signal });
                  if (!res.ok) return [];
                  const data = await res.json();
                  if (data.status === '1' && Array.isArray(data.result)) return data.result;
                  return [];
                } catch {
                  return [];
                } finally {
                  clearTimeout(timeout);
                }
              };

              const [bsTxs, esTokenArrays] = await Promise.all([
                fetchPcV2Pages(`/addresses/${address}/transactions`),
                Promise.all(pcTokenContracts.map(t => fetchEsTokenTx(t.address)))
              ]);

              // Normalise Etherscan-compat records to the V2 shape the processing loop expects,
              // then deduplicate by txHash+logIndex (same tx may appear across token queries).
              const seen = new Set<string>();
              const bsTokenTxs = esTokenArrays.flat().reduce<any[]>((acc, tx) => {
                const key = `${tx.hash}-${tx.logIndex ?? tx.transactionIndex ?? Math.random()}`;
                if (seen.has(key)) return acc;
                seen.add(key);
                acc.push({
                  from: { hash: tx.from },
                  to: { hash: tx.to },
                  token: { symbol: tx.tokenSymbol, decimals: tx.tokenDecimal, address: tx.contractAddress },
                  total: { value: tx.value },
                  transaction_hash: tx.hash,
                  timestamp: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000).toISOString() : null,
                  log_index: tx.logIndex,
                  method: null,
                });
                return acc;
              }, []);

              // Native PLS transactions
              bsTxs.forEach((tx: any) => {
                const isOut = (tx.from?.hash || '').toLowerCase() === address.toLowerCase();
                const amount = Number(formatUnits(BigInt(tx.value || '0'), 18));
                const valueUsd = amount * nativePrice;
                const ts = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
                allTransactions.push({
                  id: tx.hash,
                  hash: tx.hash,
                  timestamp: ts,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from?.hash || '',
                  to: tx.to?.hash || '',
                  asset: 'PLS',
                  amount,
                  chain: 'pulsechain',
                  valueUsd,
                  fee: tx.gas_used && tx.gas_price
                    ? Number(formatUnits(BigInt(tx.gas_used) * BigInt(tx.gas_price), 18))
                    : 0
                });
              });

              // PulseChain token transfers
              const pulseBridgeMap: Record<string, { name: string, id: string }> = {
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { name: 'USDC (fork copy)', id: 'usd-coin' },
                '0x6b175474e89094c44da98b954eedeac495271d0f': { name: 'DAI (fork copy)', id: 'dai' },
                '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07': { name: 'USDC (from ETH)', id: 'usd-coin' },
                '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c': { name: 'WETH (from ETH)', id: 'ethereum' },
                '0xefd766ccb38eaf1dfd701853bfce31359239f305': { name: 'DAI (from ETH)', id: 'dai' },
                '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f': { name: 'USDT (from ETH)', id: 'tether' },
                '0x57fde0a71132198bbec939b98976993d8d89d225': { name: 'HEX (from ETH)', id: 'hex' },
                '0xb17d901469b9208b17d916112988a3fed19b5ca1': { name: 'WBTC (from ETH)', id: 'wrapped-bitcoin' },
                '0x80316335349e52643527c6986816e6c483478248': { name: 'USDC (Liberty Bridge)', id: 'usd-coin' },
                '0x41527c4d9d47ef03f00f77d794c87ba94832700b': { name: 'USDC (from Base)', id: 'usd-coin' }
              };

              bsTokenTxs.forEach((tx: any) => {
                const isOut = (tx.from?.hash || '').toLowerCase() === address.toLowerCase();
                const symbol = tx.token?.symbol || 'TOKEN';
                const decimals = Number(tx.token?.decimals) || 18;
                const contractAddr = (tx.token?.address || '').toLowerCase();
                const amount = Number(formatUnits(BigInt(tx.total?.value || '0'), decimals));
                const ts = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;

                const mapped = pulseBridgeMap[contractAddr];
                const assetName = mapped ? mapped.name : symbol;
                const coinGeckoId = mapped ? mapped.id : symbol.toLowerCase();
                const priceKey = `pulsechain:${contractAddr}`;
                const price = fetchedPrices[priceKey]?.usd ||
                              fetchedPrices[contractAddr]?.usd ||
                              fetchedPrices[coinGeckoId]?.usd || 0;
                const valueUsd = amount * price;

                allTransactions.push({
                  id: `${tx.transaction_hash}-${tx.log_index || Math.random()}`,
                  hash: tx.transaction_hash || tx.hash || '',
                  timestamp: ts,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from?.hash || '',
                  to: tx.to?.hash || '',
                  asset: assetName,
                  amount,
                  chain: 'pulsechain',
                  valueUsd,
                  fee: 0
                });

                const chainTokens = TOKENS['pulsechain'] || [];
                const isHardcoded = chainTokens.some((t: any) => t.address.toLowerCase() === contractAddr);
                const isAlreadyDiscovered = discoveredTokens.some(t => t.address.toLowerCase() === contractAddr);
                if (!isHardcoded && !isAlreadyDiscovered && contractAddr) {
                  const isBatchAirdrop = tx.method === 'batchTransfer' || tx.method === 'multiSend';
                  const hasNoMarket = !tx.token?.exchange_rate && !tx.token?.circulating_market_cap && !tx.token?.volume_24h;
                  const isSpam = !isOut && (isBatchAirdrop || (hasNoMarket && !mapped));
                  discoveredTokens.push({
                    symbol,
                    name: assetName,
                    address: tx.token?.address || contractAddr,
                    decimals,
                    coinGeckoId,
                    bridged: !!mapped,
                    isSpam
                  });
                }
              });

            } else if (chainKey === 'base') {
              // Base uses Blockscout V2 API
              const bsBase = 'https://base.blockscout.com/api/v2';

              const fetchBlockscoutPages = async (endpoint: string): Promise<any[]> => {
                const results: any[] = [];
                let nextParams: Record<string, string> | null = {};
                while (nextParams !== null) {
                  const hasExistingQuery = endpoint.includes('?');
                  const paramStr = Object.keys(nextParams).length
                    ? (hasExistingQuery ? '&' : '?') + new URLSearchParams(nextParams).toString()
                    : '';
                  const res = await fetch(`${bsBase}${endpoint}${paramStr}`);
                  const data = await res.json();
                  if (data.items && Array.isArray(data.items)) {
                    results.push(...data.items);
                    nextParams = data.next_page_params || null;
                    if (!data.next_page_params || data.items.length === 0) break;
                  } else {
                    break;
                  }
                }
                return results;
              };

              const [bsTxs, bsTokenTxs] = await Promise.all([
                fetchBlockscoutPages(`/addresses/${address}/transactions`),
                fetchBlockscoutPages(`/addresses/${address}/token-transfers?type=ERC-20`)
              ]);

              const nativePrice = fetchedPrices['ethereum']?.usd || 0;

              bsTxs.forEach((tx: any) => {
                const isOut = (tx.from?.hash || '').toLowerCase() === address.toLowerCase();
                const amount = Number(formatUnits(BigInt(tx.value || '0'), 18));
                const valueUsd = amount * nativePrice;
                const ts = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
                allTransactions.push({
                  id: tx.hash,
                  hash: tx.hash,
                  timestamp: ts,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from?.hash || '',
                  to: tx.to?.hash || '',
                  asset: 'ETH',
                  amount,
                  chain: 'base',
                  valueUsd,
                  fee: tx.gas_used && tx.gas_price
                    ? Number(formatUnits(BigInt(tx.gas_used) * BigInt(tx.gas_price), 18))
                    : 0
                });
              });

              const baseBridgeMap: Record<string, { name: string, id: string }> = {
                '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { name: 'USDC', id: 'usd-coin' },
                '0x4200000000000000000000000000000000000006': { name: 'WETH', id: 'ethereum' },
                '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { name: 'DAI', id: 'dai' },
              };

              bsTokenTxs.forEach((tx: any) => {
                const isOut = (tx.from?.hash || '').toLowerCase() === address.toLowerCase();
                const symbol = tx.token?.symbol || 'TOKEN';
                const decimals = Number(tx.token?.decimals) || 18;
                const contractAddr = (tx.token?.address || '').toLowerCase();
                const amount = Number(formatUnits(BigInt(tx.total?.value || '0'), decimals));
                const ts = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;

                const mapped = baseBridgeMap[contractAddr];
                const assetName = mapped ? mapped.name : symbol;
                const coinGeckoId = mapped ? mapped.id : symbol.toLowerCase();
                const price = fetchedPrices[coinGeckoId]?.usd ||
                              fetchedPrices[contractAddr]?.usd || 0;
                const valueUsd = amount * price;

                allTransactions.push({
                  id: `${tx.transaction_hash}-${tx.log_index || Math.random()}`,
                  hash: tx.transaction_hash || tx.hash || '',
                  timestamp: ts,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from?.hash || '',
                  to: tx.to?.hash || '',
                  asset: assetName,
                  amount,
                  chain: 'base',
                  valueUsd,
                  fee: 0
                });

                const chainTokens = TOKENS['base'] || [];
                const isHardcoded = chainTokens.some((t: any) => t.address.toLowerCase() === contractAddr);
                const isAlreadyDiscovered = discoveredTokens.some(t => t.address.toLowerCase() === contractAddr);
                if (!isHardcoded && !isAlreadyDiscovered && contractAddr) {
                  const isBatchAirdrop = tx.method === 'batchTransfer' || tx.method === 'multiSend';
                  const hasNoMarket = !tx.token?.exchange_rate && !tx.token?.circulating_market_cap && !tx.token?.volume_24h;
                  const isSpam = !isOut && (isBatchAirdrop || (hasNoMarket && !mapped));
                  discoveredTokens.push({
                    symbol,
                    name: assetName,
                    address: tx.token?.address || contractAddr,
                    decimals,
                    coinGeckoId,
                    bridged: !!mapped,
                    isSpam
                  });
                }
              });
            } else {
            // Etherscan V2 path for Ethereum
            const apiBase = 'https://api.etherscan.io/v2/api?chainid=1';

            // ETH block ~11565019 = Jan 1 2021
            const startBlock = '11565019';
            const pageSize = 10000;
            const sortDir = 'asc';

            const apiKey = etherscanApiKey || import.meta.env.VITE_ETHERSCAN_API_KEY || '';

            const fetchAllTxPages = async (action: string): Promise<any[]> => {
              const results: any[] = [];
              let page = 1;
              let retries = 0;
              while (true) {
                const apiKeyParam = apiKey ? `&apikey=${apiKey}` : '';
                const sep = apiBase.includes('?') ? '&' : '?';
                const url = `${apiBase}${sep}module=account&action=${action}&address=${address}` +
                  `&startblock=${startBlock}&endblock=99999999&sort=${sortDir}&page=${page}&offset=${pageSize}${apiKeyParam}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === '1' && Array.isArray(data.result)) {
                  results.push(...data.result);
                  if (data.result.length < pageSize) break;
                  page++;
                  retries = 0;
                } else {
                  const msg = (data.result || data.message || '').toString().toLowerCase();
                  if ((msg.includes('rate limit') || msg.includes('max rate')) && retries < 3) {
                    retries++;
                    await new Promise(r => setTimeout(r, 1500 * retries));
                    continue;
                  }
                  if (data.status !== '0' || (data.message !== 'No transactions found' && !msg.includes('no transactions'))) {
                    console.warn(`[${chainKey}] ${action} API response:`, data.status, data.message, msg.slice(0, 100));
                  }
                  break;
                }
              }
              return results;
            };

            const [txResults, tokenTxResults, internalTxResults] = await Promise.all([
              fetchAllTxPages('txlist'),
              fetchAllTxPages('tokentx'),
              fetchAllTxPages('txlistinternal')
            ]);

            const txData = { status: txResults.length ? '1' : '0', result: txResults };
            const tokenTxData = { status: tokenTxResults.length ? '1' : '0', result: tokenTxResults };

            if (txData.status === '1' && Array.isArray(txData.result)) {
              txData.result.forEach((tx: any) => {
                const isOut = tx.from.toLowerCase() === address.toLowerCase();
                const amount = Number(formatUnits(BigInt(tx.value), 18));
                const price = fetchedPrices['ethereum']?.usd || 0;
                const valueUsd = amount * price;

                allTransactions.push({
                  id: tx.hash,
                  hash: tx.hash,
                  timestamp: Number(tx.timeStamp) * 1000,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from,
                  to: tx.to,
                  asset: 'ETH',
                  amount: amount,
                  chain: chainKey,
                  valueUsd: valueUsd,
                  fee: Number(formatUnits(BigInt(tx.gasUsed) * BigInt(tx.gasPrice), 18))
                });
              });
            }

            if (tokenTxData.status === '1' && Array.isArray(tokenTxData.result)) {
              tokenTxData.result.forEach((tx: any) => {
                const isOut = tx.from.toLowerCase() === address.toLowerCase();
                const symbol = tx.tokenSymbol || 'TOKEN';
                const decimals = Number(tx.tokenDecimal) || 18;
                const contractAddr = tx.contractAddress.toLowerCase();
                
                const assetName = symbol;
                const isBridged = false;
                // Look up coinGeckoId from the hardcoded TOKENS list first (e.g. USDC → 'usd-coin',
                // USDT → 'tether') instead of blindly lowercasing the symbol which gives wrong keys.
                const knownEthToken = TOKENS['ethereum'].find((t: any) => t.address.toLowerCase() === contractAddr);
                const coinGeckoId = knownEthToken?.coinGeckoId || symbol.toLowerCase();

                const amount = Number(formatUnits(BigInt(tx.value), decimals));
                const price = fetchedPrices[contractAddr]?.usd ||
                             fetchedPrices[coinGeckoId]?.usd || 0;
                const valueUsd = amount * price;

                allTransactions.push({
                  id: `${tx.hash}-${tx.logIndex}`,
                  hash: tx.hash,
                  timestamp: Number(tx.timeStamp) * 1000,
                  type: isOut ? 'withdraw' : 'deposit',
                  from: tx.from,
                  to: tx.to,
                  asset: assetName,
                  amount: amount,
                  chain: chainKey,
                  valueUsd: valueUsd,
                  fee: tx.gasUsed ? Number(formatUnits(BigInt(tx.gasUsed) * BigInt(tx.gasPrice), 18)) : 0
                });

                const isHardcoded = TOKENS[chainKey].some(t => t.address.toLowerCase() === contractAddr);
                const isAlreadyDiscovered = discoveredTokens.some(t => t.address.toLowerCase() === contractAddr);
                
                if (!isHardcoded && !isAlreadyDiscovered) {
                  // Spam: URL in name/symbol, or tiny airdrop amount (≤10 tokens) with no price
                  const hasUrlPattern = /\.(io|com|net|org|xyz|finance|app|pro|gg)\b/i.test(assetName + ' ' + symbol);
                  const isTinyAirdrop = !isOut && price === 0 && amount <= 10;
                  const isEthSpam = !isOut && (hasUrlPattern || isTinyAirdrop);
                  discoveredTokens.push({
                    symbol,
                    name: assetName,
                    address: tx.contractAddress,
                    decimals,
                    coinGeckoId,
                    bridged: isBridged,
                    isSpam: isEthSpam
                  });
                }
              });
            }

            // Internal ETH transfers — captures the ETH received/sent leg of token↔ETH swaps
            // (e.g. selling USDC for ETH: the ETH comes back via an internal call from the router)
            internalTxResults.forEach((tx: any, i: number) => {
              const isOut = (tx.from || '').toLowerCase() === address.toLowerCase();
              const isIn  = (tx.to  || '').toLowerCase() === address.toLowerCase();
              if (!isOut && !isIn) return;
              const amount = Number(formatUnits(BigInt(tx.value || '0'), 18));
              if (amount <= 0) return;
              const price = fetchedPrices['ethereum']?.usd || 0;
              allTransactions.push({
                id: `${tx.hash}-internal-${i}`,
                hash: tx.hash,
                timestamp: Number(tx.timeStamp) * 1000,
                type: isOut ? 'withdraw' : 'deposit',
                from: tx.from || '',
                to: tx.to || '',
                asset: 'ETH',
                amount,
                chain: chainKey,
                valueUsd: amount * price,
                fee: 0
              });
            });
            } // end else (ethereum/base)
          } catch (e) {
            console.warn(`Could not fetch transactions for ${address} on ${chainKey}:`, e);
          }

          // 2a. Fetch DeFi Llama prices for discovered Ethereum tokens without a known price
          if (chainKey === 'ethereum' && discoveredTokens.length > 0) {
            try {
              const unpricedAddrs = discoveredTokens
                .filter(t => t.address && t.address !== 'native' && !fetchedPrices[t.address.toLowerCase()])
                .map(t => `ethereum:${t.address.toLowerCase()}`);
              if (unpricedAddrs.length > 0) {
                const llamaRes = await fetch(`https://coins.llama.fi/prices/current/${unpricedAddrs.join(',')}`);
                if (llamaRes.ok) {
                  const llamaData = await llamaRes.json();
                  const newLogos: Record<string, string> = {};
                  Object.entries(llamaData.coins || {}).forEach(([key, val]: [string, any]) => {
                    const addr = key.replace('ethereum:', '');
                    fetchedPrices[addr] = { usd: val.price, image: val.logo };
                    fetchedPrices[key] = { usd: val.price, image: val.logo };
                    if (val.logo) newLogos[addr] = val.logo;
                  });
                  if (Object.keys(newLogos).length > 0) setTokenLogos(prev => ({ ...prev, ...newLogos }));
                }
              }
            } catch { /* ignore */ }
          }

          // 2. Fetch all token balances in parallel
          const tokensToFetch = [...TOKENS[chainKey], ...discoveredTokens];
          await Promise.all(tokensToFetch.map(async (token) => {
            let balance = 0n;
            try {
              if (token.address === 'native') {
                balance = await withRetry(() => client.getBalance({ address }));
              } else {
                let checksummedAddr: `0x${string}`;
                try {
                  checksummedAddr = getAddress(token.address);
                } catch {
                  console.warn(`Skipping ${token.symbol} on ${chainKey}: invalid address ${token.address}`);
                  return;
                }
                const data = await withRetry(() => client.readContract({
                  address: checksummedAddr,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [address]
                } as any));
                balance = BigInt(data as any);
              }
            } catch (e) {
              console.warn(`Could not fetch balance for ${token.symbol} on ${chainKey}:`, e);
              return;
            }

            const balanceNum = Number(formatUnits(balance, token.decimals));
            if (balanceNum > 0) {
              const priceKey = `${chainKey}:${token.address.toLowerCase()}`;
              const priceData = fetchedPrices[priceKey] || fetchedPrices[token.address.toLowerCase()] || fetchedPrices[token.coinGeckoId];
              const price = priceData?.usd || 0;
              const priceChange24h = priceData?.usd_24h_change ?? fetchedPrices[token.coinGeckoId]?.usd_24h_change ?? 0;
              const priceChange1h = priceData?.usd_1h_change ?? fetchedPrices[token.coinGeckoId]?.usd_1h_change ?? 0;
              const priceChange7d = priceData?.usd_7d_change ?? fetchedPrices[token.coinGeckoId]?.usd_7d_change ?? 0;
              // WPLS (wrapped native PLS) is economically equivalent to PLS.
              // Merge it into the 'pulsechain-PLS' bucket so users see one unified PLS entry.
              // LP pair internals still reference WPLS by address — only wallet holdings are merged.
              const isWplsMerge = chainKey === 'pulsechain' && token.symbol === 'WPLS';
              const assetKey = isWplsMerge ? 'pulsechain-PLS' : `${chainKey}-${token.symbol}`;

              if (assetMap[assetKey]) {
                assetMap[assetKey].balance += balanceNum;
                assetMap[assetKey].value += balanceNum * price;
                if (isWplsMerge) (assetMap[assetKey] as any).wrappedBalance = ((assetMap[assetKey] as any).wrappedBalance || 0) + balanceNum;
              } else {
                // Logo priority: STATIC_LOGOS (highest) → CoinGecko/chain-CDN → PulseX CDN
                // All CDN paths require EIP-55 checksummed addresses — use getAddress() to ensure that.
                // For WPLS merge: use the PLS/WPLS logo (same icon on PulseX CDN).
                const effectiveAddress = isWplsMerge ? 'native' : token.address;
                const addrLower = effectiveAddress === 'native' ? null : effectiveAddress.toLowerCase();
                // STATIC_LOGOS always wins — prevents CoinGecko golden-coin from replacing hand-curated logos
                const staticLogoOverride = addrLower ? STATIC_LOGOS[addrLower] : null;
                // Only fetch CoinGecko image if there's no static override (don't let coinGeckoId image pollute bridged tokens)
                const cgLogo = staticLogoOverride ? null : (priceData?.image ?? null);
                const twChain = chainKey === 'ethereum' ? 'ethereum' : chainKey === 'base' ? 'base' : null;
                let twLogo: string | null = null;
                if (!staticLogoOverride && twChain && effectiveAddress !== 'native') {
                  try { twLogo = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChain}/assets/${getAddress(effectiveAddress)}/logo.png`; } catch { /* invalid address */ }
                }
                let pulsexLogo: string | null = null;
                if (!staticLogoOverride && chainKey === 'pulsechain' && token.address !== 'native') {
                  try { pulsexLogo = `https://tokens.app.pulsex.com/images/tokens/${getAddress(token.address)}.png`; } catch { /* invalid address */ }
                }
                const logoUrl = staticLogoOverride || cgLogo || twLogo || pulsexLogo || null;

                assetMap[assetKey] = {
                  id: assetKey,
                  symbol: isWplsMerge ? 'PLS' : token.symbol,
                  name: isWplsMerge ? 'PulseChain' : ((token as any).name || (token.symbol === 'eHEX' ? 'HEX (from Ethereum)' : `${token.symbol} (${chainConfig.name})`)),
                  balance: balanceNum,
                  price: price,
                  priceChange24h: priceChange24h,
                  priceChange1h: priceChange1h,
                  priceChange7d: priceChange7d,
                  value: balanceNum * price,
                  chain: chainKey,
                  pnl24h: priceChange24h,
                  isCore: true,
                  isBridged: false,
                  address: effectiveAddress,
                  isSpam: false,
                  logoUrl,
                  wrappedBalance: isWplsMerge ? balanceNum : 0,
                } as any;
              }

              // Per-wallet asset tracking
              const wAddr = wallet.address.toLowerCase();
              if (!walletAssetMap[wAddr]) walletAssetMap[wAddr] = {};
              if (walletAssetMap[wAddr][assetKey]) {
                walletAssetMap[wAddr][assetKey].balance += balanceNum;
                walletAssetMap[wAddr][assetKey].value += balanceNum * price;
              } else {
                walletAssetMap[wAddr][assetKey] = {
                  ...assetMap[assetKey],
                  balance: balanceNum,
                  value: balanceNum * price,
                  id: `${wAddr}-${assetKey}`,
                } as any;
              }
            }
          }));

          // 3. Fetch HEX Stakes if on PulseChain or Ethereum
          if ((chainKey === 'pulsechain' || chainKey === 'ethereum') && 'hexAddress' in chainConfig) {
            // Each chain is fully isolated: a failure on Ethereum never blocks PulseChain.
            let hexStakeCount = 0n;
            let hexCurrentDay = 0n;

            try {
              const hexAddr = getAddress(chainConfig.hexAddress);

              // Fetch stakeCount and currentDay in separate try/catch so one bad RPC
              // call cannot kill the other — they are independent contract reads.
              try {
                hexStakeCount = await withRetry(() => client.readContract({
                  address: hexAddr, abi: HEX_ABI, functionName: 'stakeCount', args: [address],
                } as any)) as bigint;
              } catch (e: any) {
                console.error(`[HEX stakes] stakeCount failed on ${chainKey} (${address.slice(0, 8)}…): ${e?.shortMessage ?? e?.message ?? String(e)}`);
              }

              try {
                hexCurrentDay = await withRetry(() => client.readContract({
                  address: hexAddr, abi: HEX_ABI, functionName: 'currentDay',
                } as any)) as bigint;
              } catch (e: any) {
                console.error(`[HEX stakes] currentDay failed on ${chainKey}: ${e?.shortMessage ?? e?.message ?? String(e)}`);
              }

              if (Number(hexStakeCount) > 0) {
                // Use Promise.allSettled so a single bad index never aborts the whole batch
                const stakeResults = await Promise.allSettled(
                  Array.from({ length: Number(hexStakeCount) }, (_, i) =>
                    withRetry(() => client.readContract({
                      address: hexAddr, abi: HEX_ABI, functionName: 'stakeLists',
                      args: [address, BigInt(i)],
                    } as any))
                  )
                );

                stakeResults.forEach((settled, i) => {
                  if (settled.status === 'rejected') {
                    console.warn(`[HEX stakes] index ${i} rejected on ${chainKey}: ${settled.reason?.message ?? settled.reason}`);
                    return;
                  }
                  const stakeResult: any = settled.value;
                  if (!stakeResult) return;

                  let stakeId: any, stakedHearts: any, stakeShares: any,
                      lockedDay: any, stakedDays: any, unlockedDay: any, isAutoStake: any;

                  if (Array.isArray(stakeResult)) {
                    [stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake] = stakeResult;
                  } else {
                    ({ stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake } = stakeResult);
                  }

                  if (stakeId === undefined) return;

                  // Always coerce to BigInt — the ABI returns uint72 which viem gives as bigint,
                  // but defensive casting prevents precision loss if a non-bigint sneaks in.
                  const sharesBI     = BigInt(stakeShares  ?? 0);
                  const heartsBI     = BigInt(stakedHearts ?? 0);
                  const lockedDayN   = Number(lockedDay  ?? 0);
                  const stakedDaysN  = Number(stakedDays ?? 0);
                  const currentDayN  = Number(hexCurrentDay);

                  const progress     = Math.min(100, Math.max(0, ((currentDayN - lockedDayN) / Math.max(1, stakedDaysN)) * 100));
                  const daysStakedN  = Math.max(0, currentDayN - lockedDayN);
                  const daysRemaining = Math.max(0, (lockedDayN + stakedDaysN) - currentDayN);

                  // Yield rate: chain-specific HEX per T-Share per day.
                  // BigInt formula: hearts = shares × days × BI_NUM / BI_DEN
                  //   pHEX: 1e12 × 1 × 158 / 1_000_000 = 1.58×10^8 hearts = 1.58 HEX ✓
                  //   eHEX: 1e12 × 1 × 170 / 1_000_000 = 1.70×10^8 hearts = 1.70 HEX ✓
                  const yieldBiNum = chainKey === 'pulsechain' ? PHEX_YIELD_BI_NUM : EHEX_YIELD_BI_NUM;
                  const yieldBiDen = chainKey === 'pulsechain' ? PHEX_YIELD_BI_DEN : EHEX_YIELD_BI_DEN;
                  const interestHearts  = (sharesBI * BigInt(daysStakedN) * yieldBiNum) / yieldBiDen;
                  const fullYieldHearts = (sharesBI * BigInt(stakedDaysN) * yieldBiNum) / yieldBiDen;

                  const tShares    = Number(sharesBI) / 1e12;
                  const stakedHex  = Number(heartsBI) / 1e8;
                  const stakeHexYield = Number(fullYieldHearts) / 1e8;

                  const hexPriceChainKey = `${chainKey}:${hexAddr.toLowerCase()}`;
                  const hexChainFallback = chainKey === 'pulsechain' ? fetchedPrices['pulsechain:hex']?.usd : fetchedPrices['hex']?.usd;
                  const hexPrice   = fetchedPrices[hexPriceChainKey]?.usd || hexChainFallback || 0;

                  const valueUsd       = stakedHex * hexPrice;
                  const totalValueUsd  = (Number(heartsBI + fullYieldHearts) / 1e8) * hexPrice;

                  allStakes.push({
                    id: `${chainKey}-${address}-${stakeId}`,
                    stakeId:           Number(stakeId),
                    stakedHearts:      heartsBI,
                    stakeShares:       sharesBI,
                    lockedDay:         lockedDayN,
                    stakedDays:        stakedDaysN,
                    unlockedDay:       Number(unlockedDay ?? 0),
                    isAutoStake:       Boolean(isAutoStake),
                    progress:          Math.round(progress),
                    estimatedValueUsd: valueUsd,
                    interestHearts,
                    totalValueUsd,
                    chain:             chainKey,
                    walletLabel:       wallet.name,
                    walletAddress:     address.toLowerCase(),
                    daysRemaining,
                    tShares,
                    stakedHex,
                    stakeHexYield,
                  });
                });
              }
            } catch (e: any) {
              console.error(`[HEX stakes] Unexpected error on ${chainKey} for ${address.slice(0, 8)}…: ${e?.shortMessage ?? e?.message ?? String(e)}`);
            }
          }
        }));
      }

      // Aggregate HEX stakes into HEX assets for total balance visibility
      allStakes.forEach(stake => {
        const assetKey = `${stake.chain}-HEX`;
        if (assetMap[assetKey]) {
          const stakedHeartsNum = Number(stake.stakedHearts) / 1e8;
          const interestHeartsNum = Number(stake.interestHearts || 0n) / 1e8;
          const totalHeartsNum = stakedHeartsNum + interestHeartsNum;
          
          assetMap[assetKey].stakedBalance = (assetMap[assetKey].stakedBalance || 0) + totalHeartsNum;
          assetMap[assetKey].stakedValue = (assetMap[assetKey].stakedValue || 0) + (stake.totalValueUsd || stake.estimatedValueUsd);
        }
      });

      // Auto-clear tokens from spamTokenIds if they now have a real price
      const pricedIds = Object.values(assetMap).filter(a => a.price > 0).map(a => a.id);
      if (pricedIds.length > 0) {
        setSpamTokenIds(prev => prev.filter(id => !pricedIds.includes(id)));
      }

      // Merge WPLS balance/value into the PLS entry (same economic asset on PulseChain).
      // The inline merge during balance fetching handles the common case; this pass catches
      // any residual standalone WPLS entry that might appear if the inline path was skipped.
      const wplsEntry = assetMap['pulsechain-WPLS'];
      if (wplsEntry) {
        const plsEntry = assetMap['pulsechain-PLS'];
        if (plsEntry) {
          plsEntry.balance += wplsEntry.balance;
          plsEntry.value   += wplsEntry.value;
        } else {
          // No native PLS entry at all — promote WPLS to a PLS row
          assetMap['pulsechain-PLS'] = { ...wplsEntry, id: 'pulsechain-PLS', symbol: 'PLS' };
        }
        delete assetMap['pulsechain-WPLS'];
      }

      setRealAssets(Object.values(assetMap).sort((a, b) => b.value - a.value));
      setRealStakes(allStakes);

      // Build per-wallet asset arrays
      const newWalletAssets: Record<string, Asset[]> = {};
      Object.entries(walletAssetMap).forEach(([addr, map]) => {
        newWalletAssets[addr] = Object.values(map).sort((a, b) => b.value - a.value);
      });
      setWalletAssets(newWalletAssets);

      // ── LP Position Tracking ──────────────────────────────────────────────
      // Fetch LP token balances, reserves, and totalSupply for tracked PulseX pairs
      try {
        const pcRpc = CHAINS.pulsechain.rpc;
        const walletAddrs = wallets.map(w => w.address.toLowerCase());
        const LP_PAIR_META: Record<string, { name: string; token0: string; token0Sym: string; token0Dec: number; token1: string; token1Sym: string; token1Dec: number }> = {
          '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9': { name: 'PLSX/WPLS', token0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', token0Sym: 'PLSX', token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa': { name: 'INC/WPLS',  token0: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', token0Sym: 'INC',  token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65': { name: 'pHEX/WPLS', token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', token0Sym: 'HEX',  token0Dec: 8,  token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0x42abdfdb63f3282033c766e72cc4810738571609': { name: 'WETH/WPLS', token0: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', token0Sym: 'WETH', token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xdb82b0919584124a0eb176ab136a0cc9f148b2d1': { name: 'WPLS/WBTC', token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token0Sym: 'WPLS', token0Dec: 18, token1: '0xb17d901469b9208b17d916112988a3fed19b5ca1', token1Sym: 'WBTC', token1Dec: 8  },
          '0xe56043671df55de5cdf8459710433c10324de0ae': { name: 'WPLS/DAI',  token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token0Sym: 'WPLS', token0Dec: 18, token1: '0xefd766ccb38eaf1dfd701853bfce31359239f305', token1Sym: 'DAI',  token1Dec: 18 },
          '0x6753560538eca67617a9ce605178f788be7e524e': { name: 'USDC/WPLS', token0: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', token0Sym: 'USDC', token0Dec: 6,  token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0x322df7921f28f1146cdf62afdac0d6bc0ab80711': { name: 'USDT/WPLS', token0: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', token0Sym: 'USDT', token0Dec: 6,  token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
        };
        const lpAddrs = Object.keys(LP_PAIR_META);

        // Selectors
        const SEL_RESERVES   = '0x0902f1ac'; // getReserves()
        const SEL_TOTAL_SUP  = '0x18160ddd'; // totalSupply()
        const SEL_BAL_OF     = '0x70a08231'; // balanceOf(address)
        const padAddr = (a: string) => '000000000000000000000000' + a.replace('0x', '').toLowerCase();

        // Build batch: for each LP pair: getReserves + totalSupply + balanceOf(wallet)*n
        const lpBatch: any[] = [];
        let batchId = 0;
        const lpBatchMeta: { pairAddr: string; type: 'reserves' | 'supply' | 'balance'; walletAddr?: string; id: number }[] = [];

        lpAddrs.forEach(pairAddr => {
          lpBatch.push({ jsonrpc: '2.0', id: batchId, method: 'eth_call', params: [{ to: pairAddr, data: SEL_RESERVES }, 'latest'] });
          lpBatchMeta.push({ pairAddr, type: 'reserves', id: batchId++ });
          lpBatch.push({ jsonrpc: '2.0', id: batchId, method: 'eth_call', params: [{ to: pairAddr, data: SEL_TOTAL_SUP }, 'latest'] });
          lpBatchMeta.push({ pairAddr, type: 'supply', id: batchId++ });
          walletAddrs.forEach(wa => {
            lpBatch.push({ jsonrpc: '2.0', id: batchId, method: 'eth_call', params: [{ to: pairAddr, data: SEL_BAL_OF + padAddr(wa) }, 'latest'] });
            lpBatchMeta.push({ pairAddr, type: 'balance', walletAddr: wa, id: batchId++ });
          });
        });

        if (lpBatch.length > 0) {
          const lpRes = await fetch(pcRpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lpBatch) });
          const lpResults: any[] = await lpRes.json();
          lpResults.sort((a, b) => a.id - b.id);

          const lpData: Record<string, { reserve0: bigint; reserve1: bigint; totalSupply: bigint; balances: Record<string, bigint> }> = {};
          lpAddrs.forEach(a => { lpData[a] = { reserve0: 0n, reserve1: 0n, totalSupply: 0n, balances: {} }; });

          lpResults.forEach(r => {
            const meta = lpBatchMeta[r.id];
            if (!meta || !r.result || r.result === '0x') return;
            const hex = r.result.replace('0x', '').padStart(192, '0');
            if (meta.type === 'reserves') {
              lpData[meta.pairAddr].reserve0 = BigInt('0x' + hex.slice(0, 64));
              lpData[meta.pairAddr].reserve1 = BigInt('0x' + hex.slice(64, 128));
            } else if (meta.type === 'supply') {
              lpData[meta.pairAddr].totalSupply = BigInt('0x' + r.result.replace('0x', '').padStart(64, '0'));
            } else if (meta.type === 'balance' && meta.walletAddr) {
              lpData[meta.pairAddr].balances[meta.walletAddr] = BigInt('0x' + r.result.replace('0x', '').padStart(64, '0'));
            }
          });

          const wplsUSD = fetchedPrices['pulsechain']?.usd || fetchedPrices['pulsechain:native']?.usd || 0;
          const newLpPositions: LpPosition[] = [];

          lpAddrs.forEach(pairAddr => {
            const d = lpData[pairAddr];
            const meta = LP_PAIR_META[pairAddr];
            if (!d || d.totalSupply === 0n) return;

            const totalUserBal = walletAddrs.reduce((acc, wa) => acc + (d.balances[wa] ?? 0n), 0n);
            if (totalUserBal === 0n) return;

            const userShare = (totalUserBal * BigInt(1e18)) / d.totalSupply;
            const tok0Raw = (d.reserve0 * userShare) / BigInt(1e18);
            const tok1Raw = (d.reserve1 * userShare) / BigInt(1e18);
            const tok0Amount = Number(tok0Raw) / Math.pow(10, meta.token0Dec);
            const tok1Amount = Number(tok1Raw) / Math.pow(10, meta.token1Dec);

            const tok0PriceKey = `pulsechain:${meta.token0}`;
            const tok1PriceKey = `pulsechain:${meta.token1}`;
            const tok0Usd = tok0Amount * (fetchedPrices[tok0PriceKey]?.usd || fetchedPrices[meta.token0]?.usd || (meta.token0Sym === 'WPLS' ? wplsUSD : 0));
            const tok1Usd = tok1Amount * (fetchedPrices[tok1PriceKey]?.usd || fetchedPrices[meta.token1]?.usd || (meta.token1Sym === 'WPLS' ? wplsUSD : 0));

            newLpPositions.push({
              pairAddress: pairAddr,
              pairName: meta.name,
              token0Address: meta.token0,
              token1Address: meta.token1,
              token0Symbol: meta.token0Sym,
              token1Symbol: meta.token1Sym,
              token0Decimals: meta.token0Dec,
              token1Decimals: meta.token1Dec,
              token0Amount: tok0Amount,
              token1Amount: tok1Amount,
              token0Usd: tok0Usd,
              token1Usd: tok1Usd,
              totalUsd: tok0Usd + tok1Usd,
              lpBalance: Number(totalUserBal) / 1e18
            });
          });

          setLpPositions(newLpPositions.sort((a, b) => b.totalUsd - a.totalUsd));
        }
      } catch (e) {
        console.warn('LP position fetch failed:', e);
      }

      // ── Farm Position Tracking (MasterChef / INC Rewards) ─────────────────
      try {
        const pcRpc = CHAINS.pulsechain.rpc;
        const MASTERCHEF = '0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4';
        const walletAddrs = wallets.map(w => w.address.toLowerCase());

        // Get pool count
        const poolLenRes = await fetch(pcRpc, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'eth_call', params: [{ to: MASTERCHEF, data: '0x081e3eda' }, 'latest'] })
        });
        const poolLenData = await poolLenRes.json();
        const poolLength = parseInt(poolLenData.result, 16);
        if (!poolLength || poolLength === 0) throw new Error('No pools');

        const SEL_POOL_INFO = '0x1526fe27';
        const SEL_USER_INFO = '0x93f1a40b';
        const SEL_PENDING   = '0xf40f0f52';
        const padN = (n: number) => n.toString(16).padStart(64, '0');
        const padA = (a: string) => '000000000000000000000000' + a.replace('0x', '').toLowerCase();

        // Batch: poolInfo for each pool + userInfo + pendingInc for each wallet×pool
        const farmBatch: any[] = [];
        let fId = 0;
        type FarmMeta = { type: 'pool'; poolIdx: number; id: number } | { type: 'user' | 'pending'; poolIdx: number; wallet: string; id: number };
        const farmMeta: FarmMeta[] = [];

        for (let p = 0; p < poolLength; p++) {
          farmBatch.push({ jsonrpc: '2.0', id: fId, method: 'eth_call', params: [{ to: MASTERCHEF, data: SEL_POOL_INFO + padN(p) }, 'latest'] });
          farmMeta.push({ type: 'pool', poolIdx: p, id: fId++ });
          walletAddrs.forEach(wa => {
            farmBatch.push({ jsonrpc: '2.0', id: fId, method: 'eth_call', params: [{ to: MASTERCHEF, data: SEL_USER_INFO + padN(p) + padA(wa) }, 'latest'] });
            farmMeta.push({ type: 'user', poolIdx: p, wallet: wa, id: fId++ });
            farmBatch.push({ jsonrpc: '2.0', id: fId, method: 'eth_call', params: [{ to: MASTERCHEF, data: SEL_PENDING + padN(p) + padA(wa) }, 'latest'] });
            farmMeta.push({ type: 'pending', poolIdx: p, wallet: wa, id: fId++ });
          });
        }

        // Split into batches of 50 to avoid RPC limits
        const CHUNK = 50;
        const farmResults: any[] = [];
        for (let i = 0; i < farmBatch.length; i += CHUNK) {
          const chunk = farmBatch.slice(i, i + CHUNK);
          const r = await fetch(pcRpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunk) });
          const d: any[] = await r.json();
          farmResults.push(...d);
        }
        farmResults.sort((a, b) => a.id - b.id);

        const poolLpAddresses: Record<number, string> = {};
        const userStaked: Record<number, Record<string, bigint>> = {};
        const userPending: Record<number, Record<string, bigint>> = {};

        farmResults.forEach(r => {
          const meta = farmMeta[r.id];
          if (!meta || !r.result || r.result === '0x') return;
          const hex = r.result.replace('0x', '');
          if (meta.type === 'pool') {
            // poolInfo returns: lpToken(address), allocPoint, lastRewardTime, accIncPerShare
            const lpAddr = '0x' + hex.slice(24, 64);
            poolLpAddresses[meta.poolIdx] = lpAddr.toLowerCase();
          } else if (meta.type === 'user') {
            if (!userStaked[meta.poolIdx]) userStaked[meta.poolIdx] = {};
            userStaked[meta.poolIdx][meta.wallet] = BigInt('0x' + hex.slice(0, 64));
          } else if (meta.type === 'pending') {
            if (!userPending[meta.poolIdx]) userPending[meta.poolIdx] = {};
            userPending[meta.poolIdx][meta.wallet] = BigInt('0x' + hex.slice(0, 64));
          }
        });

        const incPriceUsd = fetchedPrices['pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d']?.usd || 0;
        const wplsUSD = fetchedPrices['pulsechain']?.usd || 0;
        const LP_PAIR_META_FARM: Record<string, { name: string; token0: string; token0Sym: string; token0Dec: number; token1: string; token1Sym: string; token1Dec: number }> = {
          '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9': { name: 'PLSX/WPLS', token0: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', token0Sym: 'PLSX', token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa': { name: 'INC/WPLS',  token0: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', token0Sym: 'INC',  token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65': { name: 'pHEX/WPLS', token0: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', token0Sym: 'HEX',  token0Dec: 8,  token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0x42abdfdb63f3282033c766e72cc4810738571609': { name: 'WETH/WPLS', token0: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', token0Sym: 'WETH', token0Dec: 18, token1: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token1Sym: 'WPLS', token1Dec: 18 },
          '0xdb82b0919584124a0eb176ab136a0cc9f148b2d1': { name: 'WPLS/WBTC', token0: '0xa1077a294dde1b09bb078844df40758a5d0f9a27', token0Sym: 'WPLS', token0Dec: 18, token1: '0xb17d901469b9208b17d916112988a3fed19b5ca1', token1Sym: 'WBTC', token1Dec: 8  },
        };

        const newFarmPositions: FarmPosition[] = [];
        Object.entries(poolLpAddresses).forEach(([poolIdxStr, lpAddr]) => {
          const poolIdx = Number(poolIdxStr);
          const pairMeta = LP_PAIR_META_FARM[lpAddr];
          if (!pairMeta) return;

          const totalStaked = walletAddrs.reduce((acc, wa) => acc + (userStaked[poolIdx]?.[wa] ?? 0n), 0n);
          const totalPending = walletAddrs.reduce((acc, wa) => acc + (userPending[poolIdx]?.[wa] ?? 0n), 0n);
          if (totalStaked === 0n) return;

          const stakedLp = Number(totalStaked) / 1e18;
          const pendingInc = Number(totalPending) / 1e18;
          const pendingIncUsd = pendingInc * incPriceUsd;

          const tok0PriceKey = `pulsechain:${pairMeta.token0}`;
          const tok1PriceKey = `pulsechain:${pairMeta.token1}`;
          const tok0Usd = fetchedPrices[tok0PriceKey]?.usd || (pairMeta.token0Sym === 'WPLS' ? wplsUSD : 0);
          const tok1Usd = fetchedPrices[tok1PriceKey]?.usd || (pairMeta.token1Sym === 'WPLS' ? wplsUSD : 0);
          // Estimate token amounts from staked LP (simplified: assume 50/50 split by value)
          const totalLpUsd = stakedLp * 2 * Math.min(tok0Usd, tok1Usd || tok0Usd); // rough estimate

          newFarmPositions.push({
            poolId: poolIdx,
            lpAddress: lpAddr,
            pairName: pairMeta.name,
            token0Symbol: pairMeta.token0Sym,
            token1Symbol: pairMeta.token1Sym,
            token0Address: pairMeta.token0,
            token1Address: pairMeta.token1,
            stakedLp,
            token0Amount: 0,
            token1Amount: 0,
            token0Usd: 0,
            token1Usd: 0,
            totalUsd: totalLpUsd,
            pendingInc,
            pendingIncUsd
          });
        });

        setFarmPositions(newFarmPositions.sort((a, b) => b.totalUsd - a.totalUsd));
      } catch (e) {
        console.warn('Farm position fetch failed:', e);
      }

      // Normalize raw transactions: group by hash, collapse in+out pairs into swaps.
      const walletAddrs = new Set<string>(wallets.map(w => w.address.toLowerCase()));
      const processedTransactions = normalizeTransactions(allTransactions, walletAddrs);

      setTransactions(processedTransactions);
      setLastUpdated(Date.now());

      // Save a history point
      const totalValue = Object.values(assetMap).reduce((acc, curr) => acc + curr.value, 0);
      const plsPrice = fetchedPrices['pulsechain']?.usd || 0.00005;
      const nativeValue = totalValue / plsPrice;

      // Calculate chain-specific PNL for the history point
      const chainPnl: Record<Chain, number> = { pulsechain: 0, ethereum: 0, base: 0 };
      Object.values(assetMap).forEach(asset => {
        chainPnl[asset.chain] += (asset.value * (asset.pnl24h || 0) / 100);
      });

      setHistory(prev => {
        const lastPoint = prev[prev.length - 1];
        const pnl = lastPoint ? totalValue - lastPoint.value : 0;
        const newPoint: HistoryPoint = {
          timestamp: Date.now(),
          value: totalValue,
          nativeValue: nativeValue,
          pnl: pnl,
          chainPnl: chainPnl
        };
        return [...prev.slice(-99), newPoint];
      });

    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  const addWallet = () => {
    const normalizedInput = newWalletAddress.trim();
    let checksummedAddress = '';

    try {
      checksummedAddress = getAddress(normalizedInput);
    } catch {
      setWalletFormError('Enter a valid EVM wallet address (0x...).');
      return;
    }
    
    // Prevent duplicate wallets
    if (wallets.some(w => w.address.toLowerCase() === checksummedAddress.toLowerCase())) {
      setWalletFormError('This wallet has already been added.');
      return;
    }

    const trimmedName = newWalletName.trim();
    const newWallet: Wallet = {
      address: checksummedAddress,
      name: trimmedName || `Wallet ${wallets.length + 1}`
    };
    setWallets([...wallets, newWallet]);
    setNewWalletAddress('');
    setNewWalletName('');
    setWalletFormError('');
    setIsAddingWallet(false);
  };

  const removeWallet = (address: string) => {
    setWallets(wallets.filter(w => w.address !== address));
  };

  const renameWallet = (address: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWallets(wallets.map(w => w.address === address ? { ...w, name: trimmed } : w));
    setEditingWalletAddress(null);
  };

  const scanForSpam = async () => {
    const baseAssets = wallets.length > 0 ? realAssets : [];
    const unpriced = baseAssets.filter(a => a.price === 0 && (a as any).address && (a as any).address !== 'native');
    if (unpriced.length === 0) { setScanResult(0); return; }
    setIsScanning(true);
    setScanResult(null);
    const newSpamIds: string[] = [...spamTokenIds];
    let detected = 0;

    // For Ethereum tokens use DeFi Llama (most comprehensive price coverage)
    const ethAssets = unpriced.filter(a => a.chain === 'ethereum');
    const otherAssets = unpriced.filter(a => a.chain !== 'ethereum');

    if (ethAssets.length > 0) {
      try {
        const keys = ethAssets.map(a => `ethereum:${(a as any).address.toLowerCase()}`);
        const r = await fetch(`https://coins.llama.fi/prices/current/${keys.join(',')}`);
        if (r.ok) {
          const data = await r.json();
          ethAssets.forEach(asset => {
            const key = `ethereum:${(asset as any).address.toLowerCase()}`;
            const hasPrice = data.coins?.[key]?.price != null;
            if (!hasPrice && !newSpamIds.includes(asset.id)) {
              newSpamIds.push(asset.id);
              detected++;
            }
          });
        }
      } catch { /* ignore */ }
    }

    // For PulseChain/Base tokens use Blockscout
    await Promise.allSettled(otherAssets.map(async (asset) => {
      try {
        const addr = (asset as any).address;
        const host = asset.chain === 'base' ? 'base.blockscout.com' : 'scan.pulsechain.com';
        const r = await fetch(`https://${host}/api/v2/tokens/${addr}`);
        if (!r.ok) return;
        const data = await r.json();
        const hasMarket = data.exchange_rate || data.circulating_market_cap || data.volume_24h;
        if (!hasMarket && !newSpamIds.includes(asset.id)) {
          newSpamIds.push(asset.id);
          detected++;
        }
      } catch { /* ignore */ }
    }));

    setSpamTokenIds(newSpamIds);
    setIsScanning(false);
    setScanResult(detected);
  };

  const currentAssets = useMemo(() => {
    const baseAssets = wallets.length > 0 ? realAssets : MOCK_ASSETS;
    const assetsWithCustom = [...baseAssets];
    
    customCoins.forEach(coin => {
      assetsWithCustom.push({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        balance: coin.balance,
        price: coin.price,
        value: coin.balance * coin.price,
        chain: 'custom' as any,
        pnl24h: 0
      });
    });

    return assetsWithCustom
      .filter(a => !hiddenTokens.includes(a.id))
      .filter(a => !hideDust || a.value >= 1 || (a.balance > 0 && a.price === 0))
      .filter(a => !hideSpam || (!(a as any).isSpam && !spamTokenIds.includes(a.id)))
      .map(a => ({
        ...a,
        entryPls: manualEntries[a.id] || 0
      }));
  }, [wallets.length, realAssets, manualEntries, hiddenTokens, hideDust, customCoins, hideSpam, spamTokenIds]);

  const currentStakes = wallets.length > 0 ? realStakes : MOCK_STAKES;
  const currentHistory = wallets.length > 0 ? history : MOCK_HISTORY;
  const currentTransactions = wallets.length > 0 ? transactions : MOCK_TRANSACTIONS;

  const unpricedCount = useMemo(() => {
    return currentAssets.filter(a => a.price === 0).length;
  }, [currentAssets]);

  const filteredTransactions = useMemo(() => {
    return currentTransactions.filter(tx => {
      const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
      const matchesAsset = txAssetFilter === 'all' || tx.asset === txAssetFilter;
      const matchesChain = txChainFilter === 'all' || tx.chain === txChainFilter;
      // Year filter
      const txYear = new Date(tx.timestamp).getFullYear().toString();
      const matchesYear = txYearFilter === 'all' || txYear === txYearFilter;
      // Coin category filter
      const au = tx.asset.toUpperCase();
      let matchesCoin = true;
      if (txCoinCategory === 'stablecoins') {
        matchesCoin = au.includes('USDC') || au.includes('USDT') || au.includes('DAI') ||
                      au.includes('TETHER') || au.includes('USD COIN') || au.includes('USDBC');
      } else if (txCoinCategory === 'eth_weth') {
        matchesCoin = au === 'ETH' || au === 'WETH';
      } else if (txCoinCategory === 'hex') {
        matchesCoin = au === 'HEX' || au === 'EHEX' || au.includes('HEX');
      } else if (txCoinCategory === 'pls_wpls') {
        matchesCoin = au === 'PLS' || au === 'WPLS';
      } else if (txCoinCategory === 'bridged') {
        matchesCoin = !!(tx as any).bridged;
      }
      return matchesType && matchesAsset && matchesChain && matchesYear && matchesCoin;
    });
  }, [currentTransactions, txTypeFilter, txAssetFilter, txChainFilter, txYearFilter, txCoinCategory]);

  const summary = useMemo(() => {
    const assets = currentAssets;
    const liquidValue = assets.reduce((acc, curr) => acc + curr.value, 0);

    // Add HEX staking value so the grand total reflects everything the user owns.
    // Recalculate accrued yield from tShares × daysStaked × chain-specific rate so
    // stale cached interestHearts never corrupt the total.
    const stakingValueUsd = currentStakes.reduce((acc, s) => {
      const hexPriceKey = `${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
      const chainHexFallback = s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd;
      const hexPrice = prices[hexPriceKey]?.usd || chainHexFallback || 0;
      const stakedHex  = Number(s.stakedHearts ?? 0n) / 1e8;
      const tShares    = Number(s.stakeShares  ?? 0n) / 1e12;
      const daysStaked = Math.max(0, (s.stakedDays ?? 0) - (s.daysRemaining ?? 0));
      const rate = s.chain === 'pulsechain' ? PHEX_YIELD_PER_TSHARE : EHEX_YIELD_PER_TSHARE;
      const interestHex = tShares * daysStaked * rate;
      return acc + (stakedHex + interestHex) * hexPrice;
    }, 0);

    const totalValue = liquidValue + stakingValueUsd;
    const totalPnl = assets.reduce((acc, curr) => acc + (curr.value * (curr.pnl24h || 0) / 100), 0);
    
    const distribution: Record<Chain, number> = { pulsechain: 0, ethereum: 0, base: 0 };
    const chainPnlUsd: Record<Chain, number> = { pulsechain: 0, ethereum: 0, base: 0 };
    const chainPnlPercent: Record<Chain, number> = { pulsechain: 0, ethereum: 0, base: 0 };
    
    assets.forEach(a => {
      if (a.chain in distribution) {
        distribution[a.chain] += a.value;
        chainPnlUsd[a.chain] += (a.value * (a.pnl24h || 0) / 100);
      }
    });

    Object.keys(chainPnlUsd).forEach(chain => {
      const c = chain as Chain;
      if (distribution[c] > 0) {
        chainPnlPercent[c] = (chainPnlUsd[c] / distribution[c]) * 100;
      }
    });

    // Native Value (Portfolio Value in PLS terms)
    const plsPrice = assets.find(a => a.symbol === 'PLS')?.price || 0.00005;
    const nativeValue = totalValue / plsPrice;

    const nativePlsBalance = assets.find(a => a.symbol === 'PLS' && a.chain === 'pulsechain')?.balance || 0;
    const stakedPlsValue = currentStakes.reduce((acc, curr) => acc + (curr.estimatedValueUsd / plsPrice), 0);
    const tokenPlsValue = nativeValue - nativePlsBalance - stakedPlsValue;

    // Net Investment = total stablecoin + ETH received from external addresses into own wallets
    // Matches what's shown in Received Assets History: only ETH and stables, from external sources
    const ownAddrs = new Set(wallets.map(w => w.address.toLowerCase()));
    const isStableAsset = (asset: string) => {
      const u = asset.toUpperCase();
      return u.includes('USDC') || u.includes('USD COIN') || u.includes('USDBC') ||
             u.includes('USDT') || u.includes('TETHER') ||
             u.includes('DAI');
    };
    // Normalise asset name to a canonical category for bridge-echo matching
    const assetCategory = (asset: string) => {
      const u = asset.toUpperCase();
      if (u.includes('USDC') || u.includes('USD COIN') || u.includes('USDBC')) return 'USDC';
      if (u.includes('USDT') || u.includes('TETHER')) return 'USDT';
      if (u.includes('DAI')) return 'DAI';
      if (u === 'ETH') return 'ETH';
      return u;
    };
    // Collect all qualifying inflows first
    const qualifiedInflows = currentTransactions.filter(tx => {
      if (tx.type !== 'deposit') return false;
      if (tx.chain === 'pulsechain') return false; // always exclude; already counted via ETH/Base
      const assetUpper = tx.asset.toUpperCase();
      const isEth = assetUpper === 'ETH';
      const isStable = isStableAsset(tx.asset);
      if (!isEth && !isStable) return false;
      const fromOwn = ownAddrs.has(tx.from.toLowerCase());
      const toOwn = ownAddrs.has(tx.to.toLowerCase());
      if (fromOwn || !toOwn) return false;
      return true;
    }).sort((a, b) => a.timestamp - b.timestamp); // oldest first

    // Use the live prices state as a fallback for ETH valueUsd — this handles the case where
    // transactions were fetched before CoinGecko prices loaded (valueUsd would be 0 at that point).
    // Also try the pWETH LP-derived price (stored under 'ethereum:native') so the fallback
    // works even when CoinGecko is rate-limited.
    const ethPriceFallback = prices['ethereum']?.usd
      || prices['ethereum:native']?.usd
      || prices['pulsechain:0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c']?.usd
      || 0;
    // Helper: derive a consistent USD value for a tx (handles stale-zero valueUsd for ETH)
    const txUsdValue = (tx: { asset: string; valueUsd: number; amount: number }) => {
      if (tx.valueUsd > 0) return tx.valueUsd;
      if (tx.asset.toUpperCase() === 'ETH') return tx.amount * ethPriceFallback;
      return tx.amount; // stablecoins: amount ≈ USD
    };

    // Bridge-echo deduplication:
    // If the same asset+amount (within 1%) is received on a different chain within 12h,
    // treat the later one as a bridge echo and exclude it from netInvestment.
    // 1% tolerance for matching bridge echo amounts across chains
    const BRIDGE_AMOUNT_TOLERANCE = 0.01;
    const BRIDGE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours
    const deduped = new Set<string>();
    qualifiedInflows.forEach((tx, i) => {
      if (deduped.has(tx.id)) return; // already marked as echo
      const cat = assetCategory(tx.asset);
      const usd = txUsdValue(tx);
      for (let j = i + 1; j < qualifiedInflows.length; j++) {
        const other = qualifiedInflows[j];
        if (deduped.has(other.id)) continue;
        if (other.chain === tx.chain) continue; // same chain: not a bridge
        if (other.timestamp - tx.timestamp > BRIDGE_WINDOW_MS) break; // time window exceeded
        const otherCat = assetCategory(other.asset);
        if (otherCat !== cat) continue;
        const otherUsd = txUsdValue(other);
        const maxVal = Math.max(usd, otherUsd, 1);
        if (Math.abs(usd - otherUsd) / maxVal <= BRIDGE_AMOUNT_TOLERANCE) {
          deduped.add(other.id); // mark later occurrence as bridge echo
        }
      }
    });

    const netInvestment = qualifiedInflows.reduce((acc, tx) => {
      if (deduped.has(tx.id)) return acc; // skip bridge echoes
      const assetUpper = tx.asset.toUpperCase();
      const isEth = assetUpper === 'ETH';
      if (isStableAsset(tx.asset)) return acc + tx.amount;
      if (isEth) return acc + txUsdValue(tx);
      return acc;
    }, 0);

    const unifiedPnl = totalValue - netInvestment;

    // Realized PNL Calculation with basic cost basis tracking
    const costBasisMap: Record<string, { amount: number, totalCost: number }> = {};
    let realizedPnl = 0;

    // Sort transactions by date to track cost basis chronologically
    const sortedTxs = [...currentTransactions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedTxs.forEach(tx => {
      const assetKey = `${tx.chain}:${tx.asset}`;
      
      if (tx.type === 'deposit' || (tx.type === 'swap' && tx.counterAsset)) {
        // Buying or receiving asset
        const amount = tx.amount;
        const value = tx.valueUsd || 0;
        
        if (!costBasisMap[assetKey]) {
          costBasisMap[assetKey] = { amount: 0, totalCost: 0 };
        }
        costBasisMap[assetKey].amount += amount;
        costBasisMap[assetKey].totalCost += value;
      } else if (tx.type === 'withdraw' || tx.type === 'swap') {
        // Selling or sending asset
        const amount = tx.amount;
        const value = tx.valueUsd || 0;
        
        if (costBasisMap[assetKey] && costBasisMap[assetKey].amount > 0) {
          const avgCost = costBasisMap[assetKey].totalCost / costBasisMap[assetKey].amount;
          const costOfSold = amount * avgCost;
          const profit = value - costOfSold;
          
          // Only count as realized PNL if it's a swap/trade (intentional exit)
          if (tx.type === 'swap' || tx.type === 'trade') {
            realizedPnl += profit;
          }
          
          // Update remaining cost basis
          costBasisMap[assetKey].amount -= amount;
          costBasisMap[assetKey].totalCost -= costOfSold;
        }
      }
    });

    return {
      totalValue,
      liquidValue,
      stakingValueUsd,
      pnl24h: totalPnl,
      pnl24hPercent: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0,
      chainDistribution: distribution,
      nativeValue,
      nativePlsBalance,
      stakedPlsValue,
      tokenPlsValue,
      netInvestment,
      unifiedPnl,
      realizedPnl,
      chainPnlUsd,
      chainPnlPercent
    };
  }, [currentAssets, currentStakes, currentTransactions, prices, wallets]);

  const pieData = Object.entries(summary.chainDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value as number
  })).filter(d => (d.value as number) > 0);

  const COLORS = [CHAINS.pulsechain.color, CHAINS.ethereum.color, CHAINS.base.color];

  const stakeSummary = useMemo(() => {
    const stakes = wallets.length > 0 ? realStakes : MOCK_STAKES;
    let totalStakedHex = 0;
    let totalTShares = 0;
    let totalValueUsd = 0;
    let totalInterestHex = 0;

    stakes.forEach(s => {
      const stakedHex  = Number(s.stakedHearts ?? 0n) / 1e8;
      const tShares    = Number(s.stakeShares  ?? 0n) / 1e12;
      // Recalculate accrued yield from first principles using chain-specific rate
      // so stale cached interestHearts never corrupt the totals.
      const daysStaked  = Math.max(0, (s.stakedDays ?? 0) - (s.daysRemaining ?? 0));
      const rate = s.chain === 'pulsechain' ? PHEX_YIELD_PER_TSHARE : EHEX_YIELD_PER_TSHARE;
      const interestHex = tShares * daysStaked * rate;

      // Use chain-specific HEX price; fall back to 0 (not 0.004) so we show
      // $0 instead of a wrong value while prices are still loading.
      const hexPriceKey = `${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
      const chainHexFallback = s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd;
      const hexPrice = prices[hexPriceKey]?.usd || chainHexFallback || 0;

      totalStakedHex  += stakedHex;
      totalTShares    += tShares;
      totalValueUsd   += (stakedHex + interestHex) * hexPrice;
      totalInterestHex += interestHex;
    });

    const phexPrice = prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0;
    // Daily payout uses chain-specific rates; sum pHEX and eHEX T-Share contributions separately
    const estimatedDailyPayoutHex = stakes.reduce((sum, s) => {
      const tS = Number(s.stakeShares ?? 0n) / 1e12;
      const rate = s.chain === 'pulsechain' ? PHEX_YIELD_PER_TSHARE : EHEX_YIELD_PER_TSHARE;
      return sum + tS * rate;
    }, 0);
    const estimatedDailyPayoutUsd = estimatedDailyPayoutHex * phexPrice;

    return {
      totalStakedHex,
      totalTShares,
      totalValueUsd,
      totalInterestHex,
      totalHexWithRewards: totalStakedHex + totalInterestHex,
      estimatedDailyPayoutHex,
      estimatedDailyPayoutUsd
    };
  }, [wallets.length, realStakes, prices]);

  const assetAllocation = useMemo(() => {
    // Aggregate by symbol across chains (e.g. ETH on Ethereum + ETH on Base)
    const agg: Record<string, number> = {};
    realAssets.filter(a => a.value > 0).forEach(a => {
      agg[a.symbol] = (agg[a.symbol] || 0) + a.value;
    });
    return Object.entries(agg)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [realAssets]);

  useEffect(() => {
    const total = assetAllocation.reduce((sum, a) => sum + a.value, 0);
    if (total <= 0) {
      setAllocationDraftPercentages({});
      return;
    }
    setAllocationDraftPercentages(prev => {
      const next: Record<string, number> = {};
      assetAllocation.forEach(a => {
        next[a.name] = prev[a.name] ?? ((a.value / total) * 100);
      });
      return next;
    });
  }, [assetAllocation]);

  const allocationCalculatorRows = useMemo(() => {
    const portfolioTotal = summary.totalValue || 0;
    return assetAllocation.map(a => {
      const pct = Math.min(100, Math.max(0, allocationDraftPercentages[a.name] ?? 0));
      return {
        name: a.name,
        percent: pct,
        value: (portfolioTotal * pct) / 100
      };
    });
  }, [assetAllocation, allocationDraftPercentages, summary.totalValue]);

  const rotationSummary = useMemo(() => {
    let totalRotationPnlPls = 0;
    let totalRotationPnlUsd = 0;
    const plsPrice = prices['pulsechain']?.usd || 0.00005;

    realAssets.forEach(asset => {
      const entryPls = manualEntries[asset.id];
      if (entryPls && entryPls > 0) {
        const currentPlsValue = asset.value / plsPrice;
        const pnlPls = currentPlsValue - entryPls;
        totalRotationPnlPls += pnlPls;
        totalRotationPnlUsd += pnlPls * plsPrice;
      }
    });

    return {
      totalRotationPnlPls,
      totalRotationPnlUsd
    };
  }, [realAssets, manualEntries, prices]);

  const monthlyPnlData = useMemo(() => {
    const pts = wallets.length > 0 ? history : MOCK_HISTORY;
    const byMonth: Record<string, { month: string; pnl: number }> = {};
    pts.forEach(p => {
      const key = format(p.timestamp, 'MMM yy');
      if (!byMonth[key]) byMonth[key] = { month: key, pnl: 0 };
      byMonth[key].pnl += p.pnl;
    });
    return Object.values(byMonth).slice(-12);
  }, [wallets.length, history]);

  const receivedAssetsData = useMemo(() => {
    const START_2021 = new Date('2021-01-01').getTime();
    const ethPrice = prices['ethereum']?.usd || 3400;

    const filtered = currentTransactions.filter(tx => {
      const typeMatch = tx.type === 'deposit' || (tx.type as string) === 'receive';
      const chainMatch = receivedChainFilter === 'all'
        ? (tx.chain === 'ethereum' || tx.chain === 'base' || tx.chain === 'pulsechain')
        : tx.chain === receivedChainFilter;
      const dateMatch = tx.timestamp >= START_2021;
      const assetUpper = tx.asset.toUpperCase();
      const assetMatch = assetUpper === 'ETH' ||
                         assetUpper === 'PLS' ||
                         assetUpper.includes('USDC') ||
                         assetUpper.includes('USD COIN') ||
                         assetUpper.includes('USDBC') ||
                         assetUpper.includes('USDT') ||
                         assetUpper.includes('TETHER') ||
                         assetUpper.includes('DAI');
      // Exclude dust (gas refunds, tiny transfers)
      const notDust = tx.valueUsd ? tx.valueUsd >= 1 : (tx.amount > 0.0001 || (assetUpper !== 'ETH' && assetUpper !== 'PLS' && tx.amount > 0.01));
      return typeMatch && chainMatch && dateMatch && assetMatch && notDust;
    });

    // Apply coin filter
    const coinFiltered = receivedCoinFilter === 'all' ? filtered : filtered.filter(tx => {
      const assetUpper = tx.asset.toUpperCase();
      if (receivedCoinFilter === 'ETH') return assetUpper === 'ETH';
      if (receivedCoinFilter === 'PLS') return assetUpper === 'PLS';
      if (receivedCoinFilter === 'USDC') return assetUpper.includes('USDC') || assetUpper.includes('USD COIN') || assetUpper.includes('USDBC');
      if (receivedCoinFilter === 'USDT') return assetUpper.includes('USDT') || assetUpper.includes('TETHER');
      if (receivedCoinFilter === 'DAI') return assetUpper.includes('DAI');
      return true;
    });

    // Sort oldest first — shows the full history chronologically
    const list = [...coinFiltered].sort((a, b) => a.timestamp - b.timestamp);

    // Per-asset totals
    const plsPrice = prices['pulsechain']?.usd || 0.00005;
    const usdcPrice = prices['usd-coin']?.usd || 1;
    const usdtPrice = prices['tether']?.usd || 1;
    const daiPrice  = prices['dai']?.usd || 1;

    const getUsd = (tx: typeof list[0]) => {
      if (tx.valueUsd) return tx.valueUsd;
      const a = tx.asset.toUpperCase();
      if (a === 'ETH') return tx.amount * ethPrice;
      if (a === 'PLS') return tx.amount * plsPrice;
      if (a.includes('USDT') || a.includes('TETHER')) return tx.amount * usdtPrice;
      if (a.includes('DAI')) return tx.amount * daiPrice;
      return tx.amount * usdcPrice; // USDC and other stables
    };

    const byAsset: Record<string, { amount: number; valueUsd: number }> = {};
    list.forEach(tx => {
      const assetUpper = tx.asset.toUpperCase();
      const key = assetUpper === 'PLS' ? 'PLS' :
                  assetUpper === 'ETH' ? 'ETH' :
                  assetUpper.includes('DAI') ? 'DAI' :
                  assetUpper.includes('USDT') || assetUpper.includes('TETHER') ? 'USDT' : 'USDC';
      if (!byAsset[key]) byAsset[key] = { amount: 0, valueUsd: 0 };
      byAsset[key].amount += tx.amount;
      byAsset[key].valueUsd += getUsd(tx);
    });

    const totalValue = list.reduce((acc, tx) => acc + getUsd(tx), 0);

    return { list, totalValue, byAsset };
  }, [currentTransactions, prices, receivedCoinFilter, receivedChainFilter]);

  // PLS/WPLS Movement Tracker — includes all PLS/WPLS transfers (in/out) and swaps on PulseChain
  // This works even when PulseChain transactions are typed as 'transfer_in'/'transfer_out'
  // because Blockscout does not tag on-chain swaps as type='swap'.
  const plsSwapData = useMemo(() => {
    const isPls = (sym: string) => {
      const u = (sym || '').toUpperCase();
      return u === 'PLS' || u === 'WPLS';
    };
    const plsPrice = prices['pulsechain']?.usd || 0;

    const rows = currentTransactions
      .filter(tx => {
        // Include swaps where PLS is on either leg
        if (tx.type === 'swap' && (isPls(tx.asset) || isPls(tx.counterAsset || ''))) return true;
        // Include all PLS/WPLS native transfers on PulseChain (since Blockscout doesn't tag swaps)
        if (tx.chain === 'pulsechain' && isPls(tx.asset) && (tx.type === 'deposit' || tx.type === 'withdraw')) return true;
        return false;
      })
      .map(tx => {
        let plsReceived = 0;
        let plsSpent = 0;
        if (tx.type === 'swap') {
          plsReceived = isPls(tx.asset) ? tx.amount : 0;
          plsSpent = isPls(tx.counterAsset || '') ? (tx.counterAmount || 0) : 0;
        } else if (tx.type === 'deposit') {
          plsReceived = tx.amount;
        } else if (tx.type === 'withdraw') {
          plsSpent = tx.amount;
        }
        const netPls = plsReceived - plsSpent;
        return { tx, plsReceived, plsSpent, netPls };
      })
      .sort((a, b) => b.tx.timestamp - a.tx.timestamp);

    const totalReceived = rows.reduce((s, r) => s + r.plsReceived, 0);
    const totalSpent = rows.reduce((s, r) => s + r.plsSpent, 0);
    const totalNet = totalReceived - totalSpent;
    const netUsd = totalNet * plsPrice;
    return { rows, totalReceived, totalSpent, totalNet, netUsd, plsPrice };
  }, [currentTransactions, prices]);

  useEffect(() => {
    const fetchMarketData = async () => {
      for (const id of expandedAssetIds) {
        if (tokenMarketData[id]) continue;
        const asset = currentAssets.find(a => a.id === id);
        if (!asset) continue;
        const addr = (asset as any).address;
        if (!addr || addr === 'native') continue;
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
          if (!res.ok) continue;
          const data = await res.json();
          const pairs = data.pairs || [];
          if (pairs.length === 0) continue;
          const sorted = [...pairs].sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const top = sorted[0];
          setTokenMarketData(prev => ({
            ...prev,
            [id]: {
              liquidity:      sorted.reduce((s: number, p: any) => s + (p.liquidity?.usd || 0), 0),
              volume24h:      sorted.reduce((s: number, p: any) => s + (p.volume?.h24  || 0), 0),
              marketCap:      top?.marketCap || null,
              fdv:            top?.fdv || null,
              pools:          pairs.length,
              txns24h:        sorted.reduce((s: number, p: any) => s + (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0), 0),
              nativePriceUsd: top?.priceNative || null,
              priceChange1h:  top?.priceChange?.h1  ?? null,
              priceChange6h:  top?.priceChange?.h6  ?? null,
              priceChange24h: top?.priceChange?.h24 ?? null,
              priceChange7d:  top?.priceChange?.d7  ?? null,
              description:    top?.info?.description || FALLBACK_DESCRIPTIONS[addr ? addr.toLowerCase() : ''] || null,
              websites:       top?.info?.websites    || [],
              socials:        top?.info?.socials     || [],
            }
          }));
          // Also cache the DexScreener image into tokenLogos so overview cards pick it up
          const dsImg = top?.info?.imageUrl;
          if (dsImg && !STATIC_LOGOS[addr.toLowerCase()]) setTokenLogos(prev => ({ ...prev, [addr.toLowerCase()]: dsImg }));
        } catch { /* ignore */ }
      }
    };
    fetchMarketData();
  }, [expandedAssetIds]); // intentionally omits tokenMarketData (cache check) and currentAssets (stable ref) to avoid re-fetching on unrelated renders

  // ── Fetch market data when token card modal opens ────────────────────────
  // For native PLS, use the WPLS contract address since DexScreener tracks WPLS pairs.
  const WPLS_ADDR = '0xa1077a294dde1b09bb078844df40758a5d0f9a27';
  useEffect(() => {
    if (!tokenCardModal) return;
    const id   = tokenCardModal.id;
    const rawAddr = (tokenCardModal as any).address as string | undefined;
    // PLS is native — fall back to WPLS so we can show DexScreener market data
    const isNativePls = (!rawAddr || rawAddr === 'native') && tokenCardModal.chain === 'pulsechain';
    const addr = isNativePls ? WPLS_ADDR : rawAddr;
    if (!addr || addr === 'native') return;
    if (tokenMarketData[id]) { setTokenCardModalLoading(false); return; }
    setTokenCardModalLoading(true);
    (async () => {
      try {
        const isElectron = /electron/i.test(navigator.userAgent);
        const bsBase = isElectron ? 'https://api.scan.pulsechain.com/api/v2' : '/proxy/pulsechain/api/v2';
        const [dsResult, holderResult] = await Promise.allSettled([
          fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`).then(r => r.ok ? r.json() : null),
          tokenCardModal?.chain === 'pulsechain' && !isNativePls
            ? fetch(`${bsBase}/tokens/${addr}`).then(r => r.ok ? r.json() : null)
            : Promise.resolve(null),
        ]);
        const data = dsResult.status === 'fulfilled' ? dsResult.value : null;
        const holderData = holderResult.status === 'fulfilled' ? holderResult.value : null;
        const holders: number | null = holderData?.holders ? (parseInt(String(holderData.holders), 10) || null) : null;
        if (!data) return;
        const pairs = data.pairs || [];
        if (pairs.length === 0) return;
        const sorted = [...pairs].sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const top = sorted[0];
        setTokenMarketData(prev => ({
          ...prev,
          [id]: {
            liquidity:      sorted.reduce((s: number, p: any) => s + (p.liquidity?.usd || 0), 0),
            volume24h:      sorted.reduce((s: number, p: any) => s + (p.volume?.h24 || 0), 0),
            marketCap:      top?.marketCap || null,
            fdv:            top?.fdv || null,
            pools:          pairs.length,
            txns24h:        sorted.reduce((s: number, p: any) => s + (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0), 0),
            nativePriceUsd: top?.priceNative || null,
            priceChange1h:  top?.priceChange?.h1  ?? null,
            priceChange6h:  top?.priceChange?.h6  ?? null,
            priceChange24h: top?.priceChange?.h24 ?? null,
            priceChange7d:  top?.priceChange?.d7  ?? null,
            description:    top?.info?.description || FALLBACK_DESCRIPTIONS[addr ? addr.toLowerCase() : ''] || null,
            websites:       top?.info?.websites    || [],
            socials:        top?.info?.socials     || [],
            ...(holders != null ? { holders } : {}),
          },
        }));
        // Cache DexScreener image into tokenLogos (helps overview cards)
        const dsImg = top?.info?.imageUrl;
        if (dsImg && !isNativePls && !STATIC_LOGOS[addr.toLowerCase()]) setTokenLogos(prev => ({ ...prev, [addr.toLowerCase()]: dsImg }));
      } catch { /* ignore */ }
      finally { setTokenCardModalLoading(false); }
    })();
  }, [tokenCardModal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fetch market data for top 9 overview assets when Overview tab is active ──
  // This ensures all cards show live market data (mcap, liquidity, vol) without requiring
  // the user to click each card individually.
  useEffect(() => {
    if (activeTab !== 'overview' || currentAssets.length === 0) return;
    const topAssets = [...currentAssets].sort((a, b) => b.value - a.value).slice(0, 9);
    const toFetch = topAssets.filter(a => {
      const addr = (a as any).address;
      return addr && addr !== 'native' && !tokenMarketData[a.id];
    });
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map(async (asset) => {
      const addr = (asset as any).address as string;
      const isElectron = /electron/i.test(navigator.userAgent);
      const bsBase = isElectron ? 'https://api.scan.pulsechain.com/api/v2' : '/proxy/pulsechain/api/v2';
      try {
        // Fetch DexScreener data + Blockscout holder count in parallel
        const [dsResult, holderResult] = await Promise.allSettled([
          fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`).then(r => r.ok ? r.json() : null),
          asset.chain === 'pulsechain'
            ? fetch(`${bsBase}/tokens/${addr}`).then(r => r.ok ? r.json() : null)
            : Promise.resolve(null),
        ]);
        const data = dsResult.status === 'fulfilled' ? dsResult.value : null;
        const holderData = holderResult.status === 'fulfilled' ? holderResult.value : null;
        const holders: number | null = holderData?.holders ? (parseInt(String(holderData.holders), 10) || null) : null;
        if (!data) return;
        const pairs: any[] = data.pairs || [];
        if (pairs.length === 0) return;
        const sorted = [...pairs].sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const top = sorted[0];
        setTokenMarketData(prev => ({
          ...prev,
          [asset.id]: {
            ...prev[asset.id],
            liquidity:      sorted.reduce((s: number, p: any) => s + (p.liquidity?.usd || 0), 0),
            volume24h:      sorted.reduce((s: number, p: any) => s + (p.volume?.h24  || 0), 0),
            marketCap:      top?.marketCap || null,
            fdv:            top?.fdv || null,
            pools:          pairs.length,
            txns24h:        sorted.reduce((s: number, p: any) => s + (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0), 0),
            nativePriceUsd: top?.priceNative || null,
            priceChange1h:  top?.priceChange?.h1  ?? null,
            priceChange6h:  top?.priceChange?.h6  ?? null,
            priceChange24h: top?.priceChange?.h24 ?? null,
            priceChange7d:  top?.priceChange?.d7  ?? null,
            description:    top?.info?.description || FALLBACK_DESCRIPTIONS[addr ? addr.toLowerCase() : ''] || null,
            websites:       top?.info?.websites    || [],
            socials:        top?.info?.socials     || [],
            ...(holders != null ? { holders } : {}),
          },
        }));
        // Cache DexScreener image into tokenLogos — but never overwrite STATIC_LOGOS entries
        const dsImg = top?.info?.imageUrl;
        if (dsImg && !STATIC_LOGOS[addr.toLowerCase()]) setTokenLogos(prev => ({ ...prev, [addr.toLowerCase()]: dsImg }));
      } catch { /* ignore */ }
    }));
  }, [activeTab, currentAssets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── tokenPrices: symbol → USD price map for LP hook ─────────────────────
  const tokenPrices = useMemo<Record<string, number>>(() => {
    const p = prices;
    const wplsUsd = p['pulsechain']?.usd ?? p['pulsechain:native']?.usd ?? 0;
    return {
      'WPLS':  wplsUsd,
      'PLS':   wplsUsd,
      'PLSX':  p['pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab']?.usd ?? p['pulsex']?.usd ?? 0,
      'INC':   p['pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d']?.usd ?? p['incentive']?.usd ?? 0,
      'pHEX':  p['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd ?? p['pulsechain:hex']?.usd ?? 0,
      'pWETH': p['pulsechain:0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c']?.usd ?? p['ethereum']?.usd ?? 0,
      'pWBTC': p['pulsechain:0xb17d901469b9208b17d916112988a3fed19b5ca1']?.usd ?? p['wrapped-bitcoin']?.usd ?? 0,
      'pDAI':  p['pulsechain:0xefd766ccb38eaf1dfd701853bfce31359239f305']?.usd ?? 0,
      'pUSDC': p['pulsechain:0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07']?.usd ?? 0,
      'pUSDT': p['pulsechain:0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f']?.usd ?? 0,
    };
  }, [prices]);

  const CHAIN_COLORS: Record<string, string> = {
    pulsechain: '#f739ff',
    ethereum: '#627EEA',
    base: '#0052FF',
  };

  const explorerUrl = (chain: string, address: string) => {
    if (!address || address === 'native') return null;
    if (chain === 'pulsechain') return `https://scan.pulsechain.com/token/${address}`;
    if (chain === 'ethereum') return `https://etherscan.io/token/${address}`;
    if (chain === 'base') return `https://base.blockscout.com/token/${address}`;
    return null;
  };

  const dexScreenerUrl = (chain: string, address: string) => {
    if (!address || address === 'native') return null;
    const slug = chain === 'pulsechain' ? 'pulsechain' : chain === 'base' ? 'base' : 'ethereum';
    return `https://dexscreener.com/${slug}/${address}`;
  };

  const getTokenLogoUrl = (asset: Asset): string => {
    // 0. STATIC_LOGOS always wins — curated logos that must never be overwritten by any remote source
    const addrKey0 = (asset as any).address?.toLowerCase?.() as string | undefined;
    if (addrKey0 && STATIC_LOGOS[addrKey0]) return STATIC_LOGOS[addrKey0];
    // 1. Use any logo already fetched and stored on the asset (CoinGecko / DeFi Llama)
    if (asset.logoUrl) return asset.logoUrl;
    // 2. Well-known native / base tokens
    if (asset.symbol === 'ETH') return 'https://assets.coingecko.com/coins/images/279/small/ethereum.png';
    if (asset.symbol === 'PLS' || asset.symbol === 'WPLS') return 'https://tokens.app.pulsex.com/images/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27.png';
    // 3. PulseChain tokens via PulseX CDN (URL path is case-sensitive — must use checksummed address)
    if (asset.chain === 'pulsechain') {
      const tokenConfig = TOKENS.pulsechain.find(t => t.symbol === asset.symbol);
      if (tokenConfig && tokenConfig.address !== 'native') {
        try { return `https://tokens.app.pulsex.com/images/tokens/${getAddress(tokenConfig.address)}.png`; } catch { /* invalid address */ }
      }
      // Also try the address stored directly on the asset (for discovered tokens)
      const addrOnAsset = (asset as any).address;
      if (addrOnAsset && addrOnAsset !== 'native') {
        try { return `https://tokens.app.pulsex.com/images/tokens/${getAddress(addrOnAsset)}.png`; } catch { /* invalid address */ }
      }
    }
    // 4. Ethereum + Base tokens via TrustWallet (also case-sensitive)
    if (asset.chain === 'ethereum' || asset.chain === 'base') {
      const chainName = asset.chain === 'base' ? 'base' : 'ethereum';
      const tokenConfig = (TOKENS[asset.chain] as any[]).find((t: any) => t.symbol === asset.symbol);
      if (tokenConfig && tokenConfig.address !== 'native') {
        try { return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${getAddress(tokenConfig.address)}/logo.png`; } catch { /* invalid address */ }
      }
    }
    // 5. Fall back to tokenLogos map (covers DexScreener CDN images cached during market-data fetch)
    if (addrKey0 && tokenLogos[addrKey0]) return tokenLogos[addrKey0];
    return '';
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Shared compact price formatter — used by both the header ticker and core-coins panel
  const fmtPrice = (p: number) => {
    if (p === 0) return '—';
    if (p < 0.00001) return `$${p.toFixed(10)}`;
    if (p < 0.001)   return `$${p.toFixed(8)}`;
    if (p < 0.01)    return `$${p.toFixed(6)}`;
    if (p < 1)       return `$${p.toFixed(4)}`;
    return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  type PortfolioPriceCard = {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number | null;
    marketCap?: number | null;
    volume24h?: number | null;
    accent?: string;
    logo?: string;
  };

  const coreLiveTokens = useMemo(() => ([
    { id: 'PLS',  symbol: 'PLS',  name: 'PulseChain',    priceKey: 'pulsechain',                                                    changeKey: 'pulsechain:native', accent: 'linear-gradient(90deg,#00ff9f,#00cfff)',                                              logo: 'https://tokens.app.pulsex.com/images/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27.png' },
    { id: 'PLSX', symbol: 'PLSX', name: 'PulseX',        priceKey: 'pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab',            accent: 'linear-gradient(90deg,#ff00bf,#7b00ff)',                                              logo: 'https://tokens.app.pulsex.com/images/tokens/0x95B303987A60C71504D99Aa1b13B4DA07b0790ab.png' },
    { id: 'INC',  symbol: 'INC',  name: 'Incentive',     priceKey: 'pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',            accent: 'linear-gradient(90deg,#39ff14,#00ff9f)',                                              logo: 'https://tokens.app.pulsex.com/images/tokens/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png' },
    { id: 'HEX',  symbol: 'HEX',  name: 'pHEX',          priceKey: 'pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',            accent: 'linear-gradient(90deg,#ff6b35,#f7931a)',                                              logo: 'https://tokens.app.pulsex.com/images/tokens/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39.png' },
    { id: 'PRVX', symbol: 'PRVX', name: 'PrivacyX',      priceKey: 'pulsechain:0xf6f8db0aba00007681f8faf16a0fda1c9b030b11',            accent: 'linear-gradient(90deg,#6c3ce1,#b044ff)',                                              logo: 'https://cdn.dexscreener.com/cms/images/ODHYYN7yppDHnd6u?width=64&height=64&fit=crop&quality=95&format=auto' },
    { id: 'eHEX', symbol: 'eHEX', name: 'Ethereum HEX',  priceKey: 'ethereum:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',              accent: 'linear-gradient(90deg,#ff0080,#ff6b35,#ffeb3b,#00ff9f,#00cfff,#7b00ff)',             logo: 'https://cdn.dexscreener.com/cms/images/a46bd12940d8501c2aacdd10ad4780e818bdedaba1ec8eb46b52e4d8313d4a93?width=64&height=64&fit=crop&quality=95&format=auto' },
  ]), []);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    const missing = coreLiveTokens.filter(token => !tokenMarketData[`live:${token.id}`]);
    if (missing.length === 0) return;
    const WPLS = '0xa1077a294dde1b09bb078844df40758a5d0f9a27';
    missing.forEach(async (token) => {
      const rawAddr = token.priceKey === 'pulsechain' ? WPLS : token.priceKey.includes(':') ? token.priceKey.split(':')[1] : null;
      if (!rawAddr) return;
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${rawAddr.toLowerCase()}`);
        if (!res.ok) return;
        const data = await res.json();
        const pairs: any[] = data.pairs || [];
        if (pairs.length === 0) return;
        const expectedChain = token.priceKey.includes(':') ? token.priceKey.split(':')[0] : 'pulsechain';
        const chainPairs = pairs.filter((p: any) => p.chainId === expectedChain);
        const sorted = [...(chainPairs.length ? chainPairs : pairs)].sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const top = sorted[0];
        setTokenMarketData(prev => ({
          ...prev,
          [`live:${token.id}`]: {
            volume24h: sorted.reduce((s: number, p: any) => s + (p.volume?.h24 || 0), 0),
            marketCap: top?.marketCap || null,
            fdv: top?.fdv || null,
            priceChange24h: top?.priceChange?.h24 ?? null,
          },
        }));
      } catch { /* ignore */ }
    });
  }, [activeTab, coreLiveTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  const topHoldingCards = useMemo<PortfolioPriceCard[]>(() => {
    return coreLiveTokens.map(token => {
      const md = prices[token.priceKey] || prices[token.changeKey ?? ''];
      const tokenAddress = token.priceKey.includes(':') ? token.priceKey.split(':')[1]?.toLowerCase() : '';
      const heldAsset = currentAssets.find(asset =>
        (tokenAddress && (asset as any).address?.toLowerCase?.() === tokenAddress) ||
        asset.symbol.toUpperCase() === token.symbol.toUpperCase()
      );
      const liveMarketData = tokenMarketData[`live:${token.id}`] || (heldAsset ? tokenMarketData[heldAsset.id] : null);
      return {
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        price: md?.usd || heldAsset?.price || 0,
        change24h: liveMarketData?.priceChange24h ?? md?.usd_24h_change ?? heldAsset?.priceChange24h ?? null,
        marketCap: liveMarketData?.marketCap ?? liveMarketData?.fdv ?? null,
        volume24h: liveMarketData?.volume24h ?? null,
        accent: token.accent,
        logo: token.logo,
      };
    });
  }, [coreLiveTokens, currentAssets, prices, tokenMarketData]);

  return (
    <div className="min-h-screen font-sans flex" style={{ fontSize: 14, background: 'var(--bg-void)', color: 'var(--fg)' }}>
      {/* ── SIDEBAR BACKDROP (mobile) ── */}
      <div className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      {/* ── SIDEBAR ── */}
      <aside style={{
          width: 220, minWidth: 220,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
        }}
        className={`app-sidebar flex flex-col sticky top-0 h-screen overflow-y-auto custom-scrollbar${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }} className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30,
            background: 'var(--accent)',
            borderRadius: 9,
            boxShadow: '0 0 0 1px rgba(0,255,159,.35), 0 0 16px rgba(0,255,159,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Activity size={16} style={{ color: '#000' }} />
          </div>
          <span className="logo-wordmark">PULSEPORT</span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px' }} className="flex flex-col gap-0.5">
          {([
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'assets',   label: 'Holdings',           icon: Coins },
            { id: 'stakes',   label: 'HEX Stakes',         icon: Lock },
            { id: 'defi',     label: 'DeFi Positions',     icon: Droplets },
            { id: 'history',  label: 'Bridge Activity', icon: History },
            { id: 'wallets',  label: 'Wallets',  icon: WalletIcon },
          ] as const).map(({ id, label, icon: Icon }) => {
            const isDefi = id === 'defi';
            const isActive = activeTab === id;
            const defiColor = 'rgba(247,57,255,0.9)';
            const defiDim   = 'rgba(247,57,255,0.10)';
            const defiLine  = '#f739ff';
            return (
              <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                className={isActive ? 'nav-item-active' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8,
                  background: isActive ? (isDefi ? defiDim : 'var(--accent-dim)') : 'transparent',
                  color: isActive ? (isDefi ? defiColor : 'var(--accent)') : 'var(--fg-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13, border: 'none', cursor: 'pointer',
                  transition: 'all .15s', width: '100%', textAlign: 'left',
                  borderLeft: isActive ? `2px solid ${isDefi ? defiLine : 'var(--accent)'}` : '2px solid transparent',
                }}
                onMouseOver={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; } }}
                onMouseOut={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; } }}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Wallets section */}
        <div style={{ padding: '8px 8px 0', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <button
            onClick={() => setSidebarWalletsOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: 'transparent', color: 'var(--fg-muted)',
              fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WalletIcon size={16} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Wallets</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 7px', borderRadius: 100, border: '1px solid var(--accent-border)' }}>{wallets.length}</span>
              {sidebarWalletsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>
          {sidebarWalletsOpen && (
            <div style={{ paddingBottom: 8 }}>
              <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 180, padding: '2px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {wallets.map((w, wIdx) => {
                  const dotColors = ['#00FF9F','#f739ff','#627EEA','#f97316','#a855f7','#f59e0b'];
                  const isActive = selectedWalletAddr === w.address.toLowerCase() && activeTab === 'wallets';
                  return (
                    <div key={w.address}
                      onClick={() => { setSelectedWalletAddr(w.address.toLowerCase()); setActiveTab('wallets'); }}
                      style={{
                        padding: '7px 10px', borderRadius: 8,
                        background: isActive ? 'var(--accent-dim)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--accent-border)' : 'transparent'}`,
                        cursor: 'pointer', transition: 'all .12s',
                      }}
                      className="group flex items-center justify-between"
                      onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                      onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColors[wIdx % dotColors.length], flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                          <code style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{w.address.slice(0,6)}…{w.address.slice(-4)}</code>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setEditingWalletAddress(w.address); setEditWalletName(w.name); }}
                          style={{ color: 'var(--fg-muted)', padding: 3, cursor: 'pointer', border: 'none', background: 'none', borderRadius: 4 }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
                          <Pencil size={10} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeWallet(w.address); }}
                          style={{ color: 'var(--fg-muted)', padding: 3, cursor: 'pointer', border: 'none', background: 'none', borderRadius: 4 }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--negative)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {wallets.length === 0 && (
                  <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No wallets added yet</div>
                )}
              </div>
              <div style={{ padding: '4px 2px 8px' }}>
                <button onClick={() => setIsAddingWallet(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700, fontSize: 12,
                    border: '1px solid var(--accent-border)', borderRadius: 8, padding: '8px 0', cursor: 'pointer',
                    transition: 'all .15s', width: '100%',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,159,.18)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)'; }}>
                  <Plus size={13} /> Add Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="app-main flex-1 min-w-0 flex flex-col">
        {/* Top Nav / Header */}
        <header
          className="glass flex items-center justify-between gap-4 shrink-0"
          style={{
            height: 56, background: 'var(--bg-header)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, zIndex: 50,
            padding: '0 20px',
          }}>
          {/* Mobile logo + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(v => !v)}>
              <Menu size={18} />
            </button>
            <div style={{
              width: 26, height: 26, background: 'var(--accent)', borderRadius: 7,
              boxShadow: '0 0 12px rgba(0,255,159,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={14} style={{ color: '#000' }} />
            </div>
            <span className="logo-wordmark" style={{ fontSize: 14 }}>PULSEPORT</span>
          </div>

          {/* Price ticker — desktop only */}
          {Object.keys(prices).length > 0 && (
            <div className="ticker-wrapper hidden sm:flex flex-1 mx-4" style={{ height: 56, alignItems: 'center', overflow: 'hidden' }}>
              <div className="ticker-track" style={{ gap: 0 }}>
                {([
                  { sym: 'PLS',  dot: '#00FF9F', price: prices['pulsechain']?.usd || 0, change: prices['pulsechain']?.usd_24h_change ?? prices['pulsechain:native']?.usd_24h_change },
                  { sym: 'PLSX', dot: '#f739ff', price: prices['pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab']?.usd || prices['pulsex']?.usd || 0, change: prices['pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab']?.usd_24h_change ?? prices['pulsex']?.usd_24h_change },
                  { sym: 'pHEX', dot: '#fb923c', price: prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || 0, change: prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd_24h_change ?? prices['hex']?.usd_24h_change },
                  { sym: 'INC',  dot: '#22d3ee', price: prices['pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d']?.usd || prices['incentive']?.usd || 0, change: prices['pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d']?.usd_24h_change ?? prices['incentive']?.usd_24h_change },
                  { sym: 'PRVX', dot: '#a855f7', price: prices['pulsechain:0xf6f8db0aba00007681f8faf16a0fda1c9b030b11']?.usd || 0, change: prices['pulsechain:0xf6f8db0aba00007681f8faf16a0fda1c9b030b11']?.usd_24h_change },
                  { sym: 'eHEX', dot: '#627EEA', price: prices['hex']?.usd || 0, change: prices['hex']?.usd_24h_change },
                  { sym: 'ETH',  dot: '#627EEA', price: prices['ethereum']?.usd || 0, change: prices['ethereum']?.usd_24h_change },
                ] as { sym: string; dot: string; price: number; change?: number | null }[]).flatMap(c => [c, { ...c }]).map((coin, i) => (
                  <React.Fragment key={i}>
                    <div className="ticker-item">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: coin.dot, flexShrink: 0, boxShadow: `0 0 8px ${coin.dot}dd, 0 0 3px ${coin.dot}` }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{coin.sym}</span>
                      <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>{fmtPrice(coin.price)}</span>
                      {coin.change != null && (
                        <span className={coin.change >= 0 ? 'ticker-pct-pos' : 'ticker-pct-neg'}>
                          {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="ticker-sep" />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2">
              <div className={`status-dot ${lastUpdated ? 'status-dot-live' : ''}`} />
              {lastUpdated && (
                <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {timeSinceLastUpdate}s ago
                </span>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* API Key */}
            <button onClick={() => { setApiKeyInput(etherscanApiKey); setBasescanApiKeyInput(basescanApiKey); setIsApiKeyModalOpen(true); }}
              title={etherscanApiKey ? 'API key set ✓' : 'Set Etherscan API key'}
              className="header-action-btn"
              style={etherscanApiKey ? {
                background: 'var(--accent-dim)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              } : {}}>
              {etherscanApiKey ? <Check size={12} /> : <Settings size={12} />}
              <span className="hidden sm:inline">{etherscanApiKey ? 'API ✓' : 'API Key'}</span>
            </button>

            {/* Refresh */}
            <button onClick={fetchPortfolio}
              className={`header-action-btn${isLoading ? ' btn-loading' : ''}`}
              style={{ color: 'var(--fg)' }}>
              <RefreshCcw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ── Wallet Selector Bar (sticky sub-header, all tabs) ── */}
        {wallets.length > 0 && (
          <div className="wallet-selector-subheader">
            <WalletSelector
              wallets={wallets.map(w => w.address)}
              activeWallet={activeWallet}
              onSelect={setActiveWallet}
              onAdd={() => setIsAddingWallet(true)}
              walletLabels={Object.fromEntries(wallets.filter(w => w.name).map(w => [w.address, w.name!]))}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <div style={{ maxWidth: 1400, margin: '0 auto' }} className="space-y-5 px-3 py-4 sm:px-5 sm:py-6">

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* ── ONBOARDING ── */}
                {wallets.length === 0 && (
                  <div className={theme === 'dark' ? 'hero-bg-dark' : 'hero-bg-light'} style={{ border: '1px solid rgba(0,255,159,0.12)', borderRadius: 20, padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,159,.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(99,70,255,.06) 0%, transparent 50%)', pointerEvents: 'none' }} />
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,255,159,0.1)', border: '1px solid rgba(0,255,159,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 24px rgba(0,255,159,0.12)' }}>
                      <WalletIcon size={24} color="#00FF9F" />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', marginBottom: 8, letterSpacing: '-0.02em' }}>Welcome to PulsePort</div>
                    <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                      Track your PulseChain, Ethereum, and Base portfolios in real time. Add your first wallet to get started.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
                      {[
                        { step: '1', label: 'Add wallet address', Icon: KeyRound },
                        { step: '2', label: 'Sync your balances', Icon: Zap },
                        { step: '3', label: 'View your portfolio', Icon: BarChart2 },
                      ].map(({ step, label, Icon }) => (
                        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <div className="onboarding-step-icon"><Icon size={20} /></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Step {step}</div>
                          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setIsAddingWallet(true)}
                      className="btn-primary"
                      style={{ padding: '14px 36px', fontSize: 15 }}>
                      Add Your First Wallet →
                    </button>
                  </div>
                )}

                {/* ── HERO CARD (full width) with Allocation inside + STAT ROW ── */}
                {(() => {
                   return (
                     <>
                     <div className={theme === 'dark' ? 'hero-bg-dark' : 'hero-bg-light'} style={{
                       border: `1px solid rgba(0,255,159,0.12)`, borderRadius: 20, padding: '28px 28px', position: 'relative', overflow: 'hidden',
                       boxShadow: '0 0 0 1px rgba(0,255,159,0.04), 0 8px 40px rgba(0,0,0,0.5)'
                     }}>
                       {/* Top edge glow */}
                       <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,255,159,0.4), transparent)', pointerEvents: 'none' }} />
                       <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                         background: 'radial-gradient(ellipse at 5% 60%, rgba(0,255,159,.07) 0%, transparent 45%), radial-gradient(ellipse at 92% 50%, rgba(99,102,241,.05) 0%, transparent 45%)' }} />
                       <div className="hero-grid" style={{ position: 'relative' }}>
                          <div className="hero-grid-top">
                         {/* Left: Portfolio Value + Stats */}
                         <div>
                           <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Total Portfolio Value</div>
                           <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                             <div className="value-hero gradient-text-green">
                               ${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 6 }}>
                               <div style={{ fontSize: 13, color: summary.pnl24h >= 0 ? t.green : t.red, fontWeight: 700 }}>
                                 {summary.pnl24h >= 0 ? '+' : '-'}${Math.abs(summary.pnl24h).toLocaleString(undefined, { maximumFractionDigits: 0 })} / {summary.pnl24h >= 0 ? '+' : '-'}{summary.pnl24hPercent.toFixed(2)}%
                               </div>
                               <div style={{ fontSize: 13, color: t.textSecondary }}>{summary.nativeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</div>
                             </div>
                           </div>
                           {/* Compact stats */}
                           <div style={{ height: 1, background: theme === 'dark' ? 'var(--border)' : 'rgba(0,0,0,.08)', margin: '18px 0 14px' }} />
                           <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                             <span style={{ fontSize: 12, color: t.textTertiary }}>Liquid: <span style={{ color: t.textSecondary, fontWeight: 600 }}>${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                             <span style={{ fontSize: 12, color: t.textMuted }}>·</span>
                             <span style={{ fontSize: 12, color: t.textTertiary }}>Staked: <span style={{ color: t.textSecondary, fontWeight: 600 }}>${summary.stakingValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                             <span style={{ fontSize: 12, color: t.textMuted }}>·</span>
                             {wallets.length > 0 ? (() => {
                               const HEX_A = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                               const totalPHex = currentAssets.filter(a => a.chain === 'pulsechain' && (a as any).address?.toLowerCase() === HEX_A).reduce((s, a) => s + a.balance, 0)
                                              + currentStakes.filter(s => s.chain === 'pulsechain').reduce((s, st) => s + (st.stakedHex ?? 0), 0);
                               const totalEHex = currentAssets.filter(a => (a.chain === 'ethereum' && (a as any).address?.toLowerCase() === HEX_A) || (a.chain === 'pulsechain' && a.symbol === 'eHEX')).reduce((s, a) => s + a.balance, 0)
                                              + currentStakes.filter(s => s.chain === 'ethereum').reduce((s, st) => s + (st.stakedHex ?? 0), 0);
                               return <>
                                 <span style={{ fontSize: 12, color: t.textTertiary }}>pHEX: <span style={{ color: '#fb923c', fontWeight: 600 }}>{totalPHex >= 1e6 ? `${(totalPHex/1e6).toFixed(1)}M` : totalPHex >= 1e3 ? `${(totalPHex/1e3).toFixed(0)}K` : Math.round(totalPHex).toLocaleString('en-US')}</span></span>
                                 <span style={{ fontSize: 12, color: t.textMuted }}>·</span>
                                 <span style={{ fontSize: 12, color: t.textTertiary }}>eHEX: <span style={{ color: '#627EEA', fontWeight: 600 }}>{totalEHex >= 1e6 ? `${(totalEHex/1e6).toFixed(1)}M` : totalEHex >= 1e3 ? `${(totalEHex/1e3).toFixed(0)}K` : Math.round(totalEHex).toLocaleString('en-US')}</span></span>
                               </>;
                             })() : (
                               <button onClick={() => setIsAddingWallet(true)} style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontWeight: 600, transition: 'all .15s' }}>
                                 + Add Wallet
                               </button>
                             )}
                           </div>
                           {/* Net Investment / Total P&L — 2-card row */}
                           <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 14px' }} />
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="max-sm:grid-cols-1">
                             {[
                               { label: 'Total Invested', val: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `$${Math.abs(summary.netInvestment).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—', sub: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? 'ETH + stablecoin inflows' : 'No ETH/stable inflows found', color: t.text,
                                 icon: <TrendingUp size={14} color={t.textMuted} />, iconBg: t.cardHigh, link: true },
                               { label: 'Total P&L', val: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `${summary.unifiedPnl >= 0 ? '+' : ''}$${Math.abs(summary.unifiedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—', sub: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `${summary.unifiedPnl >= 0 ? '+' : ''}${((summary.unifiedPnl / summary.netInvestment) * 100).toFixed(1)}% vs invested` : 'P&L % needs ETH/stable history', color: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? (summary.unifiedPnl >= 0 ? t.green : t.red) : t.text,
                                 icon: <ArrowUpRight size={14} color={summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? (summary.unifiedPnl >= 0 ? t.green : t.red) : t.textMuted} />, iconBg: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? (summary.unifiedPnl >= 0 ? 'rgba(0,255,159,0.1)' : 'rgba(244,63,94,0.1)') : t.cardHigh, link: false },
                             ].map(({ label, val, sub, color, icon, iconBg, link }) => (
                               <div key={label} className="stat-card" onClick={link ? () => setActiveTab('history') : undefined}
                                 style={link ? { cursor: 'pointer' } : undefined}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                   <div style={{ width: 26, height: 26, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                     {icon}
                                   </div>
                                   <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</div>
                                   {link && <ExternalLink size={10} style={{ marginLeft: 'auto', color: 'var(--fg-subtle)', flexShrink: 0 }} />}
                                 </div>
                                 <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>{val}</div>
                                 <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 3 }}>{sub}</div>
                               </div>
                             ))}
                           </div>
                         </div>
                         {/* Profit Planner button */}
                         <div style={{ marginTop: 14 }}>
                           <button
                             onClick={() => setProfitPlannerOpen(true)}
                             style={{
                               display: 'inline-flex', alignItems: 'center', gap: 8,
                               padding: '10px 20px', borderRadius: 12,
                               background: 'linear-gradient(135deg, rgba(0,255,159,0.15) 0%, rgba(99,70,255,0.10) 100%)',
                               border: '1px solid rgba(0,255,159,0.30)',
                               color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                               cursor: 'pointer', transition: 'all .15s',
                               boxShadow: '0 0 20px rgba(0,255,159,0.08)',
                             }}
                           >
                             <TrendingUp size={15} />
                             Profit Planner
                           </button>
                         </div>
                          </div>{/* end hero-grid-top */}
                         {/* Live prices + holdings — full width below stats */}
                         {(() => {
                           const MAX_HERO_HOLDINGS = 7;
                           const holdingAssets = [...currentAssets].sort((a, b) => b.value - a.value).slice(0, MAX_HERO_HOLDINGS);
                           const fmtBal = (b: number) =>
                             b >= 1e9 ? `${(b/1e9).toFixed(2)}B` :
                             b >= 1e6 ? `${(b/1e6).toFixed(2)}M` :
                             b >= 1e3 ? `${(b/1e3).toFixed(2)}K` :
                             b.toLocaleString(undefined, { maximumFractionDigits: 2 });
                           const fmtVal = (v: number) =>
                             v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` :
                             v >= 1e3 ? `$${(v/1e3).toFixed(2)}K` :
                             `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
                           const fmtMarket = (v?: number | null) =>
                             v == null ? '—' :
                             v >= 1e12 ? `$${(v/1e12).toFixed(2)}T` :
                             v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` :
                             v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` :
                             v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` :
                             `$${v.toFixed(0)}`;
                           return (
                             <div className="hero-holdings-wrap">
                               <div className="hero-live-prices-panel">
                                 <div className="hero-live-prices-head">
                                   <div>
                                     <div className="hero-live-prices-title">Live Prices</div>
                                     <div className="hero-live-prices-subtitle">Core PulseChain tokens · live market data</div>
                                   </div>
                                   <button className="hero-live-holdings-link" onClick={() => setActiveTab('assets')}>
                                     My Holdings <ChevronRight size={12} />
                                   </button>
                                 </div>
                                 <div className="hero-live-prices-grid">
                                   {topHoldingCards.map((token) => {
                                     const change = token.change24h ?? 0;
                                     const isUp = change >= 0;
                                     return (
                                       <button key={token.id} type="button" className="hero-live-price-item" onClick={() => setShowMarketWatch(true)}>
                                         {token.accent && <div className="hero-live-accent-bar" style={{ background: token.accent }} />}
                                         <div className="hero-live-price-top">
                                           <div className="hero-live-token-lockup">
                                             <div className="hero-live-token-logo">
                                               {token.logo ? (
                                                 <>
                                                   <img
                                                     src={token.logo}
                                                     alt={token.symbol}
                                                     onError={(e) => {
                                                       e.currentTarget.style.display = 'none';
                                                       const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                       if (fallback) fallback.style.display = 'inline';
                                                     }}
                                                   />
                                                   <span style={{ display: 'none' }}>{token.symbol.slice(0, 1)}</span>
                                                 </>
                                               ) : token.symbol.slice(0, 1)}
                                             </div>
                                             <div className="hero-live-token-copy">
                                               <div className="hero-live-symbol">{token.symbol}</div>
                                               <div className="hero-live-name">{token.name}</div>
                                             </div>
                                           </div>
                                           {token.change24h != null && (
                                             <span className={isUp ? 'hero-live-change-pill up' : 'hero-live-change-pill down'}>
                                               {isUp ? '+' : ''}{change.toFixed(1)}%
                                             </span>
                                           )}
                                         </div>
                                         <div className="hero-live-price-label">Price</div>
                                         <div className="hero-live-price-number">{fmtPrice(token.price)}</div>
                                         {token.change24h != null && (
                                           <div className={isUp ? 'hero-live-change-line up' : 'hero-live-change-line down'}>
                                             {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% <span>24h</span>
                                           </div>
                                         )}
                                         <div className="hero-live-market-row">
                                           <div>
                                             <span>Market Cap</span>
                                             <strong>{fmtMarket(token.marketCap)}</strong>
                                           </div>
                                           <div>
                                             <span>Volume 24h</span>
                                             <strong>{fmtMarket(token.volume24h)}</strong>
                                           </div>
                                         </div>
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>

                               <div className="hero-holdings-panel">
                                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                   <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                     <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>My Holdings</span>
                                     {wallets.length > 0 && summary.liquidValue > 0 && (
                                       <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>
                                         · ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                       </span>
                                     )}
                                   </div>
                                   <button
                                     onClick={() => setActiveTab('assets')}
                                     style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                                     View All <ChevronRight size={11} />
                                   </button>
                                 </div>

                                 {holdingAssets.length === 0 ? (
                                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px 0', color: 'var(--fg-subtle)' }}>
                                     <WalletIcon size={28} style={{ opacity: 0.35 }} />
                                     <span style={{ fontSize: 13 }}>Add wallets to see holdings</span>
                                   </div>
                                 ) : (
                                   <div className="hero-holdings-items">
                                     <div className="data-table-scroll">
                                       <table className="data-table hero-holdings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                         <thead>
                                           <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                                             {['Token', '24H', 'Value', '% of Portfolio'].map((label, i) => (
                                               <th key={i} style={{
                                                 padding: '10px 12px',
                                                 fontSize: 11,
                                                 fontWeight: 700,
                                                 color: 'var(--fg-subtle)',
                                                 textTransform: 'uppercase',
                                                 letterSpacing: '.5px',
                                                 textAlign: i === 0 ? 'left' : 'right',
                                                 whiteSpace: 'nowrap'
                                               }}>
                                                 {label}
                                               </th>
                                             ))}
                                           </tr>
                                         </thead>
                                         <tbody>
                                           {holdingAssets.map((asset) => {
                                             const pct = asset.priceChange24h ?? asset.pnl24h ?? null;
                                             const lowerAddress = asset.address?.toLowerCase?.() ?? '';
                                             const logo = STATIC_LOGOS[lowerAddress] || asset.logoUrl || tokenLogos[lowerAddress];
                                             const share = ((asset.value / (summary.totalValue || 1)) * 100);
                                             return (
                                               <tr
                                                 key={asset.id}
                                                 onClick={() => setTokenCardModal(asset)}
                                                 style={{ borderBottom: `1px solid ${t.borderLight}`, cursor: 'pointer' }}
                                                 onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                                 onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                                 <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                                   <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                     <div style={{
                                                       width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                                       display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--fg)', flexShrink: 0, overflow: 'hidden'
                                                     }}>
                                                       {logo ? <img src={logo} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                                         onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} /> : null}
                                                       <span hidden={!!logo}>{asset.symbol[0]}</span>
                                                     </div>
                                                     <div style={{ minWidth: 0 }}>
                                                       <div title={asset.name || asset.symbol} style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                                         {asset.name || asset.symbol}
                                                       </div>
                                                       <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                                         <div style={{ width: 5, height: 5, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555', flexShrink: 0 }} />
                                                         <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                                                           {asset.symbol}{asset.price > 0 && <> · <PriceDisplay price={asset.price} /></>}
                                                         </span>
                                                       </div>
                                                     </div>
                                                   </div>
                                                 </td>
                                                 <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: (pct ?? 0) >= 0 ? t.green : t.red }}>
                                                   {pct !== null ? `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%` : '—'}
                                                 </td>
                                                 <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                   <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{fmtVal(asset.value)}</div>
                                                   <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{fmtBal(asset.balance)} {asset.symbol}</div>
                                                 </td>
                                                 <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 96 }}>
                                                   <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 3 }}>{share.toFixed(1)}%</div>
                                                   <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                                                     <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: 'var(--accent)', borderRadius: 1 }} />
                                                   </div>
                                                 </td>
                                               </tr>
                                             );
                                           })}
                                         </tbody>
                                       </table>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             </div>
                           );
                         })()}
                       </div>
                     </div>
                     </>
                   );
                 })()}

                {/* ── LIQUIDITY POSITIONS STRIP (overview) ── */}
                {wallets.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <LiquidityOverviewStrip
                      walletAddresses={wallets.map(w => w.address)}
                      tokenPrices={tokenPrices}
                      onViewAll={() => setActiveTab('defi')}
                    />
                  </div>
                )}

                {/* ── HEX TOTALS + ETH BOXES ── */}
                {(() => {
                  const HEX_ADDR = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                  const pHexPrice = prices[`pulsechain:${HEX_ADDR}`]?.usd || prices['pulsechain:hex']?.usd || 0;
                  const eHexPrice = prices[`ethereum:${HEX_ADDR}`]?.usd || prices['hex']?.usd || 0;
                  const HEX_ADDR_LC = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                  // pHEX liquid: native HEX on PulseChain (symbol HEX, same address as eHEX contract but on PLS chain)
                  const pHexLiquid = currentAssets.filter(a => a.chain === 'pulsechain' && (a as any).address?.toLowerCase() === HEX_ADDR_LC).reduce((s, a) => s + a.balance, 0);
                  // Staked = principal + accrued yield (recalculated at chain-specific rate, never from stale cache)
                  const pHexStaked = currentStakes.filter(s => s.chain === 'pulsechain').reduce((s, st) => {
                    const principal  = st.stakedHex ?? Number(st.stakedHearts ?? 0n) / 1e8;
                    const tSharesVal = st.tShares    ?? Number(st.stakeShares  ?? 0n) / 1e12;
                    const daysStaked = Math.max(0, (st.stakedDays ?? 0) - (st.daysRemaining ?? 0));
                    const interest   = tSharesVal * daysStaked * PHEX_YIELD_PER_TSHARE;
                    return s + principal + interest;
                  }, 0);
                  // eHEX liquid: HEX on Ethereum + bridged eHEX on PulseChain
                  const eHexLiquidEth = currentAssets.filter(a => a.chain === 'ethereum' && (a as any).address?.toLowerCase() === HEX_ADDR_LC).reduce((s, a) => s + a.balance, 0);
                  const eHexLiquidPls = currentAssets.filter(a => a.chain === 'pulsechain' && a.symbol === 'eHEX').reduce((s, a) => s + a.balance, 0);
                  const eHexLiquid = eHexLiquidEth + eHexLiquidPls;
                  const eHexStaked = currentStakes.filter(s => s.chain === 'ethereum').reduce((s, st) => {
                    const principal  = st.stakedHex ?? Number(st.stakedHearts ?? 0n) / 1e8;
                    const tSharesVal = st.tShares    ?? Number(st.stakeShares  ?? 0n) / 1e12;
                    const daysStaked = Math.max(0, (st.stakedDays ?? 0) - (st.daysRemaining ?? 0));
                    const interest   = tSharesVal * daysStaked * EHEX_YIELD_PER_TSHARE;
                    return s + principal + interest;
                  }, 0);
                  const pHexTotal = pHexLiquid + pHexStaked;
                  const eHexTotal = eHexLiquid + eHexStaked;
                  // Space-separated thousands: 148 000 000
                  const boxes = [
                    { label: 'Total pHEX', sub: `${fmtBigNum(pHexLiquid)} liquid · ${fmtBigNum(pHexStaked)} staked`, val: fmtBigNum(pHexTotal), usd: pHexTotal * pHexPrice, color: '#fb923c', dot: '#fb923c' },
                    { label: 'Total eHEX', sub: `${fmtBigNum(eHexLiquid)} liquid · ${fmtBigNum(eHexStaked)} staked`, val: fmtBigNum(eHexTotal), usd: eHexTotal * eHexPrice, color: '#627EEA', dot: '#627EEA' },
                  ];
                  return (
                    <div style={{ background: theme === 'dark' ? 'radial-gradient(ellipse at top left, #111118 0%, #0d0d0d 100%)' : t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: isCollapsed('hex-boxes') ? 'none' : `1px solid ${t.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>HEX Holdings</div>
                        <button onClick={() => toggleSection('hex-boxes')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = t.text)}
                          onMouseOut={e => (e.currentTarget.style.color = t.textMuted)}
                          title={isCollapsed('hex-boxes') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('hex-boxes') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      {!isCollapsed('hex-boxes') && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }} className="max-sm:grid-cols-1">
                          {boxes.map(b => (
                            <div key={b.label} style={{ padding: 16, borderRight: `1px solid ${t.borderLight}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.dot }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.5px' }}>{b.label}</span>
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: b.color, letterSpacing: '-0.5px' }}>{b.val}</div>
                              {b.usd !== null && <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>${b.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                              <div style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>{b.sub}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── PORTFOLIO PERFORMANCE ── */}
                {(() => {
                  const now = Date.now();
                  const cutoffs: Record<string, number> = {
                    '1w': now - 7 * 24 * 3600 * 1000,
                    '1m': now - 30 * 24 * 3600 * 1000,
                    '1y': now - 365 * 24 * 3600 * 1000,
                    'all': 0,
                  };
                  const cutoff = cutoffs[perfPeriod];
                  const realHistory = (wallets.length > 0 ? history : []).filter(p => p.timestamp >= cutoff);
                  const currentVal = summary.totalValue || 1;
                  const mockLast = MOCK_HISTORY[MOCK_HISTORY.length - 1]?.value || 1;
                  const scale = currentVal / mockLast;

                  // Deduplicate by period-appropriate bucket, keeping latest value + timestamp per bucket
                  const byBucket = new Map<string, { value: number; ts: number }>();
                  realHistory.forEach(p => {
                    const key = perfPeriod === '1w' ? format(p.timestamp, 'yyyy-MM-dd HH') : format(p.timestamp, 'yyyy-MM-dd');
                    byBucket.set(key, { value: p.value, ts: p.timestamp });
                  });
                  const uniquePts = [...byBucket.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([, { value, ts }]) => ({ day: fmtLabel(ts), value }));

                  let chartPoints: { day: string; value: number }[];
                  let isSimulated = false;

                  if (uniquePts.length >= 3) {
                    chartPoints = uniquePts;
                  } else {
                    isSimulated = true;
                    const mockCount = perfPeriod === '1w' ? 28 : perfPeriod === '1m' ? 30 : perfPeriod === '1y' ? 52 : 60;
                    chartPoints = MOCK_HISTORY.slice(-mockCount).map(p => ({
                      day: fmtLabel(p.timestamp),
                      value: p.value * scale
                    }));
                    if (chartPoints.length > 0) chartPoints[chartPoints.length - 1].value = currentVal;
                  }

                  const periodChange = chartPoints.length >= 2
                    ? ((chartPoints[chartPoints.length - 1].value - chartPoints[0].value) / Math.max(1, chartPoints[0].value)) * 100
                    : 0;

                  const periodLabel: Record<string, string> = { '1w': 'Week', '1m': 'Month', '1y': 'Year', 'all': 'All' };
                  const xTickCount = perfPeriod === '1w' ? 7 : perfPeriod === '1m' ? 6 : 8;
                  const xInterval = Math.max(0, Math.floor(chartPoints.length / xTickCount) - 1);

                  const yMin = Math.min(...chartPoints.map(p => p.value));
                  const yMax = Math.max(...chartPoints.map(p => p.value));
                  const yPad = (yMax - yMin) * 0.1 || yMax * 0.1;
                  const fmtYAxis = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;

                  return (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: isCollapsed('perf-chart') ? 'none' : `1px solid ${t.borderLight}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Portfolio Performance</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: periodChange >= 0 ? t.green : t.red }}>
                            {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                          </div>
                          {isSimulated && <div style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>simulated</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Period tabs */}
                          {!isCollapsed('perf-chart') && (
                            <div style={{ display: 'flex', gap: 2, background: t.cardHigh, border: `1px solid ${t.border}`, borderRadius: 8, padding: 3 }}>
                              {(['1w','1m','1y','all'] as const).map(p => (
                                <button key={p} onClick={() => setPerfPeriod(p)}
                                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all .12s',
                                    background: perfPeriod === p ? 'var(--accent)' : 'var(--bg-elevated)',
                                    color: perfPeriod === p ? (theme === 'dark' ? '#000' : '#fff') : 'var(--fg-muted)',
                                    boxShadow: perfPeriod === p ? '0 0 10px rgba(0,255,159,0.25)' : 'none' }}>
                                  {periodLabel[p]}
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => toggleSection('perf-chart')}
                            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, transition: 'color .12s' }}
                            onMouseOver={e => (e.currentTarget.style.color = t.text)}
                            onMouseOut={e => (e.currentTarget.style.color = t.textMuted)}
                            title={isCollapsed('perf-chart') ? 'Expand' : 'Collapse'}>
                            {isCollapsed('perf-chart') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </button>
                        </div>
                      </div>
                      {!isCollapsed('perf-chart') && (
                        <div style={{ padding: '10px 4px 10px 0' }}>
                          <div style={{ height: 270 }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                              <AreaChart data={chartPoints} margin={{ top: 4, right: 18, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22}/>
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e1e1e' : '#e8e8e8'} vertical={false} />
                                <XAxis dataKey="day" stroke={theme === 'dark' ? '#333' : '#ccc'} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: t.textSecondary }} interval={xInterval} />
                                <YAxis width={54} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: t.textSecondary }} tickFormatter={fmtYAxis} domain={[yMin - yPad, yMax + yPad]} />
                                <RechartsTooltip
                                  contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, color: t.text }}
                                  formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Portfolio Value']}
                                  labelStyle={{ color: t.textSecondary, marginBottom: 4 }}
                                />
                                <Area type="monotone" dataKey="value" stroke="var(--accent)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {activeTab === 'defi' && (
              <motion.div key="defi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LiquiditySection
                  walletAddresses={wallets.map(w => w.address)}
                  tokenPrices={tokenPrices}
                />
              </motion.div>
            )}

            {activeTab === 'assets' && (
              <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {(() => {
                  const chainAssets = walletChainFilter === 'all' ? currentAssets : currentAssets.filter(a => a.chain === walletChainFilter);
                  return (<>

                {/* ── All Wallets hero banner ── */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: '24px', border: '1px solid var(--accent-border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>All Wallets</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--fg)', marginBottom: 16 }}>
                    ${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <span className="wallet-stat-pill-green">
                      Wallet ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span style={{ background: 'rgba(239,68,68,0.12)', color: t.red, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid rgba(239,68,68,0.20)' }}>
                      Staking ${summary.stakingValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['all', 'pulsechain', 'ethereum', 'base'] as const).map(c => (
                      <button key={c} onClick={() => setWalletChainFilter(c)}
                        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .12s',
                          background: walletChainFilter === c ? 'var(--fg)' : 'transparent',
                          color: walletChainFilter === c ? 'var(--bg-surface)' : 'var(--fg-muted)',
                          borderColor: walletChainFilter === c ? 'var(--fg)' : 'var(--border)' }}>
                        {c === 'all' ? 'All' : c === 'pulsechain' ? 'PulseChain' : c === 'ethereum' ? 'Ethereum' : 'Base'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 2 }}>Holdings</div>
                    <div style={{ fontSize: 13, color: t.textSecondary }}>{chainAssets.length} token{chainAssets.length !== 1 ? 's' : ''} · ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} liquid</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 3, background: t.cardHigh, border: `1px solid ${t.border}`, borderRadius: 8, padding: 3 }}>
                      {([['1h','1H'],['6h','6H'],['24h','24H'],['7d','7D']] as const).map(([p, label]) => (
                        <button key={p} onClick={() => setPriceChangePeriod(p)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', border: 'none',
                            background: priceChangePeriod === p ? 'var(--accent)' : 'transparent',
                            color: priceChangePeriod === p ? (theme === 'dark' ? '#000' : '#fff') : t.textMuted }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setHideDust(!hideDust)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.border}`,
                        background: hideDust ? 'var(--accent)' : t.cardHigh, color: hideDust ? (theme === 'dark' ? '#000' : '#fff') : t.textSecondary,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s' }}>
                      Hide Dust
                    </button>
                    <button onClick={() => setHideSpam(!hideSpam)}
                      style={{ padding: '6px 14px', borderRadius: 8,
                        background: hideSpam ? '#f739ff22' : t.cardHigh, color: hideSpam ? '#f739ff' : t.textSecondary,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                        border: hideSpam ? '1px solid #f739ff44' : `1px solid ${t.border}` }}>
                      Hide Spam
                    </button>
                    <button onClick={scanForSpam} disabled={isScanning || wallets.length === 0}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.border}`,
                        background: t.cardHigh, color: isScanning ? t.textMuted : t.textSecondary,
                        fontSize: 13, fontWeight: 600, cursor: isScanning || wallets.length === 0 ? 'default' : 'pointer',
                        transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {isScanning ? '⟳ Scanning…' : 'Scan'}
                      {scanResult !== null && !isScanning && (
                        <span style={{ background: scanResult > 0 ? '#f739ff33' : 'var(--accent-dim)', color: scanResult > 0 ? '#f739ff' : t.green,
                          borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>
                          {scanResult > 0 ? `+${scanResult} spam` : '✓ clean'}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setAllocWheelOpen(v => !v)}
                      title={allocWheelOpen ? 'Hide allocation' : 'Show allocation'}
                      style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${allocWheelOpen ? 'var(--accent-border)' : t.border}`,
                        background: allocWheelOpen ? 'var(--accent-dim)' : t.cardHigh,
                        color: allocWheelOpen ? 'var(--accent)' : t.textSecondary,
                        cursor: 'pointer', transition: 'all .12s', display: 'flex', alignItems: 'center' }}>
                      <PieChartIcon size={14} />
                    </button>
                    {allocWheelOpen && (
                      <button
                        onClick={() => setAllocationCalculatorOpen(v => !v)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${allocationCalculatorOpen ? 'var(--accent-border)' : t.border}`,
                          background: allocationCalculatorOpen ? 'var(--accent-dim)' : t.cardHigh,
                          color: allocationCalculatorOpen ? 'var(--accent)' : t.textSecondary,
                          cursor: 'pointer', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <Calculator size={13} />
                        {allocationCalculatorOpen ? 'Close Calculator' : 'Open Calculator'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Allocation panel ── */}
                {allocWheelOpen && (() => {
                  const ALLOC_COLORS_P = ['#00FF9F','#627EEA','#f97316','#a855f7','#f59e0b','#06b6d4','#ec4899'];
                  const alloc = assetAllocation.length > 0 ? assetAllocation : [];
                  const emptyData = [{ name: '', value: 1 }];
                  return (
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', transition: 'all .2s ease' }}>
                      {!allocationCalculatorOpen ? (
                        <>
                          <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                              <PieChart>
                                <Pie data={alloc.length > 0 ? alloc : emptyData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={alloc.length > 0 ? 3 : 0} dataKey="value" strokeWidth={0}>
                                  {(alloc.length > 0 ? alloc : emptyData).map((_, i) => (
                                    <Cell key={i} fill={alloc.length > 0 ? ALLOC_COLORS_P[i % ALLOC_COLORS_P.length] : 'var(--border)'} />
                                  ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid rgba(0,255,159,0.15)', borderRadius: 10, fontSize: 12, color: 'var(--fg)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 160 }}>
                            {alloc.length > 0 ? alloc.map((a, i) => {
                              const pct = (a.value / (summary.totalValue || 1)) * 100;
                              const valFmt = a.value >= 1e6 ? `$${(a.value/1e6).toFixed(1)}M` : a.value >= 1e3 ? `$${(a.value/1e3).toFixed(0)}K` : `$${a.value.toFixed(0)}`;
                              return (
                                <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: 2, background: ALLOC_COLORS_P[i % ALLOC_COLORS_P.length], flexShrink: 0, boxShadow: `0 0 6px ${ALLOC_COLORS_P[i % ALLOC_COLORS_P.length]}66` }} />
                                  <span style={{ fontSize: 13, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: t.textSecondary, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', marginLeft: 4 }}>{pct.toFixed(1)}%</span>
                                  <span style={{ fontSize: 12, color: t.textMuted, fontFamily: 'JetBrains Mono, monospace', minWidth: 52, textAlign: 'right' }}>{valFmt}</span>
                                </div>
                              );
                            }) : (
                              <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>Add wallets to see allocation</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ width: '100%', display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Adjust Allocation</div>
                            <div style={{ fontSize: 12, color: t.textSecondary }}>
                              Total: {allocationCalculatorRows.reduce((sum, r) => sum + r.percent, 0).toFixed(1)}%
                            </div>
                          </div>
                          {allocationCalculatorRows.length > 0 ? allocationCalculatorRows.map((row, i) => (
                            <div key={row.name} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', alignItems: 'center', gap: 10 }} className="max-sm:grid-cols-1">
                              <span style={{ fontSize: 13, color: t.text }}>{row.name}</span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={0.1}
                                value={row.percent}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setAllocationDraftPercentages(prev => ({ ...prev, [row.name]: next }));
                                }}
                                style={{ accentColor: ALLOC_COLORS_P[i % ALLOC_COLORS_P.length] }}
                              />
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={row.percent.toFixed(1)}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  if (!Number.isFinite(next)) return;
                                  setAllocationDraftPercentages(prev => ({ ...prev, [row.name]: Math.min(100, Math.max(0, next)) }));
                                }}
                                style={{ width: '100%', background: t.cardHigh, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                              />
                              <span style={{ fontSize: 12, color: t.textSecondary, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                                ${row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          )) : (
                            <div style={{ fontSize: 13, color: t.textMuted }}>No holdings available for allocation calculator.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Token Table */}
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }} className="md-elevation-1">
                  <div style={{ padding: '14px 16px', borderBottom: isCollapsed('assets-table') ? 'none' : `1px solid ${t.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Assets</div>
                      <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>{chainAssets.length} tokens · ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <button onClick={() => toggleSection('assets-table')}
                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                      title={isCollapsed('assets-table') ? 'Expand' : 'Collapse'}>
                      {isCollapsed('assets-table') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                  {!isCollapsed('assets-table') && (<>
                  <div className="data-table-scroll">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                          {[
                            { label: 'Token', field: null, align: 'left' },
                            { label: priceChangePeriod.toUpperCase(), field: 'change', align: 'right' },
                            { label: 'Value', field: 'value', align: 'right' },
                            { label: '% of Portfolio', field: null, align: 'right' },
                            { label: '', field: null, align: 'right' },
                          ].map(({ label, field, align }, i) => (
                            <th key={i} onClick={field ? () => {
                              if (assetSortField === field) setAssetSortDir(d => d === 'desc' ? 'asc' : 'desc');
                              else { setAssetSortField(field as any); setAssetSortDir('desc'); }
                            } : undefined}
                              style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600,
                                color: assetSortField === field ? t.green : t.textSecondary,
                                textTransform: 'uppercase', letterSpacing: '.5px',
                                textAlign: align as any, whiteSpace: 'nowrap', background: t.card,
                                cursor: field ? 'pointer' : 'default', userSelect: 'none' }}>
                              {label}{field && assetSortField === field ? (assetSortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading && wallets.length > 0 && currentAssets.length === 0 && [...Array(5)].map((_, i) => (
                          <tr key={`skel-${i}`}>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
                                <div>
                                  <div className="skeleton" style={{ width: 80, height: 13, marginBottom: 5 }} />
                                  <div className="skeleton" style={{ width: 110, height: 11 }} />
                                </div>
                              </div>
                            </td>
                            {[...Array(4)].map((_, j) => (
                              <td key={j} style={{ padding: '13px 16px', textAlign: 'right' }}>
                                <div className="skeleton" style={{ height: 13, width: 60, marginLeft: 'auto' }} />
                              </td>
                            ))}
                          </tr>
                        ))}
                        {currentAssets.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
                              No holdings found — add wallets to get started
                            </td>
                          </tr>
                        ) : (
                          [...chainAssets].sort((a, b) => {
                            const getVal = (x: any) => assetSortField === 'change'
                              ? (priceChangePeriod === '1h' ? (x.priceChange1h ?? 0)
                                : priceChangePeriod === '7d' ? (x.priceChange7d ?? 0)
                                : (x.priceChange24h ?? x.pnl24h ?? 0))
                              : x.value;
                            const diff = getVal(b) - getVal(a);
                            return assetSortDir === 'desc' ? diff : -diff;
                          }).map((asset, idx) => {
                            const pct = priceChangePeriod === '1h' ? (asset.priceChange1h ?? 0)
                              : priceChangePeriod === '7d' ? (asset.priceChange7d ?? 0)
                              : priceChangePeriod === '6h' ? 0
                              : (asset.priceChange24h ?? asset.pnl24h ?? 0);
                            const share = ((asset.value / (summary.totalValue || 1)) * 100);
                            const addr = (asset as any).address;
                            const logo = STATIC_LOGOS[(asset as any).address?.toLowerCase?.()]
                              || tokenLogos[(asset as any).address?.toLowerCase?.()]
                              || (asset as any).logoUrl
                              || getTokenLogoUrl(asset);
                            const explUrl = explorerUrl(asset.chain, addr);
                            const dsUrl = dexScreenerUrl(asset.chain, addr);
                            const isExpanded = expandedAssetIds.has(asset.id);
                            const plsUsdPrice = prices['pulsechain']?.usd || 0.00005;
                            const priceInPls = asset.price > 0 && plsUsdPrice > 0 ? asset.price / plsUsdPrice : 0;
                            const entryPls = manualEntries[asset.id];
                            const currentPlsValue = asset.value / plsUsdPrice;
                            const pnlPls = entryPls ? currentPlsValue - entryPls : null;
                            const fmtBal = (b: number) =>
                              b >= 1e9 ? `${(b/1e9).toFixed(2)}B` :
                              b >= 1e6 ? `${(b/1e6).toFixed(2)}M` :
                              b >= 1e3 ? `${(b/1e3).toFixed(2)}K` :
                              b.toLocaleString(undefined, { maximumFractionDigits: 4 });
                            return (
                              <React.Fragment key={asset.id}>
                              <motion.tr
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.03, 0.5), duration: 0.2 }}
                                style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', transition: 'background .1s', borderLeft: `3px solid ${CHAIN_COLORS[asset.chain] || '#333'}`, cursor: 'pointer' }}
                                onClick={() => setExpandedAssetIds(prev => { const s = new Set(prev); s.has(asset.id) ? s.delete(asset.id) : s.add(asset.id); return s; })}
                                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                onMouseOut={e => (e.currentTarget.style.background = isExpanded ? 'var(--bg-elevated)' : 'transparent')}>
                                {/* ── Token cell ── */}
                                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* Logo */}
                                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--fg)', flexShrink: 0, overflow: 'hidden' }}>
                                      {logo ? <img src={logo} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} /> : null}
                                      <span hidden={!!logo}>{asset.symbol[0]}</span>
                                    </div>
                                    {/* Name + subtitle */}
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{asset.name || asset.symbol}</span>
                                        {addr && addr !== 'native' && (
                                          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(addr); }}
                                            title={`Copy: ${addr}`}
                                            style={{ padding: '1px 3px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s', lineHeight: 1 }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
                                            onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                            <Copy size={10} />
                                          </button>
                                        )}
                                        {dsUrl && addr !== 'native' && (
                                          <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                                            title="DexScreener" onClick={e => e.stopPropagation()}
                                            style={{ padding: '1px 3px', color: 'var(--fg-subtle)', transition: 'color .12s', lineHeight: 1, display: 'inline-flex' }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#f4c542')}
                                            onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                            <ExternalLink size={10} />
                                          </a>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555', flexShrink: 0 }} />
                                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                                          {asset.symbol}{asset.price > 0 && <> · <PriceDisplay price={asset.price} /></>}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {/* ── Change cell ── */}
                                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap',
                                  fontSize: 13, fontWeight: 600, color: pct >= 0 ? t.green : t.red }}>
                                  {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
                                    ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                                    {fmtBal(asset.balance)} {asset.symbol}
                                  </div>
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 90 }}>
                                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 3 }}>{share.toFixed(1)}%</div>
                                  <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                                    <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: 'var(--accent)', borderRadius: 1 }} />
                                  </div>
                                </td>
                                <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                    <button
                                      onClick={e => { e.stopPropagation(); setPnlAsset(pnlAsset?.id === asset.id ? null : asset); }}
                                      title="View P&L"
                                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .12s',
                                        color: pnlAsset?.id === asset.id ? '#a78bfa' : '#555' }}
                                      onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                                      onMouseOut={e => (e.currentTarget.style.color = pnlAsset?.id === asset.id ? '#a78bfa' : '#555')}>
                                      <Calculator size={13} />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); setHiddenTokens([...hiddenTokens, asset.id]); }}
                                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s' }}
                                      onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                      onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                                      title="Hide">
                                      <Trash2 size={13} />
                                    </button>
                                    <span style={{ color: isExpanded ? t.green : 'var(--fg-subtle)', padding: 4, display: 'inline-flex', transition: 'color .12s' }}>
                                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                              {/* ── Expanded details row ── */}
                              {isExpanded && (
                                <tr style={{ borderBottom: `1px solid ${t.borderLight}`, borderLeft: `3px solid ${CHAIN_COLORS[asset.chain] || '#333'}`, background: t.expandedBg }}>
                                  <td colSpan={5} style={{ padding: '0 16px 14px 16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, paddingTop: 12 }}>
                                      {/* Price details */}
                                      <div style={{ background: t.cardHigh, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Price Details</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>USD</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'monospace' }}><PriceDisplay price={asset.price} /></span>
                                          </div>
                                          {priceInPls > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>in PLS</span>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: '#f739ff', fontFamily: 'monospace' }}>
                                                {priceInPls >= 1e6 ? `${(priceInPls/1e6).toFixed(2)}M` : priceInPls >= 1e3 ? `${(priceInPls/1e3).toFixed(2)}K` : priceInPls >= 1 ? priceInPls.toFixed(2) : priceInPls < 0.001 ? priceInPls.toFixed(8) : priceInPls.toFixed(6)} PLS
                                              </span>
                                            </div>
                                          )}
                                          {(asset.priceChange1h ?? null) !== null && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>1H</span>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: (asset.priceChange1h ?? 0) >= 0 ? t.green : t.red }}>
                                                {(asset.priceChange1h ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(asset.priceChange1h ?? 0).toFixed(2)}%
                                              </span>
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>24H</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: (asset.priceChange24h ?? asset.pnl24h ?? 0) >= 0 ? t.green : t.red }}>
                                              {(asset.priceChange24h ?? asset.pnl24h ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(asset.priceChange24h ?? asset.pnl24h ?? 0).toFixed(2)}%
                                            </span>
                                          </div>
                                          {(asset.priceChange7d ?? null) !== null && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>7D</span>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: (asset.priceChange7d ?? 0) >= 0 ? t.green : t.red }}>
                                                {(asset.priceChange7d ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(asset.priceChange7d ?? 0).toFixed(2)}%
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {/* Market Data */}
                                      <div style={{ background: t.cardHigh, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Market Data</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                          {(() => {
                                            const md = tokenMarketData[asset.id];
                                            const fmtNum = (n: number) => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
                                            return (
                                              <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Native Price</span>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'monospace' }}>
                                                    {md?.nativePriceUsd ? `${parseFloat(md.nativePriceUsd).toFixed(4)}` : '—'}
                                                  </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Liquidity</span>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: t.green }}>{md ? fmtNum(md.liquidity) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Volume 24h</span>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{md ? fmtNum(md.volume24h) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Pools</span>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)' }}>{md ? md.pools : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Txns 24h</span>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)' }}>{md?.txns24h != null ? md.txns24h.toLocaleString() : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}</span>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {/* Holdings breakdown */}
                                      <div style={{ background: t.cardHigh, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Your Holdings</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Held</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                                              {asset.balance >= 1e6 ? `${(asset.balance/1e6).toFixed(2)}M` : asset.balance >= 1e3 ? `${(asset.balance/1e3).toFixed(2)}K` : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.symbol}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Value</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                          </div>
                                          {priceInPls > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Value PLS</span>
                                              <span style={{ fontSize: 13, fontWeight: 600, color: '#f739ff' }}>
                                                {currentPlsValue >= 1e6 ? `${(currentPlsValue/1e6).toFixed(2)}M` : currentPlsValue >= 1e3 ? `${(currentPlsValue/1e3).toFixed(2)}K` : currentPlsValue.toFixed(0)} PLS
                                              </span>
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>% of Portfolio</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>{share.toFixed(2)}%</span>
                                          </div>
                                        </div>
                                      </div>
                                      {/* PLS-denominated P&L */}
                                      <div style={{ background: t.cardHigh, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.7px' }}>PLS P&L</div>
                                          {entryPls && entryPls > 0 && (
                                            <button onClick={e => { e.stopPropagation(); setManualEntries(prev => { const n = { ...prev }; delete n[asset.id]; return n; }); }}
                                              title="Clear entry"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 2, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
                                              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                              onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                              <X size={13} />
                                            </button>
                                          )}
                                        </div>
                                        {pnlPls !== null ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Entry</span>
                                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>{(entryPls!).toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Now</span>
                                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{currentPlsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 2 }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)', fontWeight: 700 }}>Net P&L</span>
                                              <span style={{ fontSize: 14, fontWeight: 800, color: pnlPls >= 0 ? t.green : t.red }}>
                                                {pnlPls >= 0 ? '+' : ''}{pnlPls.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS
                                              </span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 8 }}>Set entry to track P&L</div>
                                            <input type="number" placeholder="Entry PLS amount"
                                              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 12, padding: '5px 8px', outline: 'none' }}
                                              onClick={e => e.stopPropagation()}
                                              onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setManualEntries(prev => ({ ...prev, [asset.id]: v })); }} />
                                          </div>
                                        )}
                                      </div>
                                      {/* Links */}
                                      <div style={{ background: t.cardHigh, borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Links & Info</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                          {addr && addr !== 'native' && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Contract</span>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--fg-muted)' }}>{addr.slice(0,6)}…{addr.slice(-4)}</span>
                                                <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(addr); }}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 2 }}
                                                  onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
                                                  onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                                  <Copy size={11} />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                          {explUrl && (
                                            <a href={explUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', transition: 'opacity .12s' }}
                                              onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
                                              onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                                              <ExternalLink size={11} /> Explorer
                                            </a>
                                          )}
                                          {dsUrl && addr !== 'native' && (
                                            <a href={dsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f4c542', textDecoration: 'none', transition: 'opacity .12s' }}
                                              onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
                                              onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                                              <ExternalLink size={11} /> DexScreener
                                            </a>
                                          )}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555' }} />
                                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)', textTransform: 'capitalize' }}>{asset.chain}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                      {currentAssets.length > 0 && (
                        <tfoot>
                          <tr style={{ borderTop: '1px solid var(--border)' }}>
                            <td colSpan={2} style={{ padding: '10px 16px', fontSize: 13, color: 'var(--fg-muted)', fontWeight: 600 }}>
                              TOTAL LIQUID
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                              ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  {unpricedCount > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={12} /> {unpricedCount} token{unpricedCount !== 1 ? 's' : ''} with no price data omitted
                    </div>
                  )}
                  </>)}
                </div>

                {/* ── Transactions ── */}
                <div style={{ marginTop: 8 }}>
                  {/* Type filter pills + active filter chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'deposit', label: 'Received' },
                      { value: 'withdraw', label: 'Sent' },
                      { value: 'swap', label: 'Swaps' },
                    ] as { value: string; label: string }[]).map(({ value, label }) => (
                      <button key={value}
                        onClick={() => setTxTypeFilter(value)}
                        style={{
                          padding: '5px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all .12s',
                          background: txTypeFilter === value ? 'var(--fg)' : 'transparent',
                          color: txTypeFilter === value ? 'var(--bg)' : 'var(--fg-muted)',
                          border: `1px solid ${txTypeFilter === value ? 'var(--fg)' : 'var(--border)'}`,
                        }}>
                        {label}
                      </button>
                    ))}
                    {(txAssetFilter !== 'all' || txChainFilter !== 'all' || txYearFilter !== 'all' || txCoinCategory !== 'all') && (
                      <>
                        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
                        {txAssetFilter !== 'all' && (
                          <button className="filter-chip" onClick={() => setTxAssetFilter('all')}>
                            {txAssetFilter}<span className="chip-x">✕</span>
                          </button>
                        )}
                        {txChainFilter !== 'all' && (
                          <button className="filter-chip" onClick={() => setTxChainFilter('all')}>
                            {txChainFilter === 'pulsechain' ? 'PulseChain' : txChainFilter === 'ethereum' ? 'Ethereum' : 'Base'}<span className="chip-x">✕</span>
                          </button>
                        )}
                        {txYearFilter !== 'all' && (
                          <button className="filter-chip" onClick={() => setTxYearFilter('all')}>
                            {txYearFilter}<span className="chip-x">✕</span>
                          </button>
                        )}
                        {txCoinCategory !== 'all' && (
                          <button className="filter-chip" onClick={() => setTxCoinCategory('all')}>
                            {txCoinCategory === 'stablecoins' ? 'Stablecoins' : txCoinCategory === 'eth_weth' ? 'ETH/WETH' : txCoinCategory === 'hex' ? 'HEX/eHEX' : txCoinCategory === 'pls_wpls' ? 'PLS/WPLS' : 'Bridged'}<span className="chip-x">✕</span>
                          </button>
                        )}
                        <button
                          onClick={() => { setTxTypeFilter('all'); setTxAssetFilter('all'); setTxChainFilter('all'); setTxYearFilter('all'); setTxCoinCategory('all'); }}
                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', textDecoration: 'underline' }}>
                          Clear all
                        </button>
                      </>
                    )}
                  </div>

                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }} className="md-elevation-1">
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('holdings-txs') ? 'none' : `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Bridge Activity</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                          Live
                        </span>
                        <span style={{ fontSize: 12, color: t.textTertiary }}>{filteredTransactions.length} tx</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setViewAsYou(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: viewAsYou ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border)', transition: 'background .15s', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: 2, left: viewAsYou ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                            View as <span style={{ color: 'var(--accent)' }}>You</span>
                          </span>
                        </button>
                        <button onClick={() => setTxCompact(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: txCompact ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border)', transition: 'background .15s', position: 'relative', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: 2, left: txCompact ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Compact</span>
                        </button>
                        <button
                          onClick={() => {
                            const hdrs = ['Date', 'Type', 'Asset', 'Amount', 'Counter Asset', 'Counter Amount', 'Value USD', 'Chain', 'Hash'];
                            const rows = filteredTransactions.map(tx => [
                              new Date(tx.timestamp).toISOString().slice(0, 10),
                              tx.type, tx.asset, tx.amount, tx.counterAsset ?? '', tx.counterAmount ?? '', tx.valueUsd ?? '', tx.chain, tx.hash ?? '',
                            ]);
                            exportCSV(`pulseport-history-${Date.now()}.csv`, hdrs, rows);
                          }}
                          title="Export CSV"
                          className="history-csv-btn"
                          style={{ padding: '5px 10px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Download size={12} /> CSV
                        </button>
                        <button onClick={() => toggleSection('holdings-txs')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: t.textTertiary, transition: 'color .12s', flexShrink: 0 }}
                          onMouseOver={e => (e.currentTarget.style.color = t.text)}
                          onMouseOut={e => (e.currentTarget.style.color = t.textMuted)}
                          title={isCollapsed('holdings-txs') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('holdings-txs') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>
                    {!isCollapsed('holdings-txs') && (<>
                    {/* Filter row */}
                    <div className="tx-filter-row history-filter-row" style={{ padding: '8px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { value: txChainFilter, onChange: setTxChainFilter, options: [['all','All Chains'],['pulsechain','PulseChain'],['ethereum','Ethereum'],['base','Base']] as [string,string][] },
                        { value: txAssetFilter, onChange: setTxAssetFilter, options: [['all','All Tokens'], ...Array.from(new Set(currentTransactions.map(tx => tx.asset))).sort().map(a => [a,a])] as [string,string][] },
                        { value: txYearFilter, onChange: setTxYearFilter, options: [['all','All Years'],['2026','2026'],['2025','2025'],['2024','2024'],['2023','2023'],['2022','2022'],['2021','2021']] as [string,string][] },
                        { value: txCoinCategory, onChange: setTxCoinCategory, options: [['all','All Coins'],['stablecoins','Stablecoins'],['eth_weth','ETH/WETH'],['hex','HEX/eHEX'],['pls_wpls','PLS/WPLS'],['bridged','Bridged']] as [string,string][] },
                      ].map(({ value, onChange, options }, i) => (
                        <select key={i} value={value} onChange={e => onChange(e.target.value)}
                          className="history-filter-select"
                          style={{ background: t.cardHigh, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ))}
                    </div>
                    {/* Active filter chips */}
                    {(txAssetFilter !== 'all' || txChainFilter !== 'all' || txYearFilter !== 'all' || txCoinCategory !== 'all') && (
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '8px 18px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 4 }}>Filtering by:</span>
                        {txAssetFilter !== 'all' && (<button className="filter-chip" onClick={() => setTxAssetFilter('all')}>{txAssetFilter}<span className="chip-x">&#x2715;</span></button>)}
                        {txChainFilter !== 'all' && (<button className="filter-chip" onClick={() => setTxChainFilter('all')}>{txChainFilter === 'pulsechain' ? 'PulseChain' : txChainFilter === 'ethereum' ? 'Ethereum' : 'Base'}<span className="chip-x">&#x2715;</span></button>)}
                        {txYearFilter !== 'all' && (<button className="filter-chip" onClick={() => setTxYearFilter('all')}>{txYearFilter}<span className="chip-x">&#x2715;</span></button>)}
                        {txCoinCategory !== 'all' && (<button className="filter-chip" onClick={() => setTxCoinCategory('all')}>{txCoinCategory === 'stablecoins' ? 'Stablecoins' : txCoinCategory === 'eth_weth' ? 'ETH/WETH' : txCoinCategory === 'hex' ? 'HEX/eHEX' : txCoinCategory === 'pls_wpls' ? 'PLS/WPLS' : 'Bridged'}<span className="chip-x">&#x2715;</span></button>)}
                        <button onClick={() => { setTxTypeFilter('all'); setTxAssetFilter('all'); setTxChainFilter('all'); setTxYearFilter('all'); setTxCoinCategory('all'); }} style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', textDecoration: 'underline', marginLeft: 4 }}>Clear all</button>
                      </div>
                    )}
                    {/* ── Timeline ── */}
                    <div style={{ maxHeight: 700, overflowY: 'auto', padding: '14px 18px' }} className="custom-scrollbar">
                      {filteredTransactions.length === 0 ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
                          No activity found for these filters.
                        </div>
                      ) : Object.entries(groupByDate(filteredTransactions)).map(([date, items]) => {
                        const visibleItems = showHiddenTxs ? items : items.filter(tx => !hiddenTxIds.includes(tx.id));
                        if (visibleItems.length === 0) return null;
                        return (
                          <div key={date} className="bridge-timeline-date-group">
                            <div className="bridge-timeline-date-label">
                              <span>{date}</span>
                              <span className="bridge-timeline-date-count">{visibleItems.length}</span>
                            </div>
                            <div className="bridge-timeline-track">
                              {visibleItems.map((tx) => {
                                const matchedAsset = currentAssets.find(
                                  (a) => a.symbol.toUpperCase() === tx.asset.toUpperCase() && (txChainFilter === 'all' || a.chain === tx.chain),
                                );
                                const logo = matchedAsset
                                  ? (STATIC_LOGOS[(matchedAsset as any).address?.toLowerCase?.()] || (matchedAsset as any).logoUrl || tokenLogos[(matchedAsset as any).address?.toLowerCase?.()])
                                  : undefined;
                                const tokenTransactions = currentTransactions.filter(
                                  (eventTx) => eventTx.asset.toUpperCase() === tx.asset.toUpperCase() || (eventTx.counterAsset ?? '').toUpperCase() === tx.asset.toUpperCase(),
                                );

                                return (
                                  <BridgeTimelineEvent
                                    key={tx.id}
                                    tx={tx}
                                    matchedAsset={matchedAsset}
                                    logoUrl={logo}
                                    themeCardColor={t.card}
                                    hidden={hiddenTxIds.includes(tx.id)}
                                    isSelected={selectedBridgeTxId === tx.id}
                                    tokenTransactions={tokenTransactions}
                                    plsPriceUsd={prices['pulsechain']?.usd ?? 0}
                                    onSelect={(selectedTx, asset) => {
                                      setSelectedBridgeTxId((prev) => (prev === selectedTx.id ? null : selectedTx.id));
                                      if (asset) setPnlAsset(asset);
                                      else setTxAssetFilter(selectedTx.asset);
                                    }}
                                    onToggleHide={(id) => setHiddenTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {/* Hidden transactions bar */}
                      {hiddenTxIds.length > 0 && (
                        <div style={{ marginTop: 8, padding: '8px 0', borderTop: `1px solid ${t.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: t.textTertiary }}>{hiddenTxIds.length} hidden event{hiddenTxIds.length > 1 ? 's' : ''}</span>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowHiddenTxs(v => !v)} style={{ fontSize: 12, color: t.textSecondary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{showHiddenTxs ? 'Hide' : 'Show'}</button>
                            <button onClick={() => setHiddenTxIds([])} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
                          </div>
                        </div>
                      )}
                    </div>
                    </>)}
                  </div>
                </div>

                  </>);
                })()}
              </motion.div>
            )}

            {activeTab === 'stakes' && (
              <motion.div key="stakes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StakesSection
                  stakes={currentStakes}
                  hexUsdPrice={prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0}
                  phexUsdPrice={prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0}
                  ehexUsdPrice={prices['ethereum:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['hex']?.usd || 0}
                  walletAddresses={wallets.map(w => w.address)}
                  walletLabels={Object.fromEntries(wallets.filter(w => w.name).map(w => [w.address, w.name!]))}
                />
              </motion.div>
            )}


        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 2 }}>Bridge Activity</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Cross-chain activity &amp; performance tracking</div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="stat-grid-4">
              {[
                { label: 'Total Invested', val: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `$${Math.abs(summary.netInvestment).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—', sub: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? 'ETH + stablecoin inflows' : 'No ETH/stable inflows found', color: 'var(--fg)' },
                { label: 'Total P&L', val: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `${summary.unifiedPnl >= 0 ? '+' : ''}$${Math.abs(summary.unifiedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—', sub: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? `${summary.unifiedPnl >= 0 ? '+' : ''}${((summary.unifiedPnl / summary.netInvestment) * 100).toFixed(1)}% vs invested` : 'P&L % needs ETH/stable history', color: summary.netInvestment > MIN_INVESTMENT_THRESHOLD ? (summary.unifiedPnl >= 0 ? t.green : t.red) : 'var(--fg)' },
                { label: 'Realized P&L', val: `${summary.realizedPnl >= 0 ? '+' : ''}$${Math.abs(summary.realizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'Closed trade profit', color: summary.realizedPnl >= 0 ? t.green : t.red },
                { label: 'Unrealized P&L', val: `${summary.pnl24h >= 0 ? '+' : ''}$${Math.abs(summary.pnl24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "Today's portfolio change", color: summary.pnl24h >= 0 ? t.green : t.red },
              ].map(({ label, val, sub, color }) => (
                <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 2 }}>{val}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {/* Portfolio Performance */}
              {(() => {
                const now = Date.now();
                const cutoffs: Record<string, number> = { '1w': now - 7*24*3600*1000, '1m': now - 30*24*3600*1000, '1y': now - 365*24*3600*1000, 'all': 0 };
                const cutoff = cutoffs[perfPeriod];
                const realHistory = (wallets.length > 0 ? history : []).filter(p => p.timestamp >= cutoff);
                const currentVal = summary.totalValue || 1;
                const mockLast = MOCK_HISTORY[MOCK_HISTORY.length - 1]?.value || 1;
                const scale = currentVal / mockLast;
                const byBucket = new Map<string, { value: number; ts: number }>();
                realHistory.forEach(p => {
                  const key = perfPeriod === '1w' ? format(p.timestamp, 'yyyy-MM-dd HH') : format(p.timestamp, 'yyyy-MM-dd');
                  byBucket.set(key, { value: p.value, ts: p.timestamp });
                });
                const uniquePts = [...byBucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, { value, ts }]) => ({ day: fmtLabel(ts), value }));
                let histChartPoints: { day: string; value: number }[];
                if (uniquePts.length >= 3) {
                  histChartPoints = uniquePts;
                } else {
                  const mockCount = perfPeriod === '1w' ? 28 : perfPeriod === '1m' ? 30 : perfPeriod === '1y' ? 52 : 60;
                  histChartPoints = MOCK_HISTORY.slice(-mockCount).map(p => ({ day: fmtLabel(p.timestamp), value: p.value * scale }));
                  if (histChartPoints.length > 0) histChartPoints[histChartPoints.length - 1].value = currentVal;
                }
                const histPeriodLabel: Record<string, string> = { '1w': 'Week', '1m': 'Month', '1y': 'Year', 'all': 'All' };
                const histYMin = Math.min(...histChartPoints.map(p => p.value));
                const histYMax = Math.max(...histChartPoints.map(p => p.value));
                const histYPad = (histYMax - histYMin) * 0.1 || histYMax * 0.1;
                const fmtHistY = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;
                return (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 4px 10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 18, paddingRight: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Portfolio Performance</div>
                      <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
                        {(['1w','1m','1y','all'] as const).map(p => (
                          <button key={p} onClick={() => setPerfPeriod(p)}
                            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                              background: perfPeriod === p ? 'var(--accent)' : 'transparent',
                              color: perfPeriod === p ? (theme === 'dark' ? '#000' : '#fff') : 'var(--fg-subtle)' }}>
                            {histPeriodLabel[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart data={histChartPoints} margin={{ top: 4, right: 18, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="histColorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#7c8798', fontSize: 11 }} axisLine={{ stroke: '#222' }} tickLine={false} interval={Math.max(0, Math.floor(histChartPoints.length / 7) - 1)} />
                        <YAxis width={54} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#7c8798' }} tickFormatter={fmtHistY} domain={[histYMin - histYPad, histYMax + histYPad]} />
                        <RechartsTooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                          formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Portfolio Value']}
                          labelStyle={{ color: '#7c8798', marginBottom: 4 }} />
                        <Area type="monotone" dataKey="value" stroke="var(--accent)" fillOpacity={1} fill="url(#histColorValue)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

            </div>

            {/* Received Assets History */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div className="received-header" style={{ padding: '14px 18px', borderBottom: isCollapsed('received-assets') ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <ArrowDownLeft size={16} style={{ color: '#627EEA', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Received Token History</span>
                  <select value={receivedChainFilter} onChange={e => setReceivedChainFilter(e.target.value)}
                    className="history-filter-select"
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${t.border}`, borderRadius: 6, color: 'var(--fg)', fontSize: 13, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All Chains</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="base">Base</option>
                    <option value="pulsechain">PulseChain</option>
                  </select>
                  <select value={receivedCoinFilter} onChange={e => setReceivedCoinFilter(e.target.value)}
                    className="history-filter-select"
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${t.border}`, borderRadius: 6, color: 'var(--fg)', fontSize: 13, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All Coins</option>
                    <option value="ETH">ETH</option>
                    <option value="PLS">PLS</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div className="received-totals" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>Total Received</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>${receivedAssetsData.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{receivedAssetsData.list.length} tx</div>
                  </div>
                  <button onClick={() => toggleSection('received-assets')}
                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s', flexShrink: 0 }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                    title={isCollapsed('received-assets') ? 'Expand' : 'Collapse'}>
                    {isCollapsed('received-assets') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>
              {!isCollapsed('received-assets') && (<>
              {receivedAssetsData.list.length > 0 && (
                <div tabIndex={0} style={{ display: 'flex', gap: 1, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', overflowX: 'auto' }} className="custom-scrollbar">
                  {(Object.entries(receivedAssetsData.byAsset) as [string, { amount: number; valueUsd: number }][]).map(([sym, data]) => (
                    <div key={sym} style={{ flex: '1 0 100px', padding: '10px 16px', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 4, fontWeight: 700, letterSpacing: '.5px' }}>{sym}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
                        {sym === 'ETH' ? data.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {sym}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>${data.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ maxHeight: 480, overflowY: 'auto' }} className="custom-scrollbar">
                {receivedAssetsData.list.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                    {wallets.length === 0
                      ? 'Add wallets to see received assets history.'
                      : ['ethereum', 'base'].includes(receivedChainFilter) && !etherscanApiKey
                      ? <span>
                          No Ethereum/Base transactions loaded.{' '}
                          <button
                            onClick={() => { setApiKeyInput(''); setIsApiKeyModalOpen(true); }}
                            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, padding: 0 }}>
                            Add an Etherscan API key
                          </button>
                          {' '}for reliable ETH/Base history.
                        </span>
                      : 'No ETH or stablecoin inbound transfers found since 2021.'}
                  </div>
                ) : receivedAssetsData.list.map((tx) => {
                  const assetUp = tx.asset.toUpperCase();
                  const isEth = assetUp === 'ETH';
                  const isPls = assetUp === 'PLS';
                  const displayUsd = tx.valueUsd || (
                    isEth ? tx.amount * (prices['ethereum']?.usd || 3400) :
                    isPls ? tx.amount * (prices['pulsechain']?.usd || 0.00005) :
                    assetUp.includes('USDT') || assetUp.includes('TETHER') ? tx.amount * (prices['tether']?.usd || 1) :
                    assetUp.includes('DAI') ? tx.amount * (prices['dai']?.usd || 1) :
                    tx.amount * (prices['usd-coin']?.usd || 1)
                  );
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8,
                          background: tx.chain === 'pulsechain' ? 'rgba(247,57,255,.08)' : isEth ? 'rgba(99,102,241,.1)' : 'rgba(0,82,255,.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ArrowDownLeft size={15} style={{ color: tx.chain === 'pulsechain' ? '#f739ff' : isEth ? '#627EEA' : '#60a5fa' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                            +{(isEth || isPls) ? tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tx.asset}
                            <span style={{ fontSize: 13, marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                              background: tx.chain === 'pulsechain' ? 'rgba(247,57,255,.1)' : tx.chain === 'ethereum' ? 'rgba(99,102,241,.12)' : 'rgba(0,82,255,.12)',
                              color: tx.chain === 'pulsechain' ? '#f739ff' : tx.chain === 'ethereum' ? '#818cf8' : '#60a5fa' }}>
                              {tx.chain === 'pulsechain' ? 'PLS' : tx.chain === 'ethereum' ? 'ETH' : 'BASE'}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'monospace', marginTop: 1 }}>
                            {format(new Date(tx.timestamp), 'MMM d, yyyy')} · {tx.from.slice(0, 6)}…{tx.from.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>${displayUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <a href={`${tx.chain === 'pulsechain' ? 'https://scan.pulsechain.com' : tx.chain === 'ethereum' ? 'https://etherscan.io' : 'https://basescan.org'}/tx/${tx.hash}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'none', fontFamily: 'monospace' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#627EEA')}
                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                          {tx.hash.slice(0, 10)}…
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>)}
            </div>

            {/* ── TOKEN P&L SUMMARY CARD — shown when a specific asset filter is active ── */}
            {txAssetFilter !== 'all' && (() => {
              const filteredAsset = currentAssets.find(a =>
                a.symbol.toUpperCase() === txAssetFilter.toUpperCase()
              );
              const tokenPrice = filteredAsset?.price ?? 0;
              const plsPrice   = prices['pulsechain']?.usd ?? 0;
              const logoUrl    = filteredAsset ? getTokenLogoUrl(filteredAsset) : undefined;
              // Collect ALL transactions for this symbol across type filters so the card
              // always shows the full picture regardless of txTypeFilter
              const allTokenTxs = currentTransactions.filter(tx =>
                tx.asset.toUpperCase() === txAssetFilter.toUpperCase() ||
                (tx.counterAsset ?? '').toUpperCase() === txAssetFilter.toUpperCase()
              );
              return (
                <>
                  {/* "Filtering by X" banner — PLSFolio style */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)',
                  }}>
                    {logoUrl && (
                      <img src={logoUrl} alt={txAssetFilter}
                        style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                      Filtering by <span style={{ color: '#a78bfa' }}>{txAssetFilter}</span>
                    </span>
                    {filteredAsset && (
                      <span style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 4 }}>
                        · {filteredAsset.chain === 'pulsechain' ? 'PulseChain' : filteredAsset.chain === 'ethereum' ? 'Ethereum' : 'Base'}
                        · ${tokenPrice < 0.001 ? tokenPrice.toExponential(2) : tokenPrice < 1 ? tokenPrice.toFixed(6) : tokenPrice.toFixed(2)} per token
                      </span>
                    )}
                    <button
                      onClick={() => setTxAssetFilter('all')}
                      style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)',
                        color: '#a78bfa', transition: 'all .12s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.22)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.12)'; }}>
                      Clear filter <X size={11} />
                    </button>
                  </div>
                  <TokenPnLCard
                    symbol={txAssetFilter}
                    transactions={allTokenTxs}
                    asset={filteredAsset}
                    priceUsd={tokenPrice}
                    plsPriceUsd={plsPrice}
                    logoUrl={logoUrl}
                  />
                </>
              );
            })()}


            {/* ── PLS Flow Summary (merged from former tracker tab) ── */}
            {plsSwapData.rows.length > 0 && (
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: isCollapsed('history-pls') ? 'none' : `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>PLS Flow</div>
                    <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>Net PLS movement across all wallets</div>
                  </div>
                  <button onClick={() => toggleSection('history-pls')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: t.textTertiary }} onMouseOver={e => (e.currentTarget.style.color = t.text)} onMouseOut={e => (e.currentTarget.style.color = t.textMuted)}>
                    {isCollapsed('history-pls') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
                {!isCollapsed('history-pls') && (
                  <div className="stat-grid-4" style={{ padding: '12px 18px' }}>
                    {[
                      { label: 'PLS Received', val: plsSwapData.totalReceived >= 1e6 ? `${(plsSwapData.totalReceived/1e6).toFixed(2)}M` : plsSwapData.totalReceived.toLocaleString(undefined,{maximumFractionDigits:0}), sub: 'Total inflow', color: t.green },
                      { label: 'PLS Spent', val: plsSwapData.totalSpent >= 1e6 ? `${(plsSwapData.totalSpent/1e6).toFixed(2)}M` : plsSwapData.totalSpent.toLocaleString(undefined,{maximumFractionDigits:0}), sub: 'Total outflow', color: t.red },
                      { label: 'Net PLS', val: `${plsSwapData.totalNet >= 0 ? '+' : ''}${Math.abs(plsSwapData.totalNet) >= 1e6 ? (plsSwapData.totalNet/1e6).toFixed(2)+'M' : plsSwapData.totalNet.toLocaleString(undefined,{maximumFractionDigits:0})}`, sub: 'Net balance', color: plsSwapData.totalNet >= 0 ? t.green : t.red },
                      { label: 'Net USD', val: `${plsSwapData.netUsd >= 0 ? '+' : ''}$${Math.abs(plsSwapData.netUsd).toLocaleString(undefined,{maximumFractionDigits:0})}`, sub: `@ $${(plsSwapData.plsPrice||0).toFixed(6)}/PLS`, color: plsSwapData.netUsd >= 0 ? t.green : t.red },
                    ].map(({ label, val, sub, color }) => (
                      <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}


        {activeTab === 'wallets' && (() => {
          const isAll = selectedWalletAddr === 'all';
          const selWallet = wallets.find(w => w.address.toLowerCase() === selectedWalletAddr);

          const viewAssets = isAll
            ? currentAssets
            : (walletAssets[selectedWalletAddr] || []).filter(a => !hiddenTokens.includes(a.id) && !(a as any).isSpam);

          const viewStakes = isAll
            ? currentStakes
            : currentStakes.filter(s => s.walletAddress === selectedWalletAddr);

          const filteredViewAssets = walletChainFilter === 'all' ? viewAssets : viewAssets.filter(a => a.chain === walletChainFilter);

          const walletUsdValue = viewAssets.reduce((s, a) => s + a.value, 0);
          // Recalculate staking value from first principles using live prices + accrued yield
          // (principal + interest earned so far), keeping this consistent with summary.stakingValueUsd
          // and the Overview HEX Holdings section. Using full maturity yield here would make the
          // Wallets total vastly higher than the Overview total for long-running stakes.
          const stakingUsdValue = viewStakes.reduce((s, st) => {
            const hexPriceKey = `${st.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
            const chainHexFallback = st.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd;
            const hexPrice = prices[hexPriceKey]?.usd || chainHexFallback || 0;
            const stakedHex = st.stakedHex ?? Number(st.stakedHearts ?? 0n) / 1e8;
            const tShares = st.tShares ?? Number(st.stakeShares ?? 0n) / 1e12;
            const daysStaked = Math.max(0, (st.stakedDays ?? 0) - (st.daysRemaining ?? 0));
            const rate = st.chain === 'pulsechain' ? PHEX_YIELD_PER_TSHARE : EHEX_YIELD_PER_TSHARE;
            const accruedHex = stakedHex + tShares * daysStaked * rate;
            return s + accruedHex * hexPrice;
          }, 0);
          const totalUsdValue = walletUsdValue + stakingUsdValue;

          // pHEX / eHEX totals (matching overview hero)
          const HEX_A = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
          const walletPHex = viewAssets
            .filter(a => a.chain === 'pulsechain' && (a as any).address?.toLowerCase() === HEX_A)
            .reduce((s, a) => s + a.balance, 0)
            + viewStakes.filter(s => s.chain === 'pulsechain').reduce((s, st) => s + (st.stakedHex ?? 0), 0);
          const walletEHex = viewAssets
            .filter(a => (a.chain === 'ethereum' && (a as any).address?.toLowerCase() === HEX_A) || (a.chain === 'pulsechain' && a.symbol === 'eHEX'))
            .reduce((s, a) => s + a.balance, 0)
            + viewStakes.filter(s => s.chain === 'ethereum').reduce((s, st) => s + (st.stakedHex ?? 0), 0);
          const fmtHexCount = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : Math.round(n).toLocaleString('en-US');

          return (
            <motion.div key="wallets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* ── Visual Wallet Selector ── */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
                {/* All Wallets card */}
                <button
                  onClick={() => setSelectedWalletAddr('all')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid',
                    transition: 'all .15s', textAlign: 'left', minWidth: 120,
                    background: isAll ? 'rgba(0,255,159,0.10)' : 'var(--bg-elevated)',
                    borderColor: isAll ? 'rgba(0,255,159,0.35)' : 'var(--border)',
                    boxShadow: isAll ? '0 0 0 1px rgba(0,255,159,0.15)' : 'none',
                  }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: isAll ? 'var(--accent-dim)' : 'var(--bg-surface)',
                    border: `1.5px solid ${isAll ? 'var(--accent-border)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>🗂️</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isAll ? 'var(--accent)' : 'var(--fg)', letterSpacing: '-0.01em' }}>All Wallets</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1 }}>
                      {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>

                {/* Per-wallet cards */}
                {wallets.map((w, wIdx) => {
                  const isActive = selectedWalletAddr === w.address.toLowerCase();
                  const walletDotColors = ['#00FF9F','#f739ff','#627EEA','#f97316','#a855f7','#f59e0b','#06b6d4','#ec4899'];
                  const dotColor = walletDotColors[wIdx % walletDotColors.length];
                  const shortAddr = `${w.address.slice(0,6)}…${w.address.slice(-4)}`;
                  const wAssets = walletAssets[w.address.toLowerCase()] || [];
                  const wVal = wAssets.reduce((s: number, a: any) => s + (a.value || 0), 0);
                  return (
                    <button key={w.address} onClick={() => setSelectedWalletAddr(w.address.toLowerCase())}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid',
                        transition: 'all .15s', textAlign: 'left', minWidth: 140,
                        background: isActive ? `${dotColor}18` : 'var(--bg-elevated)',
                        borderColor: isActive ? `${dotColor}55` : 'var(--border)',
                        boxShadow: isActive ? `0 0 0 1px ${dotColor}22, 0 2px 10px ${dotColor}14` : 'none',
                      }}
                      onMouseOver={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
                      onMouseOut={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}>
                      {/* Avatar — larger dot */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${dotColor}22`, border: `2px solid ${dotColor}66`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: dotColor,
                        boxShadow: isActive ? `0 0 10px ${dotColor}44` : 'none',
                        transition: 'box-shadow .15s',
                      }}>
                        {w.name ? w.name[0].toUpperCase() : shortAddr[2].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? dotColor : 'var(--fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                          {w.name || shortAddr}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                          {wVal > 0 ? `$${wVal >= 1000 ? `${(wVal/1000).toFixed(1)}K` : wVal.toFixed(0)}` : shortAddr}
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginLeft: 'auto', boxShadow: `0 0 8px ${dotColor}` }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hero card */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: '24px', border: '1px solid var(--accent-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8 }}>{isAll ? 'All Wallets' : selWallet?.name}</div>
                {!isAll && <div style={{ fontSize: 13, color: 'var(--fg-subtle)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>{selWallet?.address}</div>}
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--fg)', marginBottom: 16 }}>
                  ${totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className="wallet-stat-pill-green">
                    Wallet ${walletUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ background: 'rgba(239,68,68,0.12)', color: t.red, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid rgba(239,68,68,0.20)' }}>
                    Staking ${stakingUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {/* pHEX / eHEX totals — matches Overview hero */}
                {(walletPHex > 0 || walletEHex > 0) && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    {walletPHex > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        pHEX: <span style={{ color: '#fb923c', fontWeight: 700 }}>{fmtHexCount(walletPHex)}</span>
                      </span>
                    )}
                    {walletEHex > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        eHEX: <span style={{ color: '#627EEA', fontWeight: 700 }}>{fmtHexCount(walletEHex)}</span>
                      </span>
                    )}
                  </div>
                )}
                {/* Chain filter chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'pulsechain', 'ethereum', 'base'] as const).map(c => (
                    <button key={c} onClick={() => setWalletChainFilter(c)}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .12s',
                        background: walletChainFilter === c ? 'var(--fg)' : 'transparent',
                        color: walletChainFilter === c ? 'var(--bg-surface)' : 'var(--fg-muted)',
                        borderColor: walletChainFilter === c ? 'var(--fg)' : 'var(--border)' }}>
                      {c === 'all' ? 'All' : c === 'pulsechain' ? 'PulseChain' : c === 'ethereum' ? 'Ethereum' : 'Base'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset list — full Token Positions module */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: isCollapsed('wallet-holdings') ? 'none' : `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Holdings</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{filteredViewAssets.length} tokens · ${walletUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', border: `1px solid ${t.border}`, borderRadius: 8, padding: 3 }}>
                      {([['1h','1H'],['6h','6H'],['24h','24H'],['7d','7D']] as const).map(([p, label]) => (
                        <button key={p} onClick={() => setPriceChangePeriod(p)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', border: 'none',
                            background: priceChangePeriod === p ? 'var(--accent)' : 'transparent',
                            color: priceChangePeriod === p ? (theme === 'dark' ? '#000' : '#fff') : 'var(--fg-subtle)' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => toggleSection('wallet-holdings')}
                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                      title={isCollapsed('wallet-holdings') ? 'Expand' : 'Collapse'}>
                      {isCollapsed('wallet-holdings') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                </div>
                {!isCollapsed('wallet-holdings') && (<>
                <div className="data-table-scroll">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {[
                          { label: 'Token', field: null, align: 'left' },
                          { label: 'Price', field: null, align: 'right' },
                          { label: priceChangePeriod.toUpperCase(), field: 'change', align: 'right' },
                          { label: 'Amount', field: null, align: 'right' },
                          { label: 'Value', field: 'value', align: 'right' },
                          { label: '% of Portfolio', field: null, align: 'right' },
                          { label: '', field: null, align: 'right' },
                        ].map(({ label, field, align }, i) => (
                          <th key={i} onClick={field ? () => {
                            if (assetSortField === field) setAssetSortDir(d => d === 'desc' ? 'asc' : 'desc');
                            else { setAssetSortField(field as any); setAssetSortDir('desc'); }
                          } : undefined}
                            style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600,
                              color: assetSortField === field ? t.green : 'var(--fg-muted)',
                              textTransform: 'uppercase', letterSpacing: '.5px',
                              textAlign: align as any, whiteSpace: 'nowrap', background: 'var(--bg-surface)',
                              cursor: field ? 'pointer' : 'default', userSelect: 'none' }}>
                            {label}{field && assetSortField === field ? (assetSortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredViewAssets.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 13 }}>
                            No holdings found for this wallet
                          </td>
                        </tr>
                      ) : (
                        [...filteredViewAssets].sort((a, b) => {
                          const getVal = (x: any) => assetSortField === 'change'
                            ? (priceChangePeriod === '1h' ? (x.priceChange1h ?? 0)
                              : priceChangePeriod === '7d' ? (x.priceChange7d ?? 0)
                              : (x.priceChange24h ?? x.pnl24h ?? 0))
                            : x.value;
                          const diff = getVal(b) - getVal(a);
                          return assetSortDir === 'desc' ? diff : -diff;
                        }).map((asset) => {
                          const pct = priceChangePeriod === '1h' ? (asset.priceChange1h ?? 0)
                            : priceChangePeriod === '7d' ? (asset.priceChange7d ?? 0)
                            : priceChangePeriod === '6h' ? 0
                            : (asset.priceChange24h ?? asset.pnl24h ?? 0);
                          const share = ((asset.value / (walletUsdValue || 1)) * 100);
                          const addr = (asset as any).address;
                          const logo = STATIC_LOGOS[(asset as any).address?.toLowerCase?.()]
                            || (asset as any).logoUrl
                            || tokenLogos[(asset as any).address?.toLowerCase?.()]
                            || getTokenLogoUrl(asset);
                          const explUrl = explorerUrl(asset.chain, addr);
                          const dsUrl = dexScreenerUrl(asset.chain, addr);
                          return (
                            <React.Fragment key={asset.id}>
                            <tr
                              style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s', cursor: 'pointer' }}
                              onClick={() => setExpandedWalletAssetIds(prev => { const n = new Set(prev); n.has(asset.id) ? n.delete(asset.id) : n.add(asset.id); return n; })}
                              onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--fg)', flexShrink: 0, overflow: 'hidden' }}>
                                    {logo ? <img src={logo} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} /> : null}
                                    <span hidden={!!logo}>{asset.symbol[0]}</span>
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      {explUrl
                                        ? <a href={explUrl} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }}
                                            onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                                            onMouseOut={e => (e.currentTarget.style.color = 'var(--fg)')}>
                                            {asset.symbol}
                                          </a>
                                        : <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{asset.symbol}</span>}
                                      {addr && addr !== 'native' && (
                                        <button onClick={() => navigator.clipboard.writeText(addr)}
                                          title={`Copy contract address: ${addr}`}
                                          style={{ padding: '1px 3px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s', lineHeight: 1 }}
                                          onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
                                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                          <Copy size={10} />
                                        </button>
                                      )}
                                      {dsUrl && addr !== 'native' && (
                                        <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                                          title="View on DexScreener"
                                          style={{ padding: '1px 3px', color: 'var(--fg-subtle)', transition: 'color .12s', lineHeight: 1, display: 'inline-flex' }}
                                          onMouseOver={e => (e.currentTarget.style.color = '#f4c542')}
                                          onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                          <ExternalLink size={10} />
                                        </a>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555' }} />
                                      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{asset.chain}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <PriceDisplay price={asset.price} className="" />
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap',
                                fontSize: 13, fontWeight: 600, color: pct >= 0 ? t.green : t.red }}>
                                {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                                  {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{asset.symbol}</div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
                                  ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 90 }}>
                                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 3 }}>{share.toFixed(1)}%</div>
                                <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                                  <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: 'var(--accent)', borderRadius: 1 }} />
                                </div>
                              </td>
                              <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                  <button
                                    onClick={e => { e.stopPropagation(); setPnlAsset(pnlAsset?.id === asset.id ? null : asset); }}
                                    title="View P&L"
                                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .12s',
                                      color: pnlAsset?.id === asset.id ? '#a78bfa' : '#555' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                                    onMouseOut={e => (e.currentTarget.style.color = pnlAsset?.id === asset.id ? '#a78bfa' : '#555')}>
                                    <Calculator size={13} />
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); setHiddenTokens([...hiddenTokens, asset.id]); }}
                                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                                    title="Hide">
                                    <Trash2 size={13} />
                                  </button>
                                  <span style={{ color: expandedWalletAssetIds.has(asset.id) ? t.green : 'var(--fg-subtle)', padding: 4, display: 'inline-flex', transition: 'color .12s' }}>
                                    {expandedWalletAssetIds.has(asset.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {/* Expanded wallet asset row */}
                            {expandedWalletAssetIds.has(asset.id) && (() => {
                              const plsPrice = prices['pulsechain']?.usd || 0.00005;
                              const wPriceInPls = plsPrice > 0 ? asset.price / plsPrice : 0;
                              const wCurrentPlsValue = asset.value / plsPrice;
                              const wEntryPls = manualEntries[asset.id];
                              const wPnlPls = wEntryPls ? wCurrentPlsValue - wEntryPls : null;
                              return (
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                  <td colSpan={7} style={{ padding: '0 16px 14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, paddingTop: 12 }}>
                                      {/* Price card */}
                                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Price</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}><PriceDisplay price={asset.price} /></div>
                                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
                                          {wPriceInPls > 0 ? `${wPriceInPls >= 1000 ? `${(wPriceInPls/1000).toFixed(2)}K` : wPriceInPls.toFixed(4)} PLS` : ''}
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: pct >= 0 ? t.green : t.red, marginTop: 4 }}>
                                          {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% (24h)
                                        </div>
                                      </div>
                                      {/* Holdings card */}
                                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Your Holdings</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
                                          {asset.balance >= 1e6 ? `${(asset.balance/1e6).toFixed(2)}M` : asset.balance >= 1e3 ? `${(asset.balance/1e3).toFixed(2)}K` : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.symbol}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                        {wCurrentPlsValue > 0 && <div style={{ fontSize: 12, color: '#f739ff', marginTop: 2 }}>{wCurrentPlsValue >= 1e6 ? `${(wCurrentPlsValue/1e6).toFixed(2)}M` : wCurrentPlsValue >= 1e3 ? `${(wCurrentPlsValue/1e3).toFixed(2)}K` : wCurrentPlsValue.toFixed(0)} PLS</div>}
                                      </div>
                                      {/* P&L card */}
                                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span>P&amp;L (PLS basis)</span>
                                          {wEntryPls && (
                                            <button onClick={e => { e.stopPropagation(); setManualEntries(prev => { const n = { ...prev }; delete n[asset.id]; return n; }); }}
                                              title="Clear entry"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 2, display: 'flex', alignItems: 'center', transition: 'color .12s' }}
                                              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                              onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}>
                                              <X size={13} />
                                            </button>
                                          )}
                                        </div>
                                        {wEntryPls ? (
                                          <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Entry</span>
                                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>{wEntryPls.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Now</span>
                                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{wCurrentPlsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-subtle)' }}>Net P&L</span>
                                              <span style={{ fontSize: 14, fontWeight: 800, color: wPnlPls !== null && wPnlPls >= 0 ? t.green : t.red }}>
                                                {wPnlPls !== null ? `${wPnlPls >= 0 ? '+' : ''}${wPnlPls.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS` : '—'}
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <div>
                                            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 8 }}>Set entry to track P&L</div>
                                            <input type="number" placeholder="Entry PLS amount"
                                              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 12, padding: '5px 8px', outline: 'none' }}
                                              onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setManualEntries(prev => ({ ...prev, [asset.id]: v })); }} />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                     {/* ── Transactions & Realized P&L for this token ── */}
                                     {(() => {
                                       const sym = asset.symbol.toUpperCase();
                                       const tokenTxs = currentTransactions.filter(tx =>
                                         tx.asset.toUpperCase() === sym && tx.chain === asset.chain
                                       );
                                       if (tokenTxs.length === 0) return null;
                                       let totalBoughtAmt = 0, totalSoldAmt = 0, totalCostUsd = 0, totalProceedsUsd = 0;
                                       tokenTxs.forEach(tx => {
                                         const isBuyTx = tx.type === 'deposit' || (tx.type === 'swap' && tx.counterAsset !== asset.symbol);
                                         if (isBuyTx) { totalBoughtAmt += tx.amount; totalCostUsd += tx.valueUsd || 0; }
                                         else { totalSoldAmt += tx.amount; totalProceedsUsd += tx.valueUsd || 0; }
                                       });
                                       const realizedPnlTok = totalProceedsUsd - totalCostUsd;
                                       const previewTxs = tokenTxs.slice(0, 8);
                                       return (
                                         <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                           <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px' }}>Transactions &amp; P&amp;L</span>
                                             <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 20, border: '1px solid var(--border)' }}>{tokenTxs.length}</span>
                                           </div>
                                           <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                             <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                                               <span style={{ color: 'var(--fg-subtle)' }}>Bought </span>
                                               <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{totalBoughtAmt >= 1e6 ? `${(totalBoughtAmt/1e6).toFixed(2)}M` : totalBoughtAmt >= 1e3 ? `${(totalBoughtAmt/1e3).toFixed(2)}K` : totalBoughtAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sym}</span>
                                               {totalCostUsd > 0 && <span style={{ color: 'var(--fg-subtle)', marginLeft: 4 }}>(${totalCostUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>}
                                             </div>
                                             <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                                               <span style={{ color: 'var(--fg-subtle)' }}>Sold </span>
                                               <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{totalSoldAmt >= 1e6 ? `${(totalSoldAmt/1e6).toFixed(2)}M` : totalSoldAmt >= 1e3 ? `${(totalSoldAmt/1e3).toFixed(2)}K` : totalSoldAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sym}</span>
                                               {totalProceedsUsd > 0 && <span style={{ color: 'var(--fg-subtle)', marginLeft: 4 }}>(${totalProceedsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>}
                                             </div>
                                             {(totalCostUsd > 0 || totalProceedsUsd > 0) && (
                                               <div style={{ background: realizedPnlTok >= 0 ? 'rgba(0,255,159,.1)' : 'rgba(244,63,94,.1)', border: `1px solid ${realizedPnlTok >= 0 ? 'rgba(0,255,159,.25)' : 'rgba(244,63,94,.25)'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                                                 <span style={{ color: 'var(--fg-subtle)' }}>Realized P&amp;L </span>
                                                 <span style={{ fontWeight: 800, color: realizedPnlTok >= 0 ? t.green : t.red }}>{realizedPnlTok >= 0 ? '+' : ''}${realizedPnlTok.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                               </div>
                                             )}
                                           </div>
                                           {/* Unified tx-card list replaces old mini table */}
                                           <TransactionList
                                             transactions={previewTxs}
                                             viewAsYou={viewAsYou}
                                             wallets={wallets}
                                             compact
                                             assets={currentAssets}
                                             getTokenLogoUrl={getTokenLogoUrl}
                                             tokenLogos={tokenLogos}
                                             onFilterByAsset={symbol => { setTxAssetFilter(symbol); setActiveTab('assets'); }}
                                             emptyMessage="No transactions for this token."
                                           />
                                           {tokenTxs.length > 8 && (
                                             <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: 'var(--fg-subtle)' }}>
                                               +{tokenTxs.length - 8} more &mdash;{' '}
                                               <button onClick={e => { e.stopPropagation(); setTxAssetFilter(asset.symbol); setActiveTab('assets'); }}
                                                 style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                                                 view all in Holdings
                                               </button>
                                             </div>
                                           )}
                                         </div>
                                       );
                                     })()}
                                  </td>
                                </tr>
                              );
                            })()}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                    {filteredViewAssets.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop: '1px solid var(--border)' }}>
                          <td colSpan={4} style={{ padding: '10px 16px', fontSize: 13, color: 'var(--fg-muted)', fontWeight: 600 }}>TOTAL LIQUID</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                            ${walletUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                </>)}
              </div>



              {/* ── WALLET TRANSACTIONS ── */}
              {(() => {
                const baseTxs = isAll
                  ? currentTransactions
                  : currentTransactions.filter(tx => tx.from?.toLowerCase() === selectedWalletAddr || tx.to?.toLowerCase() === selectedWalletAddr);
                const filtered = baseTxs.filter(tx => {
                  if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
                  if (walletChainFilter !== 'all' && tx.chain !== walletChainFilter) return false;
                  if (txAssetFilter !== 'all' && tx.asset !== txAssetFilter) return false;
                  return true;
                });
                if (baseTxs.length === 0) return null;
                return (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('wallet-txs') ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Transactions</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                          {baseTxs.length} txs
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isCollapsed('wallet-txs') && [
                          { value: txTypeFilter, onChange: setTxTypeFilter, options: [['all','All Types'],['deposit','Received'],['withdraw','Sent'],['swap','Swaps']] as [string,string][] },
                          { value: txAssetFilter, onChange: setTxAssetFilter, options: [['all','All Tokens'], ...Array.from(new Set(baseTxs.map(tx => tx.asset))).sort().map(a => [a,a])] as [string,string][] },
                        ].map(({ value, onChange, options }, i) => (
                          <select key={i} value={value} onChange={e => onChange(e.target.value)}
                            className="history-filter-select"
                            style={{ background: 'var(--bg-elevated)', border: `1px solid ${t.border}`, borderRadius: 6, color: 'var(--fg)', fontSize: 13, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        ))}
                        <button onClick={() => toggleSection('wallet-txs')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')} onMouseOut={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                          title={isCollapsed('wallet-txs') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('wallet-txs') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>
                    {!isCollapsed('wallet-txs') && (
                      <div style={{ maxHeight: 520, overflowY: 'auto' }} className="custom-scrollbar">
                        <TransactionList
                          transactions={filtered}
                          viewAsYou={viewAsYou}
                          wallets={wallets}
                          compact
                          assets={currentAssets}
                          getTokenLogoUrl={getTokenLogoUrl}
                          tokenLogos={tokenLogos}
                          hideIds={hiddenTxIds}
                          onToggleHide={id => setHiddenTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                          showHidden={showHiddenTxs}
                          onFilterByAsset={symbol => setTxAssetFilter(symbol)}
                          emptyMessage="No transactions found for these filters."
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          );
        })()}

              </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="border-t border-white/5 py-6 px-8 text-center text-white/20 text-xs font-medium uppercase tracking-[0.2em]">
            PulsePort &copy; 2026 &bull; Powered by PulseChain, Ethereum &amp; Base
          </footer>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav bottom-nav-blur md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--bg-header)',
          borderTop: '1px solid var(--border)',
        }}>
        <div className="mobile-bottom-nav-inner">
        {([
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'assets',   label: 'Holdings',           icon: Coins },
          { id: 'stakes',   label: 'HEX Stakes',         icon: Lock },
          { id: 'defi',     label: 'DeFi Positions',     icon: Droplets },
          { id: 'history',  label: 'Bridge Activity',       icon: History },
          { id: 'wallets',  label: 'Wallets',  icon: WalletIcon },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="mobile-nav-tab-btn"
            style={{
              color: activeTab === id ? 'var(--accent)' : 'var(--fg-muted)',
            }}>
            <div className={activeTab === id ? 'bottom-nav-dot' : ''}>
              <Icon size={19} />
            </div>
            <span style={{ fontSize: 9, fontWeight: activeTab === id ? 700 : 500, lineHeight: 1, marginTop: 3 }}>{label}</span>
          </button>
        ))}
        </div>
      </nav>

      {/* Add Wallet Modal */}
      <AnimatePresence>
        {isAddingWallet && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingWallet(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 90 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 480,
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: '20px 20px 0 0', padding: 28,
              }}
              className="sm:rounded-[20px]"
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 20 }}>Add New Wallet</h2>
              <div className="space-y-4">
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                    Wallet Address
                  </label>
                  <input 
                    type="text" 
                    placeholder="0x..."
                    inputMode="text"
                    value={newWalletAddress}
                    onChange={(e) => {
                      setNewWalletAddress(e.target.value);
                      if (walletFormError) setWalletFormError('');
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') addWallet(); }}
                    style={{ width: '100%', background: t.cardHigh, border: `1px solid ${t.border}`,
                      borderRadius: 10, color: t.text, fontSize: 14, padding: '11px 14px',
                      outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', transition: 'border-color .15s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = t.border)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                    Wallet Name <span style={{ color: t.textMuted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="My Main Wallet"
                    value={newWalletName}
                    onChange={(e) => {
                      setNewWalletName(e.target.value);
                      if (walletFormError) setWalletFormError('');
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') addWallet(); }}
                    style={{ width: '100%', background: t.cardHigh, border: `1px solid ${t.border}`,
                      borderRadius: 10, color: t.text, fontSize: 14, padding: '11px 14px',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = t.border)}
                  />
                </div>
                <div style={{ fontSize: 12, color: walletFormError ? 'var(--negative)' : t.textMuted, minHeight: 18 }}>
                  {walletFormError || 'Tip: Wallets are read-only. PulsePort never requests private keys.'}
                </div>
                <div style={{ paddingTop: 8, display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => {
                      setIsAddingWallet(false);
                      setWalletFormError('');
                    }}
                    style={{ flex: 1, minHeight: 44, borderRadius: 10, background: t.cardHigh,
                      border: `1px solid ${t.border}`, color: t.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addWallet}
                    disabled={!newWalletAddress.trim()}
                    style={{ flex: 1, minHeight: 44, borderRadius: 10, background: newWalletAddress.trim() ? 'var(--accent)' : 'var(--border)',
                      border: 'none', color: newWalletAddress.trim() ? '#000' : 'var(--fg-subtle)', fontWeight: 700, fontSize: 13, cursor: newWalletAddress.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    Add Wallet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Wallet Modal */}
      <AnimatePresence>
        {editingWalletAddress && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingWalletAddress(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 90 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 480,
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: '20px 20px 0 0', padding: 24,
              }}
              className="sm:rounded-[20px]"
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Pencil size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Rename Wallet</span>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: 'monospace', marginBottom: 16, padding: '6px 10px', background: t.cardHigh, borderRadius: 6 }}>
                {editingWalletAddress}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={editWalletName}
                  onChange={e => setEditWalletName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameWallet(editingWalletAddress, editWalletName); }}
                  autoFocus
                  style={{ width: '100%', background: t.cardHigh, border: `1px solid ${t.border}`,
                    borderRadius: 10, color: t.text, fontSize: 14, padding: '11px 14px',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = t.border)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditingWalletAddress(null)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: t.cardHigh,
                    border: `1px solid ${t.border}`, color: t.text, fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44 }}>
                  Cancel
                </button>
                <button onClick={() => renameWallet(editingWalletAddress, editWalletName)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--accent)',
                    border: 'none', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 44 }}>
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── P&L Modal ── */}
      {pnlAsset && (
        <PnLModal
          asset={pnlAsset}
          transactions={currentTransactions}
          prices={prices}
          logoUrl={STATIC_LOGOS[(pnlAsset as any).address?.toLowerCase?.()] || (pnlAsset as any).logoUrl || tokenLogos[(pnlAsset as any).address?.toLowerCase?.()] || getTokenLogoUrl(pnlAsset)}
          onClose={() => setPnlAsset(null)}
          walletAddress={selectedWalletAddr !== 'all' ? selectedWalletAddr : undefined}
        />
      )}

      {/* ── Token Card Detail Modal ── */}
      {tokenCardModal && (
        <TokenCardModal
          asset={tokenCardModal}
          portfolioTotal={summary.totalValue}
          logoUrl={STATIC_LOGOS[(tokenCardModal as any).address?.toLowerCase?.()] || (tokenCardModal as any).logoUrl || tokenLogos[(tokenCardModal as any).address?.toLowerCase?.()] || getTokenLogoUrl(tokenCardModal)}
          marketData={tokenMarketData[tokenCardModal.id]}
          isLoadingMarketData={tokenCardModalLoading}
          theme={theme}
          onClose={() => setTokenCardModal(null)}
          dexScreenerUrl={dexScreenerUrl(tokenCardModal.chain, (tokenCardModal as any).address)}
          explorerUrl={explorerUrl(tokenCardModal.chain, (tokenCardModal as any).address)}
        />
      )}

      {/* ── Market Watch Modal ── */}
      {showMarketWatch && (
        <MarketWatchModal
          theme={theme}
          onClose={() => setShowMarketWatch(false)}
        />
      )}

      {/* ── Profit Planner Modal ── */}
      {profitPlannerOpen && (
        <ProfitPlannerModal
          open={profitPlannerOpen}
          onClose={() => setProfitPlannerOpen(false)}
          assets={currentAssets}
          totalValue={summary?.totalValue ?? 0}
        />
      )}

      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsApiKeyModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Settings size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>API Keys</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                One key covers both Ethereum and Base.<br/>
                Get yours free at <span style={{ color: '#627EEA' }}>etherscan.io/myapikey</span>
              </p>
              <input type="text" placeholder="Paste your Etherscan API key..."
                value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: `1px solid ${t.border}`, borderRadius: 8,
                  color: 'var(--fg)', fontSize: 13, padding: '10px 14px', outline: 'none',
                  fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setIsApiKeyModalOpen(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--border)',
                    border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => {
                  const ethKey = apiKeyInput.trim();
                  const baseKey = basescanApiKeyInput.trim();
                  setEtherscanApiKey(ethKey);
                  setBasescanApiKey(baseKey);
                  if (ethKey) localStorage.setItem('pulseport_etherscan_key', ethKey);
                  else localStorage.removeItem('pulseport_etherscan_key');
                  if (baseKey) localStorage.setItem('pulseport_basescan_key', baseKey);
                  else localStorage.removeItem('pulseport_basescan_key');
                  setIsApiKeyModalOpen(false);
                  setTimeout(fetchPortfolio, 100);
                }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--accent)',
                    border: 'none', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Save &amp; Refresh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
