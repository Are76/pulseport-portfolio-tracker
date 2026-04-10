import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet as WalletIcon, 
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
  ChevronUp
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
import { CHAINS, HEX_ABI, TOKENS, PULSEX_V2_PAIR_ABI, PULSEX_LP_PAIRS } from './constants';
import type { Asset, Wallet, Chain, HexStake, LpPosition, FarmPosition, PortfolioSummary, HistoryPoint, Transaction } from './types';

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

const MOCK_WALLET = '0xdemo0000000000000000000000000000000001';
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'm1', hash: '0x123...', timestamp: Date.now() - 86400000 * 2, type: 'transfer_in', from: '0xabc...', to: MOCK_WALLET, asset: 'ETH', amount: 1.5, chain: 'ethereum', valueUsd: 5175 },
  { id: 'm2', hash: '0x456...', timestamp: Date.now() - 86400000 * 5, type: 'transfer_in', from: '0xdef...', to: MOCK_WALLET, asset: 'USDC', amount: 2500, chain: 'base', valueUsd: 2500 },
  { id: 'm3', hash: '0x789...', timestamp: Date.now() - 86400000 * 10, type: 'swap', from: MOCK_WALLET, to: MOCK_WALLET, asset: 'ETH', amount: 0.5, chain: 'ethereum', valueUsd: 1725, counterAsset: 'USDC', counterAmount: 1725 },
  { id: 'm4', hash: '0xabc...', timestamp: Date.now() - 86400000 * 15, type: 'transfer_in', from: '0xghi...', to: MOCK_WALLET, asset: 'ETH', amount: 2.0, chain: 'ethereum', valueUsd: 6800 },
  { id: 'm5', hash: '0xdef...', timestamp: Date.now() - 86400000 * 20, type: 'transfer_in', from: '0xjkl...', to: MOCK_WALLET, asset: 'USDC', amount: 5000, chain: 'ethereum', valueUsd: 5000 },
  { id: 'm6', hash: '0x000...', timestamp: Date.now() - 86400000 * 1, type: 'transfer_in', from: '0x000...', to: MOCK_WALLET, asset: 'USDC', amount: 1000, chain: 'ethereum', valueUsd: 1000 },
  { id: 'm7', hash: '0x999...', timestamp: Date.now() - 86400000 * 0.5, type: 'transfer_in', from: '0x123...', to: MOCK_WALLET, asset: 'USDC', amount: 25000, chain: 'ethereum', valueUsd: 25000 },
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
      <div style={{ background: 'rgba(0,0,0,.9)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: 12, color: '#fff', fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#00c076', marginBottom: 6 }}>Days: {d.bucketRange}</div>
        <div>T-Shares: {d.totalShares.toFixed(2)}</div>
        <div>Stakes: {d.stakeCount}</div>
      </div>
    );
  };

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, padding: '18px 18px 10px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.6px' }}>Staking Ladder</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
          <XAxis dataKey="daysRemaining" tick={{ fill: '#777', fontSize: 13 }} axisLine={{ stroke: '#222' }} tickLine={false}
            label={{ value: 'Days Remaining', position: 'insideBottom', offset: -10, fill: '#555', fontSize: 13 }} />
          <YAxis tick={{ fill: '#777', fontSize: 13 }} axisLine={false} tickLine={false} scale="log" domain={['auto', 'auto']} allowDataOverflow={false} />
          <RechartsTooltip content={<CustomTip />} />
          <Bar dataKey="totalShares" fill="#00c076" radius={[3, 3, 0, 0]} />
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

  const GRADIENT = ['#00c076', '#627EEA', '#f739ff', '#fb923c', '#3b82f6', '#a855f7'];
  const getColor = (i: number) => GRADIENT[i % GRADIENT.length];

  const fmtK = (n: number) => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
      <g>
        <text x={cx} y={cy - 14} textAnchor="middle" fill="#aaa" fontSize="12">{payload.label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">{fmtK(payload.tShares)}</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="#555" fontSize="11">T-Shares</text>
        <Pie data={[]} cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} dataKey="value" />
      </g>
    );
  };

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, padding: '18px 18px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.6px' }}>Stake Distribution</div>
        <div style={{ fontSize: 13, color: '#888' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>${fmtK(totalUsd)}</span>
          {' · '}<span style={{ color: '#fb923c' }}>{fmtK(totalHex)} HEX</span>
          {' · '}<span style={{ color: '#00c076' }}>{fmtK(totalTShares)} T-Shares</span>
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
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#aaa' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(i), flexShrink: 0 }} />
            <span>{w.label}</span>
            <span style={{ color: '#888' }}>({w.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    const saved = localStorage.getItem('pulseport_wallets');
    return saved ? JSON.parse(saved) : [];
  });
  const [realAssets, setRealAssets] = useState<Asset[]>([]);
  const [realStakes, setRealStakes] = useState<HexStake[]>([]);
  const [lpPositions, setLpPositions] = useState<LpPosition[]>([]);
  const [farmPositions, setFarmPositions] = useState<FarmPosition[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>(() => {
    const saved = localStorage.getItem('pulseport_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isCustomCoinsModalOpen, setIsCustomCoinsModalOpen] = useState(false);
  const [customCoins, setCustomCoins] = useState<any[]>(() => {
    const saved = localStorage.getItem('custom_coins');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('custom_coins', JSON.stringify(customCoins));
  }, [customCoins]);

  const addCustomCoin = (coin: any) => {
    setCustomCoins([...customCoins, { ...coin, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeCustomCoin = (id: string) => {
    setCustomCoins(customCoins.filter(c => c.id !== id));
  };
  const [isLoading, setIsLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'stakes' | 'history' | 'wallets'>('overview');
  const [selectedWalletAddr, setSelectedWalletAddr] = useState<string>('all');
  const [walletAssets, setWalletAssets] = useState<Record<string, Asset[]>>({});
  const [walletChainFilter, setWalletChainFilter] = useState<'all' | 'pulsechain' | 'ethereum' | 'base'>('all');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [historyRange, setHistoryRange] = useState<'1D' | '1W' | '1M'>('1M');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txAssetFilter, setTxAssetFilter] = useState<string>('all');
  const [txChainFilter, setTxChainFilter] = useState<string>('all');
  const [receivedCoinFilter, setReceivedCoinFilter] = useState<string>('all');
  const [receivedChainFilter, setReceivedChainFilter] = useState<string>('all');
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState<number>(0);
  const [manualEntries, setManualEntries] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('pulseport_manual_entries');
    return saved ? JSON.parse(saved) : {};
  });
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [etherscanApiKey, setEtherscanApiKey] = useState<string>(() => localStorage.getItem('pulseport_etherscan_key') || '');
  const [basescanApiKey, setBasescanApiKey] = useState<string>(() => localStorage.getItem('pulseport_basescan_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [basescanApiKeyInput, setBasescanApiKeyInput] = useState('');
  const [hideDust, setHideDust] = useState<boolean>(() => {
    const saved = localStorage.getItem('pulseport_hide_dust');
    return saved ? JSON.parse(saved) : false;
  });
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    const saved = localStorage.getItem('pulseport_hidden_tokens');
    return saved ? JSON.parse(saved) : [];
  });
  const [priceChangePeriod, setPriceChangePeriod] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [assetSortField, setAssetSortField] = useState<'value' | 'change'>('value');
  const [assetSortDir, setAssetSortDir] = useState<'desc' | 'asc'>('desc');
  // Hardcoded fallback logos for tokens not listed on CoinGecko
  const STATIC_LOGOS: Record<string, string> = {
    '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d': 'https://tokens.app.pulsex.com/images/tokens/0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d.png', // INC
    '0xf6f8db0aba00007681f8faf16a0fda1c9b030b11': 'https://tokens.app.pulsex.com/images/tokens/0xf6f8dB0ABA00007681F8FAF16a0fdA1C9B030b11.png', // PRVX
  };
  const [tokenLogos, setTokenLogos] = useState<Record<string, string>>(STATIC_LOGOS);
  const [stakeChainFilter, setStakeChainFilter] = useState<'all' | 'pulsechain' | 'ethereum'>('all');
  const [expandedStakeIds, setExpandedStakeIds] = useState<Set<string>>(new Set());
  const [priceDisplayCurrency, setPriceDisplayCurrency] = useState<'usd' | 'pls'>('usd');
  const [pnlAsset, setPnlAsset] = useState<Asset | null>(null);
  const [perfPeriod, setPerfPeriod] = useState<'1d' | '1w' | '1y' | 'all'>('all');
  const [hiddenTxIds, setHiddenTxIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pulseport_hidden_txs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHiddenTxs, setShowHiddenTxs] = useState(false);
  const [showReceivedAssets, setShowReceivedAssets] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(true);
  const [hideSpam, setHideSpam] = useState<boolean>(() => {
    const saved = localStorage.getItem('pulseport_hide_spam');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [spamTokenIds, setSpamTokenIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pulseport_spam_tokens');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('pulseport_collapsed');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('pulseport_collapsed', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (id: string) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const isCollapsed = (id: string) => !!collapsedSections[id];

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
    localStorage.setItem('pulseport_manual_entries', JSON.stringify(manualEntries));
  }, [manualEntries]);

  useEffect(() => {
    if (wallets.length > 0) {
      fetchPortfolio();
      
      // Auto-refresh every 5 minutes
      const interval = setInterval(() => {
        fetchPortfolio();
      }, 300000);
      
      return () => clearInterval(interval);
    }
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('pulseport_wallets', JSON.stringify(wallets));
  }, [wallets]);

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
          fetchedPrices.pulsechain.usd = wplsUSD;
          fetchedPrices['pulsechain:native'] = { usd: wplsUSD };

          const setTokenPrice = (addrLower: string, priceUSD: number, cgId?: string) => {
            if (priceUSD <= 0) return;
            const existing = cgId ? (fetchedPrices[cgId] || {}) : {};
            fetchedPrices[`pulsechain:${addrLower}`] = { ...existing, usd: priceUSD };
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
          }

          // pWETH/WPLS — token0=pWETH(18), token1=WPLS(18)
          const [wethR0, wethR1] = parseRes(batchData[lpKeys.indexOf('PWETH_WPLS')].result);
          if (wethR0 > 0 && wethR1 > 0)
            setTokenPrice('0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', (wethR1 / wethR0) * wplsUSD, 'ethereum');

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

      setPrices(fetchedPrices);

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
                  type: isOut ? 'transfer_out' : 'transfer_in',
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
                  type: isOut ? 'transfer_out' : 'transfer_in',
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
                  type: isOut ? 'transfer_out' : 'transfer_in',
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
                  type: isOut ? 'transfer_out' : 'transfer_in',
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

            const [txResults, tokenTxResults] = await Promise.all([
              fetchAllTxPages('txlist'),
              fetchAllTxPages('tokentx')
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
                  type: isOut ? 'transfer_out' : 'transfer_in',
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
                const coinGeckoId = symbol.toLowerCase();

                const amount = Number(formatUnits(BigInt(tx.value), decimals));
                const price = fetchedPrices[contractAddr]?.usd ||
                             fetchedPrices[coinGeckoId]?.usd || 0;
                const valueUsd = amount * price;

                allTransactions.push({
                  id: `${tx.hash}-${tx.logIndex}`,
                  hash: tx.hash,
                  timestamp: Number(tx.timeStamp) * 1000,
                  type: isOut ? 'transfer_out' : 'transfer_in',
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
              const assetKey = `${chainKey}-${token.symbol}`;
              
              if (assetMap[assetKey]) {
                assetMap[assetKey].balance += balanceNum;
                assetMap[assetKey].value += balanceNum * price;
              } else {
                // Logo: CoinGecko image → Trust Wallet (ETH/Base) → PulseX CDN (PulseChain)
                // All CDN paths require EIP-55 checksummed addresses — use getAddress() to ensure that.
                const cgLogo = priceData?.image || fetchedPrices[token.coinGeckoId]?.image;
                const twChain = chainKey === 'ethereum' ? 'ethereum' : chainKey === 'base' ? 'base' : null;
                let twLogo: string | null = null;
                if (twChain && token.address !== 'native') {
                  try { twLogo = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChain}/assets/${getAddress(token.address)}/logo.png`; } catch { /* invalid address */ }
                }
                let pulsexLogo: string | null = null;
                if (chainKey === 'pulsechain' && token.address !== 'native') {
                  try { pulsexLogo = `https://tokens.app.pulsex.com/images/tokens/${getAddress(token.address)}.png`; } catch { /* invalid address */ }
                }
                const logoUrl = cgLogo || twLogo || pulsexLogo || null;

                assetMap[assetKey] = {
                  id: assetKey,
                  symbol: token.symbol,
                  name: (token as any).name || (token.symbol === 'eHEX' ? 'HEX (from Ethereum)' : `${token.symbol} (${chainConfig.name})`),
                  balance: balanceNum,
                  price: price,
                  priceChange24h: priceChange24h,
                  priceChange1h: priceChange1h,
                  priceChange7d: priceChange7d,
                  value: balanceNum * price,
                  chain: chainKey,
                  pnl24h: priceChange24h,
                  isCore: ['PLSX', 'eHEX', 'HEX', 'PLS', 'PRVX'].includes(token.symbol),
                  isBridged: (token as any).bridged || false,
                  address: token.address,
                  isSpam: (token as any).isSpam || false,
                  logoUrl
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
            try {
              const hexAddr = getAddress(chainConfig.hexAddress);
              const [stakeCount, currentDay] = await withRetry(() => Promise.all([
                client.readContract({
                  address: hexAddr,
                  abi: HEX_ABI,
                  functionName: 'stakeCount',
                  args: [address]
                } as any),
                client.readContract({
                  address: hexAddr,
                  abi: HEX_ABI,
                  functionName: 'currentDay'
                } as any)
              ])) as [bigint, bigint];

              if (Number(stakeCount) > 0) {
                const stakes = await Promise.all(
                  Array.from({ length: Number(stakeCount) }, (_, i) =>
                    withRetry(() => client.readContract({
                      address: hexAddr,
                      abi: HEX_ABI,
                      functionName: 'stakeLists',
                      args: [address, BigInt(i)]
                    } as any))
                  )
                );

                stakes.forEach((stakeResult: any, i) => {
                  if (!stakeResult) return;
                  let stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake;
                  if (Array.isArray(stakeResult)) {
                    [stakeId, stakedHearts, stakeShares, lockedDay, stakedDays, unlockedDay, isAutoStake] = stakeResult;
                  } else {
                    stakeId = stakeResult.stakeId;
                    stakedHearts = stakeResult.stakedHearts;
                    stakeShares = stakeResult.stakeShares;
                    lockedDay = stakeResult.lockedDay;
                    stakedDays = stakeResult.stakedDays;
                    unlockedDay = stakeResult.unlockedDay;
                    isAutoStake = stakeResult.isAutoStake;
                  }

                  if (stakeId === undefined) return;
                  const progress = Math.min(100, Math.max(0, ((Number(currentDay) - Number(lockedDay)) / Number(stakedDays)) * 100));

                  // Use chain-specific HEX price (pHEX vs eHEX differ significantly)
                  const hexPriceChainKey = `${chainKey}:${hexAddr.toLowerCase()}`;
                  const hexChainFallback = chainKey === 'pulsechain' ? fetchedPrices['pulsechain:hex']?.usd : fetchedPrices['hex']?.usd;
                  const hexPrice = fetchedPrices[hexPriceChainKey]?.usd || hexChainFallback || 0;
                  const stakedHeartsNum = Number(stakedHearts) / 1e8;
                  const valueUsd = stakedHeartsNum * hexPrice;

                  // ~6 HEX per T-Share per day: (shares × days × 6) / 10000
                  // interestHearts = accrued so far (daysStaked elapsed)
                  // fullYieldHearts = total yield at maturity (stakedDays full duration)
                  const shares = BigInt(stakeShares);
                  const daysStaked = Math.max(0, Number(currentDay) - Number(lockedDay));
                  const interestHearts = (shares * BigInt(daysStaked) * 6n) / 10000n;
                  const totalHearts = BigInt(stakedHearts) + interestHearts;
                  const totalValueUsd = (Number(totalHearts) / 1e8) * hexPrice;

                  const daysRemaining = Math.max(0, (Number(lockedDay) + Number(stakedDays)) - Number(currentDay));
                  const tShares = Number(shares) / 1e12;
                  const stakedHex = Number(BigInt(stakedHearts)) / 1e8;
                  // Full projected yield using the same rate over the complete stake duration
                  const fullYieldHearts = (shares * BigInt(stakedDays) * 6n) / 10000n;
                  const stakeHexYield = Number(fullYieldHearts) / 1e8;

                  allStakes.push({
                    id: `${chainKey}-${address}-${stakeId}`,
                    stakeId: Number(stakeId),
                    stakedHearts: BigInt(stakedHearts),
                    stakeShares: BigInt(stakeShares),
                    lockedDay: Number(lockedDay),
                    stakedDays: Number(stakedDays),
                    unlockedDay: Number(unlockedDay),
                    isAutoStake: Boolean(isAutoStake),
                    progress: Math.round(progress),
                    estimatedValueUsd: valueUsd,
                    interestHearts: interestHearts,
                    totalValueUsd: totalValueUsd,
                    chain: chainKey,
                    walletLabel: wallet.name,
                    walletAddress: address.toLowerCase(),
                    daysRemaining,
                    tShares,
                    stakedHex,
                    stakeHexYield
                  });
                });
              }
            } catch (e) {
              console.error(`Error fetching HEX stakes on ${chainKey}:`, e);
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

      // Group transactions by hash to identify swaps (like pulsewatch.app)
      const groupedTxs: Record<string, Transaction[]> = {};
      allTransactions.forEach(tx => {
        if (!groupedTxs[tx.hash]) groupedTxs[tx.hash] = [];
        groupedTxs[tx.hash].push(tx);
      });

      const walletAddrs = new Set(wallets.map(w => w.address.toLowerCase()));

      const processedTransactions: Transaction[] = [];
      const seenIds = new Set<string>();
      Object.entries(groupedTxs).forEach(([hash, txs]) => {
        // Only include if from or to is one of the user's wallets
        const relevant = txs.filter(t =>
          walletAddrs.has(t.from.toLowerCase()) || walletAddrs.has(t.to.toLowerCase())
        );
        if (relevant.length === 0) return;

        if (relevant.length > 1) {
          const outs = relevant.filter(t => t.type === 'transfer_out');
          const ins  = relevant.filter(t => t.type === 'transfer_in');
          // Identify zero-value native-chain call records (router invocations with no value)
          const isNativeTx = (t: Transaction) =>
            (t.chain === 'pulsechain' && t.asset === 'PLS') ||
            ((t.chain === 'ethereum' || t.chain === 'base') && t.asset === 'ETH');
          if (outs.length > 0 && ins.length > 0) {
            // Prefer a non-zero token transfer over a zero-amount native call (router invocation)
            const pickBest = (arr: Transaction[]) => {
              const tokens = arr.filter(t => !isNativeTx(t) && t.amount > 0);
              if (tokens.length) return tokens.reduce((b, t) => t.amount > b.amount ? t : b);
              const nonZero = arr.filter(t => t.amount > 0);
              if (nonZero.length) return nonZero.reduce((b, t) => t.amount > b.amount ? t : b);
              return arr[0];
            };
            const outTx = pickBest(outs);
            const inTx  = pickBest(ins);
            const id = `${hash}-swap`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              processedTransactions.push({ ...inTx, id, type: 'swap', counterAsset: outTx.asset, counterAmount: outTx.amount });
            }
            return;
          }
          // Multiple outs, no ins — e.g. token sold for native PLS via internal transfer (internal txs not captured)
          // Drop the zero-amount native call entry; keep only the actual token out
          if (outs.length >= 2 && ins.length === 0) {
            const tokenOuts = outs.filter(t => !isNativeTx(t) && t.amount > 0);
            const toKeep = tokenOuts.length > 0 ? tokenOuts : outs.filter(t => t.amount > 0);
            toKeep.forEach(tx => {
              if (!seenIds.has(tx.id)) { seenIds.add(tx.id); processedTransactions.push(tx); }
            });
            return;
          }
        }
        relevant.forEach(tx => {
          if (!seenIds.has(tx.id)) {
            seenIds.add(tx.id);
            processedTransactions.push(tx);
          }
        });
      });

      setTransactions(processedTransactions.sort((a, b) => b.timestamp - a.timestamp));
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
    if (!newWalletAddress.startsWith('0x') || newWalletAddress.length !== 42) {
      alert('Invalid Ethereum address');
      return;
    }
    
    // Prevent duplicate wallets
    if (wallets.some(w => w.address.toLowerCase() === newWalletAddress.toLowerCase())) {
      alert('This wallet has already been added.');
      return;
    }

    const newWallet: Wallet = {
      address: newWalletAddress,
      name: newWalletName || `Wallet ${wallets.length + 1}`
    };
    setWallets([...wallets, newWallet]);
    setNewWalletAddress('');
    setNewWalletName('');
    setIsAddingWallet(false);
  };

  const removeWallet = (address: string) => {
    setWallets(wallets.filter(w => w.address !== address));
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
      return matchesType && matchesAsset && matchesChain;
    });
  }, [currentTransactions, txTypeFilter, txAssetFilter, txChainFilter]);

  const summary = useMemo(() => {
    const assets = currentAssets;
    const liquidValue = assets.reduce((acc, curr) => acc + curr.value, 0);

    // Add HEX staking value so the grand total reflects everything the user owns
    const stakingValueUsd = currentStakes.reduce((acc, s) => {
      const hexPriceKey = `${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
      const chainHexFallback = s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd;
      const hexPrice = prices[hexPriceKey]?.usd || chainHexFallback || 0.004;
      const stakedHex = Number(s.stakedHearts) / 1e8;
      const interestHex = Number(s.interestHearts || 0n) / 1e8;
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
    const netInvestment = currentTransactions.reduce((acc, tx) => {
      if (tx.type !== 'transfer_in') return acc;
      // Only count Ethereum/Base inflows — PulseChain stables are bridged copies
      // and would double-count the same capital already tracked on Ethereum
      if (tx.chain === 'pulsechain') return acc;
      const assetUpper = tx.asset.toUpperCase();
      const isEth = assetUpper === 'ETH';
      const isStable = isStableAsset(tx.asset);
      if (!isEth && !isStable) return acc;
      // Only external inflows: from not own wallet, to own wallet
      const fromOwn = ownAddrs.has(tx.from.toLowerCase());
      const toOwn = ownAddrs.has(tx.to.toLowerCase());
      if (fromOwn || !toOwn) return acc; // skip own-to-own and unrelated
      // Stables at face value; ETH at stored valueUsd (matches Total Received calculation)
      if (isStable) return acc + tx.amount;
      if (isEth) return acc + (tx.valueUsd || 0);
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
      
      if (tx.type === 'transfer_in' || (tx.type === 'swap' && tx.counterAsset)) {
        // Buying or receiving asset
        const amount = tx.amount;
        const value = tx.valueUsd || 0;
        
        if (!costBasisMap[assetKey]) {
          costBasisMap[assetKey] = { amount: 0, totalCost: 0 };
        }
        costBasisMap[assetKey].amount += amount;
        costBasisMap[assetKey].totalCost += value;
      } else if (tx.type === 'transfer_out' || tx.type === 'swap') {
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
      const stakedHex = Number(s.stakedHearts) / 1e8;
      const tShares = Number(s.stakeShares) / 1e12;
      const interestHex = Number(s.interestHearts || 0n) / 1e8;
      
      // Use chain-specific HEX price
      const hexPriceKey = `${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
      const chainHexFallback = s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd;
      const hexPrice = prices[hexPriceKey]?.usd || chainHexFallback || 0.004;

      totalStakedHex += stakedHex;
      totalTShares += tShares;
      totalValueUsd += (stakedHex + interestHex) * hexPrice;
      totalInterestHex += interestHex;
    });

    const phexPrice = prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0.004;
    const estimatedDailyPayoutHex = totalTShares * 6.2;
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

  const receivedAssetsData = useMemo(() => {
    const START_2021 = new Date('2021-01-01').getTime();
    const ethPrice = prices['ethereum']?.usd || 3400;

    const filtered = currentTransactions.filter(tx => {
      const typeMatch = tx.type === 'transfer_in' || (tx.type as string) === 'receive';
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
    return '';
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dashboard-bg text-white font-sans flex" style={{ fontSize: 14 }}>
      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, minWidth: 220, background: '#080808', borderRight: '1px solid #1f1f1f' }}
        className="hidden md:flex flex-col sticky top-0 h-screen overflow-y-auto custom-scrollbar">
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #1f1f1f' }} className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, background: '#00c076', borderRadius: 8 }} className="flex items-center justify-center shrink-0">
            <Activity size={16} className="text-black" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
            PULSE<span style={{ color: '#aaa' }}>PORT</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px' }} className="flex flex-col gap-0.5">
          {([
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'assets',   label: 'Assets',   icon: WalletIcon },
            { id: 'stakes',   label: 'Stakes',   icon: Layers },
            { id: 'history',  label: 'History',  icon: History },
            { id: 'wallets',  label: 'Wallets',  icon: User },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: activeTab === id ? '#141414' : 'transparent',
                color: activeTab === id ? '#fff' : '#555',
                fontWeight: activeTab === id ? 600 : 500,
                fontSize: 13, border: 'none', cursor: 'pointer',
                transition: 'all .12s', width: '100%', textAlign: 'left',
                borderLeft: activeTab === id ? '2px solid #00c076' : '2px solid transparent',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Wallets */}
        <div style={{ padding: '16px 8px 8px', marginTop: 'auto' }} className="flex flex-col gap-2">
          <div style={{ padding: '0 10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px' }}>Wallets</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00c076', background: 'rgba(0,192,118,.1)', padding: '1px 7px', borderRadius: 100 }}>{wallets.length}</span>
          </div>
          <div className="space-y-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 200 }}>
            {wallets.map((w) => (
              <div key={w.address}
                onClick={() => { setSelectedWalletAddr(w.address.toLowerCase()); setActiveTab('wallets'); }}
                style={{ padding: '8px 10px', borderRadius: 8, background: selectedWalletAddr === w.address.toLowerCase() && activeTab === 'wallets' ? '#141414' : '#0f0f0f', border: `1px solid ${selectedWalletAddr === w.address.toLowerCase() && activeTab === 'wallets' ? '#2a2a2a' : '#1a1a1a'}`, cursor: 'pointer' }}
                className="group flex items-center justify-between">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{w.name}</div>
                  <code style={{ fontSize: 13, color: '#aaa' }}>{w.address.slice(0, 6)}…{w.address.slice(-4)}</code>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeWallet(w.address); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#aaa', padding: 4, cursor: 'pointer', border: 'none', background: 'none' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => setIsAddingWallet(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#00c076', color: '#000', fontWeight: 700, fontSize: 13,
              border: 'none', borderRadius: 8, padding: '9px 0', cursor: 'pointer',
              transition: 'opacity .12s', margin: '4px 2px 12px' }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
            <Plus size={15} /> Add Wallet
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Nav */}
        <header style={{ height: 52, background: '#000', borderBottom: '1px solid #1f1f1f', position: 'sticky', top: 0, zIndex: 50 }}
          className="flex items-center justify-between px-5 gap-4 shrink-0">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2">
            <div style={{ width: 24, height: 24, background: '#00c076', borderRadius: 6 }} className="flex items-center justify-center">
              <Activity size={14} className="text-black" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 14 }}>PULSEPORT</span>
          </div>

          {/* Tab strip */}
          <div className="hidden md:flex items-center gap-0">
            {(['overview', 'assets', 'stakes', 'history', 'wallets'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0 16px', height: 52, fontSize: 13, fontWeight: activeTab === tab ? 600 : 500,
                  color: activeTab === tab ? '#fff' : '#555',
                  background: 'none', borderBottom: activeTab === tab ? '2px solid #00c076' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all .12s', textTransform: 'capitalize',
                }}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span style={{ fontSize: 13, color: '#aaa' }} className="hidden sm:inline">
                {timeSinceLastUpdate}s ago
              </span>
            )}
            <button onClick={() => { setApiKeyInput(etherscanApiKey); setBasescanApiKeyInput(basescanApiKey); setIsApiKeyModalOpen(true); }}
              title={etherscanApiKey ? 'API key set ✓' : 'Set Etherscan API key'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                background: etherscanApiKey ? 'rgba(0,192,118,.08)' : '#111',
                border: `1px solid ${etherscanApiKey ? 'rgba(0,192,118,.25)' : '#1c1c1c'}`,
                borderRadius: 8, color: etherscanApiKey ? '#00c076' : '#555',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .12s' }}>
              <Settings size={13} />
              <span className="hidden sm:inline">{etherscanApiKey ? 'API Key ✓' : 'API Key'}</span>
            </button>
            <button onClick={fetchPortfolio}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                background: '#111', border: '1px solid #252525', borderRadius: 8,
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .12s' }}
              onMouseOver={e => (e.currentTarget.style.borderColor = '#333')}
              onMouseOut={e => (e.currentTarget.style.borderColor = '#1c1c1c')}>
              <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <div style={{ maxWidth: 1400, margin: '0 auto' }} className="space-y-5 px-3 py-4 sm:px-5 sm:py-6">

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* ── HERO CARD (full width) with Allocation inside ── */}
                {(() => {
                  const ALLOC_COLORS = ['#00c076','#627EEA','#f97316','#a855f7','#f59e0b','#06b6d4','#ec4899'];
                  // Value at Maturity from stakes
                  const totalHexAtMaturity = currentStakes.reduce((sum, stake) =>
                    sum + (stake.stakedHex ?? 0) + (stake.stakeHexYield ?? 0), 0);
                  const valueAtMaturity = currentStakes.reduce((sum, stake) => {
                    const hp = prices[`${stake.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`]?.usd
                      || (stake.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd) || 0;
                    return sum + ((stake.stakedHex ?? 0) + (stake.stakeHexYield ?? 0)) * hp;
                  }, 0);
                  const fmtBigNum = (n: number) => Math.round(n).toLocaleString('nb-NO', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #081a10 0%, #050f09 40%, #060d14 100%)',
                      border: '1px solid #242424', borderRadius: 16, padding: '24px 28px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                        background: 'radial-gradient(ellipse at 15% 50%, rgba(0,192,118,.08) 0%, transparent 60%), radial-gradient(ellipse at 85% 50%, rgba(99,102,241,.05) 0%, transparent 60%)' }} />
                      <div className="hero-grid" style={{ position: 'relative' }}>
                        {/* Left: value + stats */}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Total Portfolio Value</div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, color: '#fff' }}>
                              ${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 6 }}>
                              <div style={{ fontSize: 13, color: summary.pnl24h >= 0 ? '#00c076' : '#ef4444', fontWeight: 700 }}>
                                {summary.pnl24h >= 0 ? '+' : ''}{summary.pnl24hPercent.toFixed(2)}% 24h
                              </div>
                              <div style={{ fontSize: 13, color: '#aaa' }}>{summary.nativeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PLS</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.2)' }}>
                              Wallet ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>
                              Stakes ${summary.stakingValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid #222' }}>
                              {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Stat mini-cards */}
                          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2 sm:grid-cols-3">
                            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ fontSize: 13, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Net Investment</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>${Math.abs(summary.netInvestment).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ fontSize: 13, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Unified PNL</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: summary.unifiedPnl >= 0 ? '#00c076' : '#ef4444' }}>
                                {summary.unifiedPnl >= 0 ? '+' : ''}${Math.abs(summary.unifiedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ fontSize: 13, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Stakes at Maturity</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>{fmtBigNum(totalHexAtMaturity)} HEX</div>
                              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>${valueAtMaturity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                          </div>
                        </div>
                        {/* Right: Allocation donut */}
                        <div style={{ width: 200 }} className="max-sm:w-full">
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Allocation</div>
                          <ResponsiveContainer width="100%" height={120} debounce={50}>
                            <PieChart>
                              <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} dataKey="value">
                                {assetAllocation.map((_, i) => <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />)}
                              </Pie>
                              <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 13 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                            {assetAllocation.slice(0, 5).map((a, i) => (
                              <div key={`alloc-${a.name}`} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: 2, background: ALLOC_COLORS[i % ALLOC_COLORS.length], flexShrink: 0 }} />
                                  <span style={{ fontSize: 13, color: '#ccc' }}>{a.name}</span>
                                </div>
                                <span style={{ fontSize: 13, color: '#888' }}>{((a.value / summary.totalValue) * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── FILTER BAR + PRICE TICKER ── */}
                {(() => {
                  const plsPrice = prices['pulsechain']?.usd || 0.00005;
                  // Merge assets by symbol
                  const mergedMap: Record<string, { asset: Asset; totalValue: number }> = {};
                  currentAssets.filter(a => a.price > 0 && a.value >= 100).forEach(a => {
                    if (mergedMap[a.symbol]) mergedMap[a.symbol].totalValue += a.value;
                    else mergedMap[a.symbol] = { asset: a, totalValue: a.value };
                  });
                  const tickerAssets = Object.values(mergedMap).sort((a, b) => b.totalValue - a.totalValue);

                  const getChange = (asset: Asset) => {
                    if (priceChangePeriod === '1h') return asset.priceChange1h ?? 0;
                    if (priceChangePeriod === '6h') return null; // not available
                    if (priceChangePeriod === '7d') return asset.priceChange7d ?? 0;
                    return asset.priceChange24h ?? asset.pnl24h ?? 0;
                  };

                  const formatPrice = (price: number) => {
                    if (priceDisplayCurrency === 'pls') {
                      // Use the on-chain price for PulseChain tokens to ensure both
                      // numerator and denominator come from the same oracle
                      const inPls = price / plsPrice;
                      if (inPls >= 1e9) return `${(inPls/1e9).toFixed(2)}B`;
                      if (inPls >= 1e6) return `${(inPls/1e6).toFixed(2)}M`;
                      if (inPls >= 1000) return `${(inPls/1000).toFixed(1)}K`;
                      if (inPls >= 1) return inPls.toLocaleString(undefined, { maximumFractionDigits: 1 });
                      if (inPls >= 0.001) return inPls.toFixed(4);
                      if (inPls > 0) return inPls.toFixed(8);
                      return '0';
                    }
                    if (price < 0.001) return `$${price.toFixed(8)}`;
                    if (price < 1) return `$${price.toFixed(5)}`;
                    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                  };

                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
                      {/* Header with collapse */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #1f1f1f', background: '#0e0e0e' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Price Ticker</div>
                        <button onClick={() => toggleSection('price-ticker')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                          onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('price-ticker') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('price-ticker') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      {!isCollapsed('price-ticker') && (<>
                      {/* Filter bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 14px', borderBottom: '1px solid #1f1f1f', background: '#0e0e0e' }}>
                        {([
                          { id: '1h', label: '1H' },
                          { id: '6h', label: '6H' },
                          { id: '24h', label: '24H' },
                          { id: '7d', label: '7D' },
                        ] as const).map(({ id, label }) => (
                          <button key={id} onClick={() => setPriceChangePeriod(id)}
                            style={{ padding: '3px 11px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .1s', border: 'none',
                              background: priceChangePeriod === id ? '#1e1e1e' : 'transparent',
                              color: priceChangePeriod === id ? '#fff' : '#777',
                              outline: priceChangePeriod === id ? '1px solid #2a2a2a' : 'none' }}>
                            {label}
                          </button>
                        ))}
                        <div style={{ width: 1, height: 16, background: '#1c1c1c', margin: '0 6px' }} />
                        {([
                          { id: 'usd', label: 'USD' },
                          { id: 'pls', label: 'WPLS' },
                        ] as const).map(({ id, label }) => (
                          <button key={id} onClick={() => setPriceDisplayCurrency(id)}
                            style={{ padding: '3px 11px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .1s', border: 'none',
                              background: priceDisplayCurrency === id ? '#1e1e1e' : 'transparent',
                              color: priceDisplayCurrency === id ? '#fff' : '#777',
                              outline: priceDisplayCurrency === id ? '1px solid #2a2a2a' : 'none' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* Ticker row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, padding: '4px 4px' }}>
                        {tickerAssets.map(({ asset }, i) => {
                          const change = getChange(asset);
                          return (
                            <div key={asset.symbol} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                              borderRight: i < tickerAssets.length - 1 ? '1px solid #1f1f1f' : 'none',
                              minWidth: 0
                            }}>
                              <div style={{ width: 26, height: 26, borderRadius: 6, background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                {getTokenLogoUrl(asset) ? (
                                  <img src={getTokenLogoUrl(asset)} alt={asset.symbol}
                                    style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} />
                                ) : null}
                                <span hidden={!!getTokenLogoUrl(asset)} style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{asset.symbol.slice(0,3)}</span>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{asset.symbol}</span>
                                  {change !== null ? (
                                    <span style={{ fontSize: 13, fontWeight: 700, color: change >= 0 ? '#00c076' : '#ef4444' }}>
                                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 13, color: '#333' }}>—</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace' }}>
                                  {formatPrice(asset.price)}{priceDisplayCurrency === 'pls' ? ' WPLS' : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      </>)}
                    </div>
                  );
                })()}

                {/* ── HEX TOTALS + ETH BOXES ── */}
                {(() => {
                  const HEX_ADDR = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                  const pHexPrice = prices[`pulsechain:${HEX_ADDR}`]?.usd || prices['pulsechain:hex']?.usd || 0;
                  const eHexPrice = prices[`ethereum:${HEX_ADDR}`]?.usd || prices['hex']?.usd || 0;
                  const HEX_ADDR_LC = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                  // pHEX liquid: native HEX on PulseChain (symbol HEX, same address as eHEX contract but on PLS chain)
                  const pHexLiquid = currentAssets.filter(a => a.chain === 'pulsechain' && (a as any).address?.toLowerCase() === HEX_ADDR_LC).reduce((s, a) => s + a.balance, 0);
                  // Staked = principal + accrued yield so far (interestHearts already accrued)
                  const pHexStaked = currentStakes.filter(s => s.chain === 'pulsechain').reduce((s, st) => {
                    const principal = st.stakedHex ?? 0;
                    const interest = Number(st.interestHearts || 0n) / 1e8;
                    return s + principal + interest;
                  }, 0);
                  // eHEX liquid: HEX on Ethereum + bridged eHEX on PulseChain
                  const eHexLiquidEth = currentAssets.filter(a => a.chain === 'ethereum' && (a as any).address?.toLowerCase() === HEX_ADDR_LC).reduce((s, a) => s + a.balance, 0);
                  const eHexLiquidPls = currentAssets.filter(a => a.chain === 'pulsechain' && a.symbol === 'eHEX').reduce((s, a) => s + a.balance, 0);
                  const eHexLiquid = eHexLiquidEth + eHexLiquidPls;
                  const eHexStaked = currentStakes.filter(s => s.chain === 'ethereum').reduce((s, st) => {
                    const principal = st.stakedHex ?? 0;
                    const interest = Number(st.interestHearts || 0n) / 1e8;
                    return s + principal + interest;
                  }, 0);
                  const pHexTotal = pHexLiquid + pHexStaked;
                  const eHexTotal = eHexLiquid + eHexStaked;
                  // Space-separated thousands: 148 000 000
                  const fmtHex = (n: number) => Math.round(n).toLocaleString('nb-NO', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
                  const boxes = [
                    { label: 'Total pHEX', sub: `${fmtHex(pHexLiquid)} liquid · ${fmtHex(pHexStaked)} staked+yield`, val: fmtHex(pHexTotal), usd: pHexTotal * pHexPrice, color: '#fb923c', dot: '#fb923c' },
                    { label: 'Total eHEX', sub: `${fmtHex(eHexLiquid)} liquid · ${fmtHex(eHexStaked)} staked+yield`, val: fmtHex(eHexTotal), usd: eHexTotal * eHexPrice, color: '#627EEA', dot: '#627EEA' },
                  ];
                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: isCollapsed('hex-boxes') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>HEX Holdings</div>
                        <button onClick={() => toggleSection('hex-boxes')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                          onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('hex-boxes') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('hex-boxes') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      {!isCollapsed('hex-boxes') && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }} className="max-sm:grid-cols-1">
                          {boxes.map(b => (
                            <div key={b.label} style={{ padding: 16, borderRight: '1px solid #1f1f1f' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.dot }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px' }}>{b.label}</span>
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: b.color, letterSpacing: '-0.5px' }}>{b.val}</div>
                              {b.usd !== null && <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>${b.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                              <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{b.sub}</div>
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
                    '1d': now - 24 * 3600 * 1000,
                    '1w': now - 7 * 24 * 3600 * 1000,
                    '1y': now - 365 * 24 * 3600 * 1000,
                    'all': 0,
                  };
                  const cutoff = cutoffs[perfPeriod];
                  const realHistory = (wallets.length > 0 ? history : []).filter(p => p.timestamp >= cutoff);
                  const currentVal = summary.totalValue || 1;
                  const mockLast = MOCK_HISTORY[MOCK_HISTORY.length - 1]?.value || 1;
                  const scale = currentVal / mockLast;

                  // Format label based on period
                  const fmtLabel = (ts: number) => {
                    if (perfPeriod === '1d') return format(ts, 'HH:mm');
                    if (perfPeriod === '1w') return format(ts, 'EEE d');
                    return format(ts, 'MMM d');
                  };

                  // Deduplicate by period-appropriate bucket, keeping latest value + timestamp per bucket
                  const byBucket = new Map<string, { value: number; ts: number }>();
                  realHistory.forEach(p => {
                    const key = perfPeriod === '1d' ? format(p.timestamp, 'yyyy-MM-dd HH') : format(p.timestamp, 'yyyy-MM-dd');
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
                    const mockCount = perfPeriod === '1d' ? 24 : perfPeriod === '1w' ? 7 : perfPeriod === '1y' ? 52 : 30;
                    chartPoints = MOCK_HISTORY.slice(-mockCount).map(p => ({
                      day: format(p.timestamp, perfPeriod === '1d' ? 'HH:mm' : 'MMM d'),
                      value: p.value * scale
                    }));
                    if (chartPoints.length > 0) chartPoints[chartPoints.length - 1].value = currentVal;
                  }

                  const periodChange = chartPoints.length >= 2
                    ? ((chartPoints[chartPoints.length - 1].value - chartPoints[0].value) / Math.max(1, chartPoints[0].value)) * 100
                    : 0;

                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: isCollapsed('perf-chart') ? 'none' : '1px solid #1f1f1f' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Portfolio Performance</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: periodChange >= 0 ? '#00c076' : '#ef4444' }}>
                            {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                          </div>
                          {isSimulated && <span style={{ fontSize: 13, color: '#aaa', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>Simulated</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Period tabs */}
                          {!isCollapsed('perf-chart') && (
                            <div style={{ display: 'flex', gap: 2, background: '#111', border: '1px solid #252525', borderRadius: 8, padding: 3 }}>
                              {(['1d','1w','1y','all'] as const).map(p => (
                                <button key={p} onClick={() => setPerfPeriod(p)}
                                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all .12s',
                                    background: perfPeriod === p ? '#00c076' : 'transparent',
                                    color: perfPeriod === p ? '#000' : '#555' }}>
                                  {p.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => toggleSection('perf-chart')}
                            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                            onMouseOut={e => (e.currentTarget.style.color = '#555')}
                            title={isCollapsed('perf-chart') ? 'Expand' : 'Collapse'}>
                            {isCollapsed('perf-chart') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </button>
                        </div>
                      </div>
                      {!isCollapsed('perf-chart') && (
                        <div style={{ padding: '10px 18px 10px' }}>
                          <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                              <AreaChart data={chartPoints}>
                                <defs>
                                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00c076" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#00c076" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                                <XAxis dataKey="day" stroke="#333" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#aaa' }} interval={Math.max(0, Math.floor(chartPoints.length / 7) - 1)} />
                                <YAxis hide />
                                <RechartsTooltip
                                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 13 }}
                                  formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Value']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#00c076" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} dot={false} />
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

            {activeTab === 'assets' && (
              <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Token Positions</div>
                    <div style={{ fontSize: 13, color: '#aaa' }}>{currentAssets.length} assets · ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} liquid</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 3, background: '#111', border: '1px solid #252525', borderRadius: 8, padding: 3 }}>
                      {([['1h','1H'],['6h','6H'],['24h','24H'],['7d','7D']] as const).map(([p, label]) => (
                        <button key={p} onClick={() => setPriceChangePeriod(p)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', border: 'none',
                            background: priceChangePeriod === p ? '#00c076' : 'transparent',
                            color: priceChangePeriod === p ? '#000' : '#555' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setHideDust(!hideDust)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #222',
                        background: hideDust ? '#00c076' : '#111', color: hideDust ? '#000' : '#aaa',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s' }}>
                      Hide Dust
                    </button>
                    <button onClick={() => setHideSpam(!hideSpam)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #222',
                        background: hideSpam ? '#f739ff22' : '#111', color: hideSpam ? '#f739ff' : '#aaa',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                        borderColor: hideSpam ? '#f739ff44' : '#222' }}>
                      Hide Spam
                    </button>
                    <button onClick={scanForSpam} disabled={isScanning || wallets.length === 0}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #222',
                        background: '#111', color: isScanning ? '#555' : '#aaa',
                        fontSize: 13, fontWeight: 600, cursor: isScanning || wallets.length === 0 ? 'default' : 'pointer',
                        transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {isScanning ? '⟳ Scanning…' : 'Scan'}
                      {scanResult !== null && !isScanning && (
                        <span style={{ background: scanResult > 0 ? '#f739ff33' : '#00c07633', color: scanResult > 0 ? '#f739ff' : '#00c076',
                          borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>
                          {scanResult > 0 ? `+${scanResult} spam` : '✓ clean'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Token Table */}
                <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: isCollapsed('assets-table') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Assets</div>
                      <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>{currentAssets.length} tokens · ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <button onClick={() => toggleSection('assets-table')}
                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                      onMouseOut={e => (e.currentTarget.style.color = '#555')}
                      title={isCollapsed('assets-table') ? 'Expand' : 'Collapse'}>
                      {isCollapsed('assets-table') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                  {!isCollapsed('assets-table') && (<>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #242424' }}>
                          {[
                            { label: 'Token', field: null, align: 'left' },
                            { label: 'Price', field: null, align: 'right' },
                            { label: priceChangePeriod.toUpperCase(), field: 'change', align: 'right' },
                            { label: 'Amount', field: null, align: 'right' },
                            { label: 'Value', field: 'value', align: 'right' },
                            { label: 'Share', field: null, align: 'right' },
                            { label: '', field: null, align: 'right' },
                          ].map(({ label, field, align }, i) => (
                            <th key={i} onClick={field ? () => {
                              if (assetSortField === field) setAssetSortDir(d => d === 'desc' ? 'asc' : 'desc');
                              else { setAssetSortField(field as any); setAssetSortDir('desc'); }
                            } : undefined}
                              style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600,
                                color: assetSortField === field ? '#00c076' : '#aaa',
                                textTransform: 'uppercase', letterSpacing: '.5px',
                                textAlign: align as any, whiteSpace: 'nowrap', background: '#0d0d0d',
                                cursor: field ? 'pointer' : 'default', userSelect: 'none' }}>
                              {label}{field && assetSortField === field ? (assetSortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentAssets.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>
                              No assets found — add wallets to get started
                            </td>
                          </tr>
                        ) : (
                          [...currentAssets].sort((a, b) => {
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
                            const share = ((asset.value / (summary.totalValue || 1)) * 100);
                            const addr = (asset as any).address;
                            const logo = (asset as any).logoUrl
                              || tokenLogos[(asset as any).address?.toLowerCase?.()]
                              || getTokenLogoUrl(asset);
                            const explUrl = explorerUrl(asset.chain, addr);
                            const dsUrl = dexScreenerUrl(asset.chain, addr);
                            return (
                              <tr key={asset.id}
                                style={{ borderBottom: '1px solid #1e1e1e', transition: 'background .1s' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#111')}
                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {/* Logo */}
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#282828', border: '1px solid #3a3a3a',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                                      {logo ? <img src={logo} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} /> : null}
                                      <span hidden={!!logo}>{asset.symbol[0]}</span>
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {explUrl
                                          ? <a href={explUrl} target="_blank" rel="noopener noreferrer"
                                              style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none' }}
                                              onMouseOver={e => (e.currentTarget.style.color = '#00c076')}
                                              onMouseOut={e => (e.currentTarget.style.color = '#fff')}>
                                              {asset.symbol}
                                            </a>
                                          : <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{asset.symbol}</span>}
                                        {asset.isBridged && <span style={{ fontSize: 13, background: '#1a1a2a', color: '#6366f1', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>bridged</span>}
                                        {/* Copy CA */}
                                        {addr && addr !== 'native' && (
                                          <button onClick={() => navigator.clipboard.writeText(addr)}
                                            title={`Copy CA: ${addr}`}
                                            style={{ padding: '1px 3px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', transition: 'color .12s', lineHeight: 1 }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
                                            onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                            <Copy size={10} />
                                          </button>
                                        )}
                                        {/* DexScreener */}
                                        {dsUrl && addr !== 'native' && (
                                          <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                                            title="View on DexScreener"
                                            style={{ padding: '1px 3px', color: '#666', transition: 'color .12s', lineHeight: 1, display: 'inline-flex' }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#f4c542')}
                                            onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                            <ExternalLink size={10} />
                                          </a>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555' }} />
                                        <span style={{ fontSize: 13, color: '#aaa' }}>{asset.chain}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <PriceDisplay price={asset.price} className="" />
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap',
                                  fontSize: 13, fontWeight: 600, color: pct >= 0 ? '#00c076' : '#ef4444' }}>
                                  {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                    {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                  </div>
                                  <div style={{ fontSize: 13, color: '#aaa' }}>{asset.symbol}</div>
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                                    ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </div>
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 90 }}>
                                  <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>{share.toFixed(1)}%</div>
                                  <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1 }}>
                                    <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: '#00c076', borderRadius: 1 }} />
                                  </div>
                                </td>
                                <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                    <button
                                      onClick={() => setPnlAsset(pnlAsset?.id === asset.id ? null : asset)}
                                      title="Analyse P&L"
                                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .12s',
                                        color: pnlAsset?.id === asset.id ? '#a78bfa' : '#555' }}
                                      onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                                      onMouseOut={e => (e.currentTarget.style.color = pnlAsset?.id === asset.id ? '#a78bfa' : '#555')}>
                                      <Calculator size={13} />
                                    </button>
                                    <button onClick={() => setHiddenTokens([...hiddenTokens, asset.id])}
                                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                                      onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                      onMouseOut={e => (e.currentTarget.style.color = '#555')}
                                      title="Hide">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {currentAssets.length > 0 && (
                        <tfoot>
                          <tr style={{ borderTop: '1px solid #252525' }}>
                            <td colSpan={4} style={{ padding: '10px 16px', fontSize: 13, color: '#aaa', fontWeight: 600 }}>
                              TOTAL LIQUID
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                              ${summary.liquidValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  {unpricedCount > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #1f1f1f', fontSize: 13, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={12} /> {unpricedCount} token{unpricedCount !== 1 ? 's' : ''} with no price data omitted
                    </div>
                  )}
                  </>)}
                </div>

                {/* ── TOKEN P&L PANEL ── */}
                {pnlAsset && (() => {
                  const sym = pnlAsset.symbol.toUpperCase();
                  const assetName = (pnlAsset as any).name || pnlAsset.symbol;
                  const chainKey = pnlAsset.chain;
                  const currentPrice = pnlAsset.price;
                  const plsPriceUsd = prices['pulsechain']?.usd || 0.00005;
                  const ethPriceUsd = prices['ethereum']?.usd || 3400;
                  const nativePriceUsd = chainKey === 'ethereum' ? ethPriceUsd : plsPriceUsd;

                  // Match swaps for this token/chain
                  const chainSwaps = currentTransactions.filter(tx => tx.type === 'swap' && tx.chain === chainKey);
                  const symMatch = (s: string) => s.toUpperCase() === sym || s.toUpperCase().startsWith(sym + ' ');

                  const buys = chainSwaps.filter(tx => symMatch(tx.asset));
                  const sells = chainSwaps.filter(tx => symMatch(tx.counterAsset || ''));
                  const swapCount = buys.length + sells.length;

                  const totalBought = buys.reduce((s, tx) => s + tx.amount, 0);
                  const totalSold = sells.reduce((s, tx) => s + (tx.counterAmount ?? 0), 0);

                  // Cost: what buying cost IN USD (valued at current price since we have no historical)
                  const costUsd = totalBought * currentPrice;
                  // Proceeds: what selling yielded (valueUsd of the received side)
                  const proceedsUsd = sells.reduce((s, tx) => s + (tx.valueUsd ?? 0), 0);

                  // Realized P&L applies only to the sold fraction
                  const soldFraction = totalBought > 0 ? Math.min(totalSold / totalBought, 1) : 0;
                  const realizedCostUsd = costUsd * soldFraction;
                  const realizedPnl = proceedsUsd - realizedCostUsd;

                  // Gas: sum of fees from all matching txs (gas is on the native token)
                  const allMatchTxs = [...buys, ...sells];
                  const gasNative = allMatchTxs.reduce((s, tx) => s + (tx.fee ?? 0), 0);
                  const gasUsd = gasNative * nativePriceUsd;

                  // Holdings
                  const holdingsBal = pnlAsset.balance;
                  const holdingsUsd = pnlAsset.value;

                  const fmt = (n: number, dp = 2) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
                  const fmtTok = (n: number) => n > 1e6 ? `${(n/1e6).toFixed(2)}M`
                    : n > 1000 ? `${(n/1000).toFixed(2)}K`
                    : n.toLocaleString(undefined, { maximumFractionDigits: 4 });

                  // All swap rows for the transaction list (buys + sells merged, sorted by time)
                  const allRows = [
                    ...buys.map(tx => ({ tx, side: 'buy' as const })),
                    ...sells.map(tx => ({ tx, side: 'sell' as const }))
                  ].sort((a, b) => b.tx.timestamp - a.tx.timestamp);

                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #2a1a3a', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                      {/* Gradient top accent */}
                      <div style={{ height: 2, background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }} />

                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {(() => {
                            const logo = (pnlAsset as any).logoUrl || tokenLogos[(pnlAsset as any).address?.toLowerCase?.()] || getTokenLogoUrl(pnlAsset);
                            return logo
                              ? <img src={logo} alt={pnlAsset.symbol} style={{ width: 28, height: 28, borderRadius: '50%' }}
                                  onError={e => { const el = e.target as HTMLImageElement; el.style.display='none'; el.insertAdjacentHTML('afterend', `<div style="width:28px;height:28px;border-radius:50%;background:#2a1a3a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#a78bfa">${pnlAsset.symbol[0]}</div>`); }} />
                              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a1a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>{pnlAsset.symbol[0]}</div>;
                          })()}
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{assetName} Profit &amp; Loss</div>
                            <div style={{ fontSize: 13, color: '#888', marginTop: 1 }}>{swapCount} swap{swapCount !== 1 ? 's' : ''} analysed · approximate (current prices)</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: realizedPnl >= 0 ? '#00c076' : '#ef4444' }}>
                            {realizedPnl >= 0 ? '+' : ''}${fmt(realizedPnl)}
                          </div>
                          <button onClick={() => setPnlAsset(null)}
                            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                            onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                            onMouseOut={e => (e.currentTarget.style.color = '#555')}>
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 14px 14px' }}>
                        {/* REALIZED */}
                        <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px', marginBottom: 10 }}>REALIZED</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Cost</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>${fmt(realizedCostUsd)}</div>
                            </div>
                            <div style={{ color: '#666', fontSize: 16, marginTop: 8 }}>→</div>
                            <div>
                              <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Proceeds</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#00c076' }}>${fmt(proceedsUsd)}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                              <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>P&amp;L</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: realizedPnl >= 0 ? '#00c076' : '#ef4444' }}>
                                {realizedPnl >= 0 ? '+' : ''}${fmt(realizedPnl)}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #242424', display: 'flex', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 13, color: '#888' }}>Bought</div>
                              <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>{fmtTok(totalBought)} {pnlAsset.symbol}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 13, color: '#888' }}>Sold</div>
                              <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>{fmtTok(totalSold)} {pnlAsset.symbol}</div>
                            </div>
                          </div>
                        </div>

                        {/* HOLDINGS */}
                        <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px', marginBottom: 10 }}>HOLDINGS</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Balance</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmtTok(holdingsBal)} {pnlAsset.symbol}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Value</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>${fmt(holdingsUsd)}</div>
                            </div>
                          </div>
                          {gasNative > 0 && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⛽ Gas paid
                              </div>
                              <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>
                                {fmtTok(gasNative)} {chainKey === 'ethereum' ? 'ETH' : 'PLS'} <span style={{ color: '#888' }}>(${fmt(gasUsd)})</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Swap list */}
                      {allRows.length > 0 && (
                        <div style={{ borderTop: '1px solid #1f1f1f' }}>
                          <div style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px' }}>SWAP HISTORY</div>
                          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                            {allRows.map(({ tx, side }, i) => {
                              const isBuy = side === 'buy';
                              const tokenAmt = isBuy ? tx.amount : (tx.counterAmount ?? 0);
                              const otherAmt = isBuy ? (tx.counterAmount ?? 0) : tx.amount;
                              const otherSym = isBuy ? (tx.counterAsset || '?') : tx.asset;
                              const date = new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                              const valUsd = tx.valueUsd ?? 0;
                              return (
                                <div key={tx.id + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px',
                                  borderBottom: '1px solid #111', background: i % 2 === 0 ? 'transparent' : '#0a0a0a' }}
                                  onMouseOver={e => (e.currentTarget.style.background = '#131313')}
                                  onMouseOut={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#0a0a0a')}>
                                  {/* Side badge */}
                                  <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '.5px',
                                    padding: '3px 0', borderRadius: 5,
                                    background: isBuy ? 'rgba(0,192,118,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: isBuy ? '#00c076' : '#ef4444' }}>
                                    {isBuy ? 'BUY' : 'SELL'}
                                  </div>
                                  {/* Amounts */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {isBuy ? '+' : '-'}{fmtTok(tokenAmt)} {pnlAsset.symbol}
                                      <span style={{ color: '#888', fontWeight: 400, marginLeft: 6 }}>
                                        {isBuy ? 'for' : 'sold for'} {fmtTok(otherAmt)} {otherSym}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Value + date */}
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>${fmt(valUsd)}</div>
                                    <div style={{ fontSize: 13, color: '#888' }}>{date}</div>
                                  </div>
                                  {/* Tx link */}
                                  {tx.hash && (
                                    <a href={`${CHAINS[chainKey].explorer}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                                      style={{ color: '#666', flexShrink: 0 }}
                                      onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                                      onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                      <ExternalLink size={11} />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {swapCount === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: 13 }}>
                          No swaps found for {pnlAsset.symbol} on {chainKey}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </motion.div>
            )}

            {activeTab === 'stakes' && (
              <motion.div key="stakes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* pHEX / eHEX total boxes */}
                {(() => {
                  const HEX_ADDR_LC = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
                  const pHexPrice = prices[`pulsechain:${HEX_ADDR_LC}`]?.usd || prices['pulsechain:hex']?.usd || 0;
                  const eHexPrice = prices[`ethereum:${HEX_ADDR_LC}`]?.usd || prices['hex']?.usd || 0;
                  const pHexLiquid = currentAssets.filter(a => a.chain === 'pulsechain' && (a as any).address?.toLowerCase() === HEX_ADDR_LC).reduce((s, a) => s + a.balance, 0);
                  const pHexStaked = currentStakes.filter(s => s.chain === 'pulsechain').reduce((s, st) => s + (st.stakedHex ?? 0) + Number(st.interestHearts || 0n) / 1e8, 0);
                  const eHexLiquid = currentAssets.filter(a => (a.chain === 'ethereum' && (a as any).address?.toLowerCase() === HEX_ADDR_LC) || (a.chain === 'pulsechain' && a.symbol === 'eHEX')).reduce((s, a) => s + a.balance, 0);
                  const eHexStaked = currentStakes.filter(s => s.chain === 'ethereum').reduce((s, st) => s + (st.stakedHex ?? 0) + Number(st.interestHearts || 0n) / 1e8, 0);
                  const pHexTotal = pHexLiquid + pHexStaked;
                  const eHexTotal = eHexLiquid + eHexStaked;
                  const fmt = (n: number) => Math.round(n).toLocaleString('nb-NO', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: isCollapsed('stakes-hex-boxes') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>HEX Totals</div>
                        <button onClick={() => toggleSection('stakes-hex-boxes')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                          onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('stakes-hex-boxes') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('stakes-hex-boxes') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      {!isCollapsed('stakes-hex-boxes') && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }} className="max-sm:grid-cols-1">
                          {[
                            { label: 'Total pHEX', dot: '#fb923c', color: '#fb923c', total: pHexTotal, usd: pHexTotal * pHexPrice, liquid: pHexLiquid, staked: pHexStaked },
                            { label: 'Total eHEX', dot: '#627EEA', color: '#627EEA', total: eHexTotal, usd: eHexTotal * eHexPrice, liquid: eHexLiquid, staked: eHexStaked },
                          ].map(b => (
                            <div key={b.label} style={{ padding: 16, borderRight: '1px solid #1f1f1f' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.dot }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px' }}>{b.label}</span>
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: b.color, letterSpacing: '-0.5px' }}>{fmt(b.total)}</div>
                              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>${b.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{fmt(b.liquid)} liquid · {fmt(b.staked)} staked+yield</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Chain Toggle */}
                {(() => {
                  const filteredStakes = currentStakes.filter(s =>
                    stakeChainFilter === 'all' || s.chain === stakeChainFilter
                  );
                  // Per-chain filtered summary
                  let fStakedHex = 0, fInterestHex = 0, fTShares = 0, fValueUsd = 0, fMaturityHex = 0;
                  filteredStakes.forEach(s => {
                    const sh = s.stakedHex ?? Number(s.stakedHearts) / 1e8;
                    const ih = Number(s.interestHearts || 0n) / 1e8;
                    const ts = s.tShares ?? Number(s.stakeShares) / 1e12;
                    const yk = s.stakeHexYield ?? 0;
                    const hexPriceKey = `${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
                    const hp = prices[hexPriceKey]?.usd || (s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd) || 0.004;
                    fStakedHex += sh;
                    fInterestHex += ih;
                    fTShares += ts;
                    fValueUsd += (sh + ih) * hp;
                    fMaturityHex += sh + yk;
                  });
                  const phexHp = prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0.004;

                  return (
                    <>
                      {/* Chain toggle pill */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 3, background: '#111', border: '1px solid #252525', borderRadius: 8, padding: 3 }}>
                          {(['all', 'pulsechain', 'ethereum'] as const).map(c => (
                            <button key={c} onClick={() => setStakeChainFilter(c)}
                              style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all .12s',
                                background: stakeChainFilter === c ? (c === 'pulsechain' ? '#f739ff' : c === 'ethereum' ? '#627EEA' : '#00c076') : 'transparent',
                                color: stakeChainFilter === c ? '#fff' : '#555' }}>
                              {c === 'all' ? 'All' : c === 'pulsechain' ? 'PulseChain' : 'Ethereum'}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 13, color: '#888' }}>
                          {filteredStakes.length} active stake{filteredStakes.length !== 1 ? 's' : ''} · {fTShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} active T-Shares
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="max-sm:grid-cols-2">
                        {[
                          { label: (stakeChainFilter === 'ethereum' ? 'eHEX' : stakeChainFilter === 'pulsechain' ? 'pHEX' : 'HEX') + ' Staked', val: `${fStakedHex.toLocaleString(undefined, { maximumFractionDigits: 0 })} HEX`, sub: `+${fInterestHex.toLocaleString(undefined, { maximumFractionDigits: 0 })} interest` },
                          { label: 'Value Now', val: `$${fValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${(fStakedHex + fInterestHex).toLocaleString(undefined, { maximumFractionDigits: 0 })} HEX`, color: '#fff' },
                          { label: 'Value at Maturity', val: `$${(fMaturityHex * phexHp).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${fMaturityHex.toLocaleString(undefined, { maximumFractionDigits: 0 })} HEX`, color: '#00c076' },
                          { label: 'Active T-Shares', val: fTShares.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: `≈ ${(fTShares * 6.2).toLocaleString(undefined, { maximumFractionDigits: 0 })} HEX/day` },
                        ].map(({ label, val, sub, color }) => (
                          <div key={label} style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, padding: 18 }}>
                            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: color || '#fff', marginBottom: 2 }}>{val}</div>
                            {sub && <div style={{ fontSize: 13, color: '#aaa' }}>{sub}</div>}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Staking Charts */}
                {currentStakes.length > 0 && (() => {
                  const phexUsd = prices['pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39']?.usd || prices['pulsechain:hex']?.usd || 0;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="max-sm:block max-sm:space-y-3">
                      <StakingPie stakes={currentStakes} hexUsdPrice={phexUsd} />
                      <StakingLadder stakes={currentStakes} />
                    </div>
                  );
                })()}

                {/* LP Positions */}
                {lpPositions.length > 0 && (
                  <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('lp-positions') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>LP Positions</span>
                        <span style={{ fontSize: 13, background: 'rgba(0,192,118,.1)', color: '#00c076', border: '1px solid rgba(0,192,118,.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          {lpPositions.length} pairs · ${lpPositions.reduce((a, b) => a + b.totalUsd, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <button onClick={() => toggleSection('lp-positions')}
                        style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                        onMouseOut={e => (e.currentTarget.style.color = '#555')}
                        title={isCollapsed('lp-positions') ? 'Expand' : 'Collapse'}>
                        {isCollapsed('lp-positions') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                    {!isCollapsed('lp-positions') && <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #242424' }}>
                            {['Pair', 'Token 0', 'Token 1', 'Total USD'].map((h, i) => (
                              <th key={i} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i === 0 ? 'left' : 'right', background: '#0d0d0d', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lpPositions.map(lp => (
                            <tr key={lp.pairAddress} style={{ borderBottom: '1px solid #1e1e1e' }}
                              onMouseOver={e => (e.currentTarget.style.background = '#111')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>{lp.pairName}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13 }}>
                                <div style={{ color: '#fff' }}>{lp.token0Amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {lp.token0Symbol}</div>
                                <div style={{ fontSize: 13, color: '#888' }}>${lp.token0Usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                              </td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13 }}>
                                <div style={{ color: '#fff' }}>{lp.token1Amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {lp.token1Symbol}</div>
                                <div style={{ fontSize: 13, color: '#888' }}>${lp.token1Usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                              </td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#00c076' }}>
                                ${lp.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
                  </div>
                )}

                {/* Farm Positions */}
                {farmPositions.length > 0 && (
                  <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('farm-positions') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Farm Positions (INC Rewards)</span>
                        <span style={{ fontSize: 13, background: 'rgba(251,146,60,.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          {farmPositions.length} pools · {farmPositions.reduce((a, b) => a + b.pendingInc, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} INC pending
                        </span>
                      </div>
                      <button onClick={() => toggleSection('farm-positions')}
                        style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                        onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                        onMouseOut={e => (e.currentTarget.style.color = '#555')}
                        title={isCollapsed('farm-positions') ? 'Expand' : 'Collapse'}>
                        {isCollapsed('farm-positions') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                    {!isCollapsed('farm-positions') && <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #242424' }}>
                            {['Pair', 'Staked LP', 'Pending INC', 'INC Value'].map((h, i) => (
                              <th key={i} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i === 0 ? 'left' : 'right', background: '#0d0d0d', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {farmPositions.map(farm => (
                            <tr key={`${farm.poolId}-${farm.lpAddress}`} style={{ borderBottom: '1px solid #1e1e1e' }}
                              onMouseOver={e => (e.currentTarget.style.background = '#111')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>{farm.pairName}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: '#fff' }}>{farm.stakedLp.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: '#fb923c', fontWeight: 600 }}>{farm.pendingInc.toLocaleString(undefined, { maximumFractionDigits: 4 })} INC</td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#00c076' }}>
                                ${farm.pendingIncUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
                  </div>
                )}

                {/* Stakes table */}
                {(() => {
                  const filteredStakes = currentStakes.filter(s =>
                    stakeChainFilter === 'all' || s.chain === stakeChainFilter
                  );
                  const chainLabel = stakeChainFilter === 'pulsechain' ? 'pHEX' : stakeChainFilter === 'ethereum' ? 'eHEX' : 'HEX';
                  const totHexNow = filteredStakes.reduce((sum, s) => {
                    const sHex = s.stakedHex ?? (Number(s.stakedHearts) / 1e8);
                    const iHex = Number(s.interestHearts || 0n) / 1e8;
                    return sum + sHex + iHex;
                  }, 0);
                  const totUsdNow = filteredStakes.reduce((sum, s) => {
                    const sHex = s.stakedHex ?? (Number(s.stakedHearts) / 1e8);
                    const iHex = Number(s.interestHearts || 0n) / 1e8;
                    const hp = prices[`${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`]?.usd || (s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd) || 0.004;
                    return sum + (sHex + iHex) * hp;
                  }, 0);
                  const totHexMat = filteredStakes.reduce((sum, s) => {
                    const sHex = s.stakedHex ?? (Number(s.stakedHearts) / 1e8);
                    return sum + sHex + (s.stakeHexYield ?? 0);
                  }, 0);
                  const totUsdMat = filteredStakes.reduce((sum, s) => {
                    const sHex = s.stakedHex ?? (Number(s.stakedHearts) / 1e8);
                    const hexMat = sHex + (s.stakeHexYield ?? 0);
                    const hp = prices[`${s.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`]?.usd || (s.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd) || 0.004;
                    return sum + hexMat * hp;
                  }, 0);
                  return (
                    <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: isCollapsed('stakes-table') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{chainLabel} Stakes</span>
                          <span style={{ fontSize: 13, background: 'rgba(249,115,22,.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {filteredStakes.length} active
                          </span>
                        </div>
                        <button onClick={() => toggleSection('stakes-table')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                          onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('stakes-table') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('stakes-table') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                      {!isCollapsed('stakes-table') && (filteredStakes.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>
                          No active HEX stakes found
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #242424' }}>
                                {['', 'Stake ID', 'Chain', 'HEX Now', 'USD Now', 'HEX @ Maturity', 'USD @ Maturity', 'Progress', 'Days Left'].map((h, i) => (
                                  <th key={i} style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#aaa',
                                    textTransform: 'uppercase', letterSpacing: '.5px', textAlign: i <= 2 ? 'left' : 'right',
                                    whiteSpace: 'nowrap', background: '#0d0d0d' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStakes.map((stake) => {
                                const stakedHex = stake.stakedHex ?? (Number(stake.stakedHearts) / 1e8);
                                const interestHex = Number(stake.interestHearts || 0n) / 1e8;
                                const hexNow = stakedHex + interestHex;
                                const hexAtMaturity = stakedHex + (stake.stakeHexYield ?? 0);
                                const endDay = stake.lockedDay + stake.stakedDays;
                                const daysLeft = stake.daysRemaining ?? Math.max(0, endDay - 2400);
                                const hexPriceKey = `${stake.chain}:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39`;
                                const hp = prices[hexPriceKey]?.usd || (stake.chain === 'pulsechain' ? prices['pulsechain:hex']?.usd : prices['hex']?.usd) || 0.004;
                                const usdNow = hexNow * hp;
                                const usdAtMaturity = hexAtMaturity * hp;
                                const isExpanded = expandedStakeIds.has(stake.id);
                                const tShares = stake.tShares ?? (Number(stake.stakeShares) / 1e12);
                                const walletShort = stake.walletAddress ? `${stake.walletAddress.slice(0,6)}…${stake.walletAddress.slice(-4)}` : '';

                                return (
                                  <React.Fragment key={stake.id}>
                                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #151515', transition: 'background .1s', cursor: 'pointer' }}
                                      onClick={() => setExpandedStakeIds(prev => {
                                        const next = new Set(prev);
                                        next.has(stake.id) ? next.delete(stake.id) : next.add(stake.id);
                                        return next;
                                      })}
                                      onMouseOver={e => (e.currentTarget.style.background = '#111')}
                                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                      {/* expand toggle */}
                                      <td style={{ padding: '9px 8px 9px 14px', width: 24 }}>
                                        <span style={{ fontSize: 14, color: '#888', userSelect: 'none' }}>
                                          {isExpanded ? '▾' : '☰'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '9px 14px', fontSize: 13, color: '#fff', fontWeight: 600 }}>#{stake.stakeId}</td>
                                      <td style={{ padding: '9px 14px' }}>
                                        <span style={{ fontSize: 13, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                                          background: stake.chain === 'pulsechain' ? 'rgba(247,57,255,.1)' : 'rgba(98,126,234,.1)',
                                          color: stake.chain === 'pulsechain' ? '#f739ff' : '#627EEA' }}>
                                          {stake.chain === 'pulsechain' ? 'PLS' : 'ETH'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                        {hexNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fb923c' }}>
                                        ${usdNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#00c076' }}>
                                        {hexAtMaturity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#00c076' }}>
                                        ${usdAtMaturity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', minWidth: 100 }}>
                                        <div style={{ fontSize: 13, color: '#fb923c', marginBottom: 3, textAlign: 'right' }}>{stake.progress}%</div>
                                        <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2 }}>
                                          <div style={{ height: '100%', width: `${stake.progress}%`, background: '#fb923c', borderRadius: 2 }} />
                                        </div>
                                      </td>
                                      <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 13, color: daysLeft < 365 ? '#00c076' : '#666' }}>
                                        {daysLeft.toLocaleString()}
                                      </td>
                                    </tr>
                                    {/* Expandable detail row */}
                                    {isExpanded && (
                                      <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                                        <td colSpan={9} style={{ padding: 0, background: '#080808' }}>
                                          <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                                            {[
                                              { label: 'Staked HEX', val: stakedHex.toLocaleString(undefined, { maximumFractionDigits: 0 }), sub: 'Principal' },
                                              { label: 'Accrued Interest', val: `+${interestHex.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'HEX earned so far', color: '#00c076' },
                                              { label: 'Projected Yield', val: `+${(stake.stakeHexYield ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'At full maturity', color: '#00c076' },
                                              { label: 'T-Shares', val: tShares.toLocaleString(undefined, { maximumFractionDigits: 3 }), sub: 'Active T-Shares' },
                                              { label: 'Locked Day', val: stake.lockedDay.toString(), sub: `End Day ${endDay}` },
                                              { label: 'Duration', val: `${stake.stakedDays}d`, sub: `${(stake.stakedDays / 365.25).toFixed(1)} years` },
                                              { label: 'Wallet', val: walletShort || stake.walletLabel || '—', sub: stake.chain === 'pulsechain' ? 'PulseChain' : 'Ethereum' },
                                              { label: 'Gain vs Principal', val: `${hexAtMaturity > 0 ? ((hexAtMaturity / stakedHex - 1) * 100).toFixed(1) : '0.0'}%`, sub: 'Full yield / staked', color: '#00c076' },
                                            ].map(({ label, val, sub, color }) => (
                                              <div key={label}>
                                                <div style={{ fontSize: 13, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: color || '#fff' }}>{val}</div>
                                                <div style={{ fontSize: 13, color: '#888', marginTop: 1 }}>{sub}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ borderTop: '2px solid #2a2a2a', background: '#111' }}>
                                <td colSpan={3} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                  TOTAL ({filteredStakes.length} stakes)
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                                  {totHexNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fb923c' }}>
                                  ${totUsdNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#00c076' }}>
                                  {totHexMat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#00c076' }}>
                                  ${totUsdMat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td colSpan={2} />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* PNL summary row */}
            <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: isCollapsed('history-stats') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Portfolio Stats</div>
                <button onClick={() => toggleSection('history-stats')}
                  style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                  onMouseOut={e => (e.currentTarget.style.color = '#555')}
                  title={isCollapsed('history-stats') ? 'Expand' : 'Collapse'}>
                  {isCollapsed('history-stats') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
              {!isCollapsed('history-stats') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }} className="max-sm:grid-cols-2">
                  {[
                    { label: 'Net Investment', val: `$${Math.abs(summary.netInvestment).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'Total Capital Inflow', color: '#fff' },
                    { label: 'Unified PNL', val: `${summary.unifiedPnl >= 0 ? '+' : ''}$${Math.abs(summary.unifiedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'Portfolio P&L', color: summary.unifiedPnl >= 0 ? '#00c076' : '#ef4444' },
                    { label: 'Realized PNL', val: `${summary.realizedPnl >= 0 ? '+' : ''}$${Math.abs(summary.realizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'From Trades', color: summary.realizedPnl >= 0 ? '#00c076' : '#ef4444' },
                    { label: 'Unrealized PNL', val: `${summary.pnl24h >= 0 ? '+' : ''}$${Math.abs(summary.pnl24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: '24h Change', color: summary.pnl24h >= 0 ? '#00c076' : '#ef4444' },
                  ].map(({ label, val, sub, color }) => (
                    <div key={label} style={{ padding: 18, borderRight: '1px solid #1f1f1f' }}>
                      <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 2 }}>{val}</div>
                      <div style={{ fontSize: 13, color: '#aaa' }}>{sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Received Assets History */}
            <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: isCollapsed('received-assets') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <ArrowDownLeft size={16} style={{ color: '#627EEA' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Received Assets History</span>
                  <select value={receivedChainFilter} onChange={e => setReceivedChainFilter(e.target.value)}
                    style={{ background: '#111', border: '1px solid #252525', borderRadius: 6, color: '#fff', fontSize: 13, padding: '4px 10px', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All Chains</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="base">Base</option>
                    <option value="pulsechain">PulseChain</option>
                  </select>
                  <select value={receivedCoinFilter} onChange={e => setReceivedCoinFilter(e.target.value)}
                    style={{ background: '#111', border: '1px solid #252525', borderRadius: 6, color: '#fff', fontSize: 13, padding: '4px 10px', cursor: 'pointer', outline: 'none' }}>
                    <option value="all">All Coins</option>
                    <option value="ETH">ETH</option>
                    <option value="PLS">PLS</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#aaa', marginBottom: 2, fontWeight: 600, letterSpacing: '.5px' }}>TOTAL RECEIVED</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>${receivedAssetsData.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 13, color: '#aaa' }}>{receivedAssetsData.list.length} transactions</div>
                  </div>
                  <button onClick={() => toggleSection('received-assets')}
                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s', flexShrink: 0 }}
                    onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                    onMouseOut={e => (e.currentTarget.style.color = '#555')}
                    title={isCollapsed('received-assets') ? 'Expand' : 'Collapse'}>
                    {isCollapsed('received-assets') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>
              {!isCollapsed('received-assets') && (<>
              {receivedAssetsData.list.length > 0 && (
                <div style={{ display: 'flex', gap: 1, borderBottom: '1px solid #242424', background: '#0e0e0e' }}>
                  {(Object.entries(receivedAssetsData.byAsset) as [string, { amount: number; valueUsd: number }][]).map(([sym, data]) => (
                    <div key={sym} style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #242424' }}>
                      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4, fontWeight: 700, letterSpacing: '.5px' }}>{sym}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {sym === 'ETH' ? data.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {sym}
                      </div>
                      <div style={{ fontSize: 13, color: '#aaa' }}>${data.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ maxHeight: 480, overflowY: 'auto' }} className="custom-scrollbar">
                {receivedAssetsData.list.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                    {wallets.length === 0 ? 'Add wallets to see received assets history.' : 'No ETH or stablecoin inbound transfers found since 2021.'}
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
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e1e1e', transition: 'background .1s' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#111')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8,
                          background: tx.chain === 'pulsechain' ? 'rgba(247,57,255,.08)' : isEth ? 'rgba(99,102,241,.1)' : 'rgba(0,82,255,.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ArrowDownLeft size={15} style={{ color: tx.chain === 'pulsechain' ? '#f739ff' : isEth ? '#627EEA' : '#60a5fa' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                            +{(isEth || isPls) ? tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tx.asset}
                            <span style={{ fontSize: 13, marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                              background: tx.chain === 'pulsechain' ? 'rgba(247,57,255,.1)' : tx.chain === 'ethereum' ? 'rgba(99,102,241,.12)' : 'rgba(0,82,255,.12)',
                              color: tx.chain === 'pulsechain' ? '#f739ff' : tx.chain === 'ethereum' ? '#818cf8' : '#60a5fa' }}>
                              {tx.chain === 'pulsechain' ? 'PLS' : tx.chain === 'ethereum' ? 'ETH' : 'BASE'}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#aaa', fontFamily: 'monospace', marginTop: 1 }}>
                            {format(new Date(tx.timestamp), 'MMM d, yyyy')} · {tx.from.slice(0, 6)}…{tx.from.slice(-4)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${displayUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <a href={`${tx.chain === 'pulsechain' ? 'https://scan.pulsechain.com' : tx.chain === 'ethereum' ? 'https://etherscan.io' : 'https://basescan.org'}/tx/${tx.hash}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: '#999', textDecoration: 'none', fontFamily: 'monospace' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#627EEA')}
                          onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                          {tx.hash.slice(0, 10)}…
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>)}
            </div>

            {/* Recent Activity */}
            <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: isCollapsed('history-txs') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'rgba(0,192,118,.1)', color: '#00c076', border: '1px solid rgba(0,192,118,.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00c076', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    Live
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isCollapsed('history-txs') && [
                    { value: txTypeFilter, onChange: setTxTypeFilter, options: [['all','All Types'],['transfer_in','Received'],['transfer_out','Sent'],['swap','Swaps']] },
                    { value: txChainFilter, onChange: setTxChainFilter, options: [['all','All Chains'],['pulsechain','PulseChain'],['ethereum','Ethereum'],['base','Base']] },
                    { value: txAssetFilter, onChange: setTxAssetFilter, options: [['all','All Assets'], ...Array.from(new Set(currentTransactions.map(tx => tx.asset))).sort().map(a => [a,a])] },
                  ].map(({ value, onChange, options }, i) => (
                    <select key={i} value={value} onChange={e => onChange(e.target.value)}
                      style={{ background: '#111', border: '1px solid #252525', borderRadius: 6, color: '#fff', fontSize: 13, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ))}
                  <button onClick={() => toggleSection('history-txs')}
                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                    onMouseOut={e => (e.currentTarget.style.color = '#555')}
                    title={isCollapsed('history-txs') ? 'Expand' : 'Collapse'}>
                    {isCollapsed('history-txs') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>
              {!isCollapsed('history-txs') && (<>
              {hiddenTxIds.length > 0 && (
                <div style={{ padding: '6px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#999' }}>{hiddenTxIds.length} hidden transaction{hiddenTxIds.length > 1 ? 's' : ''}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowHiddenTxs(v => !v)}
                      style={{ fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      {showHiddenTxs ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => setHiddenTxIds([])}
                      style={{ fontSize: 13, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Clear all
                    </button>
                  </div>
                </div>
              )}
              <div style={{ maxHeight: 480, overflowY: 'auto' }} className="custom-scrollbar">
                {filteredTransactions.filter(tx => showHiddenTxs || !hiddenTxIds.includes(tx.id)).length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No transactions match your filters.</div>
                ) : filteredTransactions.filter(tx => showHiddenTxs || !hiddenTxIds.includes(tx.id)).map((tx) => {
                  const isHidden = hiddenTxIds.includes(tx.id);
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e1e1e', transition: 'background .1s', opacity: isHidden ? 0.35 : 1 }}
                      onMouseOver={e => (e.currentTarget.style.background = '#111')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: tx.type === 'transfer_in' ? 'rgba(0,192,118,.1)' : tx.type === 'swap' ? 'rgba(139,92,246,.1)' : 'rgba(239,68,68,.1)',
                          color: tx.type === 'transfer_in' ? '#00c076' : tx.type === 'swap' ? '#8b5cf6' : '#ef4444', flexShrink: 0 }}>
                          {tx.type === 'transfer_in' ? <ArrowDownLeft size={15} /> : tx.type === 'swap' ? <RefreshCcw size={15} /> : <ArrowUpRight size={15} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                              background: tx.type === 'transfer_in' ? 'rgba(0,192,118,.1)' : tx.type === 'swap' ? 'rgba(139,92,246,.1)' : 'rgba(239,68,68,.1)',
                              color: tx.type === 'transfer_in' ? '#00c076' : tx.type === 'swap' ? '#8b5cf6' : '#ef4444' }}>
                              {tx.type === 'transfer_in' ? 'Received' : tx.type === 'transfer_out' ? 'Sent' : 'Swap'}
                            </span>
                            <span style={{ fontSize: 13, padding: '1px 6px', borderRadius: 3, fontWeight: 600, background: '#1a1a1a', color: '#aaa' }}>{tx.chain}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                              {tx.type === 'swap' && tx.counterAsset ? `${tx.counterAmount?.toLocaleString()} ${tx.counterAsset} → ${tx.amount.toLocaleString()} ${tx.asset}` : `${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.asset}`}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#aaa', fontFamily: 'monospace' }}>
                            {tx.hash.slice(0, 6)}…{tx.hash.slice(-4)} · {format(tx.timestamp, 'MMM d, yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: tx.type === 'transfer_in' ? '#00c076' : '#fff' }}>
                            {tx.type === 'transfer_in' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.asset}
                          </div>
                          {tx.valueUsd && <div style={{ fontSize: 13, color: '#aaa' }}>${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>}
                        </div>
                        <button
                          title={isHidden ? 'Unhide' : 'Hide'}
                          onClick={() => setHiddenTxIds(prev => isHidden ? prev.filter(id => id !== tx.id) : [...prev, tx.id])}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isHidden ? '#00c076' : '#666', padding: 4, flexShrink: 0 }}
                          onMouseOver={e => (e.currentTarget.style.color = isHidden ? '#00c076' : '#888')}
                          onMouseOut={e => (e.currentTarget.style.color = isHidden ? '#00c076' : '#666')}>
                          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>)}
            </div>
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
          const stakingUsdValue = viewStakes.reduce((s, st) => s + (st.totalValueUsd || st.estimatedValueUsd), 0);
          const totalUsdValue = walletUsdValue + stakingUsdValue;

          return (
            <motion.div key="wallets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Wallet selector tabs */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedWalletAddr('all')}
                  style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .12s',
                    background: isAll ? '#fff' : 'transparent',
                    color: isAll ? '#000' : '#aaa',
                    borderColor: isAll ? '#fff' : '#333' }}>
                  All Wallets
                </button>
                {wallets.map(w => {
                  const isActive = selectedWalletAddr === w.address.toLowerCase();
                  return (
                    <button key={w.address} onClick={() => setSelectedWalletAddr(w.address.toLowerCase())}
                      style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .12s',
                        background: isActive ? '#fff' : 'transparent',
                        color: isActive ? '#000' : '#aaa',
                        borderColor: isActive ? '#fff' : '#333' }}>
                      {w.name}
                    </button>
                  );
                })}
              </div>

              {/* Hero card */}
              <div style={{ background: 'linear-gradient(135deg, #0a2a1a 0%, #061a10 100%)', borderRadius: 16, padding: '24px', border: '1px solid #1a3a2a' }}>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>{isAll ? 'All Wallets' : selWallet?.name}</div>
                {!isAll && <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace', marginBottom: 12 }}>{selWallet?.address}</div>}
                <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
                  ${totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(0,192,118,0.15)', color: '#00c076', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    Wallet ${walletUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    Staking ${stakingUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {/* Chain filter chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'pulsechain', 'ethereum', 'base'] as const).map(c => (
                    <button key={c} onClick={() => setWalletChainFilter(c)}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all .12s',
                        background: walletChainFilter === c ? '#fff' : 'transparent',
                        color: walletChainFilter === c ? '#000' : '#aaa',
                        borderColor: walletChainFilter === c ? '#fff' : '#333' }}>
                      {c === 'all' ? 'All' : c === 'pulsechain' ? 'PulseChain' : c === 'ethereum' ? 'Ethereum' : 'Base'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset list — full Token Positions module */}
              <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: isCollapsed('wallet-holdings') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Token Positions</div>
                    <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>{filteredViewAssets.length} tokens · ${walletUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 3, background: '#111', border: '1px solid #252525', borderRadius: 8, padding: 3 }}>
                      {([['1h','1H'],['6h','6H'],['24h','24H'],['7d','7D']] as const).map(([p, label]) => (
                        <button key={p} onClick={() => setPriceChangePeriod(p)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', border: 'none',
                            background: priceChangePeriod === p ? '#00c076' : 'transparent',
                            color: priceChangePeriod === p ? '#000' : '#555' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => toggleSection('wallet-holdings')}
                      style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                      onMouseOut={e => (e.currentTarget.style.color = '#555')}
                      title={isCollapsed('wallet-holdings') ? 'Expand' : 'Collapse'}>
                      {isCollapsed('wallet-holdings') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                </div>
                {!isCollapsed('wallet-holdings') && (<>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #242424' }}>
                        {[
                          { label: 'Token', field: null, align: 'left' },
                          { label: 'Price', field: null, align: 'right' },
                          { label: priceChangePeriod.toUpperCase(), field: 'change', align: 'right' },
                          { label: 'Amount', field: null, align: 'right' },
                          { label: 'Value', field: 'value', align: 'right' },
                          { label: 'Share', field: null, align: 'right' },
                          { label: '', field: null, align: 'right' },
                        ].map(({ label, field, align }, i) => (
                          <th key={i} onClick={field ? () => {
                            if (assetSortField === field) setAssetSortDir(d => d === 'desc' ? 'asc' : 'desc');
                            else { setAssetSortField(field as any); setAssetSortDir('desc'); }
                          } : undefined}
                            style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600,
                              color: assetSortField === field ? '#00c076' : '#aaa',
                              textTransform: 'uppercase', letterSpacing: '.5px',
                              textAlign: align as any, whiteSpace: 'nowrap', background: '#0d0d0d',
                              cursor: field ? 'pointer' : 'default', userSelect: 'none' }}>
                            {label}{field && assetSortField === field ? (assetSortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredViewAssets.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>
                            No assets found for this wallet
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
                          const logo = (asset as any).logoUrl
                            || tokenLogos[(asset as any).address?.toLowerCase?.()]
                            || getTokenLogoUrl(asset);
                          const explUrl = explorerUrl(asset.chain, addr);
                          const dsUrl = dexScreenerUrl(asset.chain, addr);
                          return (
                            <tr key={asset.id}
                              style={{ borderBottom: '1px solid #1e1e1e', transition: 'background .1s' }}
                              onMouseOver={e => (e.currentTarget.style.background = '#111')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#282828', border: '1px solid #3a3a3a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                                    {logo ? <img src={logo} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden'); }} /> : null}
                                    <span hidden={!!logo}>{asset.symbol[0]}</span>
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      {explUrl
                                        ? <a href={explUrl} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none' }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#00c076')}
                                            onMouseOut={e => (e.currentTarget.style.color = '#fff')}>
                                            {asset.symbol}
                                          </a>
                                        : <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{asset.symbol}</span>}
                                      {asset.isBridged && <span style={{ fontSize: 13, background: '#1a1a2a', color: '#6366f1', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>bridged</span>}
                                      {addr && addr !== 'native' && (
                                        <button onClick={() => navigator.clipboard.writeText(addr)}
                                          title={`Copy CA: ${addr}`}
                                          style={{ padding: '1px 3px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', transition: 'color .12s', lineHeight: 1 }}
                                          onMouseOver={e => (e.currentTarget.style.color = '#aaa')}
                                          onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                          <Copy size={10} />
                                        </button>
                                      )}
                                      {dsUrl && addr !== 'native' && (
                                        <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                                          title="View on DexScreener"
                                          style={{ padding: '1px 3px', color: '#666', transition: 'color .12s', lineHeight: 1, display: 'inline-flex' }}
                                          onMouseOver={e => (e.currentTarget.style.color = '#f4c542')}
                                          onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                          <ExternalLink size={10} />
                                        </a>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHAIN_COLORS[asset.chain] || '#555' }} />
                                      <span style={{ fontSize: 13, color: '#aaa' }}>{asset.chain}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <PriceDisplay price={asset.price} className="" />
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap',
                                fontSize: 13, fontWeight: 600, color: pct >= 0 ? '#00c076' : '#ef4444' }}>
                                {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                  {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </div>
                                <div style={{ fontSize: 13, color: '#aaa' }}>{asset.symbol}</div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                                  ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 90 }}>
                                <div style={{ fontSize: 13, color: '#999', marginBottom: 3 }}>{share.toFixed(1)}%</div>
                                <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1 }}>
                                  <div style={{ height: '100%', width: `${Math.min(share, 100)}%`, background: '#00c076', borderRadius: 1 }} />
                                </div>
                              </td>
                              <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                  <button
                                    onClick={() => setPnlAsset(pnlAsset?.id === asset.id ? null : asset)}
                                    title="Analyse P&L"
                                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .12s',
                                      color: pnlAsset?.id === asset.id ? '#a78bfa' : '#555' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                                    onMouseOut={e => (e.currentTarget.style.color = pnlAsset?.id === asset.id ? '#a78bfa' : '#555')}>
                                    <Calculator size={13} />
                                  </button>
                                  <button onClick={() => setHiddenTokens([...hiddenTokens, asset.id])}
                                    style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseOut={e => (e.currentTarget.style.color = '#555')}
                                    title="Hide">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredViewAssets.length > 0 && (
                      <tfoot>
                        <tr style={{ borderTop: '1px solid #252525' }}>
                          <td colSpan={4} style={{ padding: '10px 16px', fontSize: 13, color: '#aaa', fontWeight: 600 }}>TOTAL LIQUID</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fff' }}>
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

              {/* P&L panel — shown when a token's calculator is clicked */}
              {pnlAsset && (() => {
                const sym = pnlAsset.symbol.toUpperCase();
                const assetName = (pnlAsset as any).name || pnlAsset.symbol;
                const chainKey = pnlAsset.chain;
                const currentPrice = pnlAsset.price;
                const plsPriceUsd = prices['pulsechain']?.usd || 0.00005;
                const ethPriceUsd = prices['ethereum']?.usd || 3400;
                const nativePriceUsd = chainKey === 'ethereum' ? ethPriceUsd : plsPriceUsd;
                const baseTxs = isAll ? currentTransactions : currentTransactions.filter(tx => tx.from?.toLowerCase() === selectedWalletAddr || tx.to?.toLowerCase() === selectedWalletAddr);
                const chainSwaps = baseTxs.filter(tx => tx.type === 'swap' && tx.chain === chainKey);
                const symMatch = (s: string) => s.toUpperCase() === sym || s.toUpperCase().startsWith(sym + ' ');
                const buys = chainSwaps.filter(tx => symMatch(tx.asset));
                const sells = chainSwaps.filter(tx => symMatch(tx.counterAsset || ''));
                const swapCount = buys.length + sells.length;
                const totalBought = buys.reduce((s, tx) => s + tx.amount, 0);
                const totalSold = sells.reduce((s, tx) => s + (tx.counterAmount ?? 0), 0);
                const costUsd = totalBought * currentPrice;
                const proceedsUsd = sells.reduce((s, tx) => s + (tx.valueUsd ?? 0), 0);
                const soldFraction = totalBought > 0 ? Math.min(totalSold / totalBought, 1) : 0;
                const realizedCostUsd = costUsd * soldFraction;
                const realizedPnl = proceedsUsd - realizedCostUsd;
                const gasNative = [...buys, ...sells].reduce((s, tx) => s + (tx.fee ?? 0), 0);
                const gasUsd = gasNative * nativePriceUsd;
                const fmt = (n: number, dp = 2) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
                const fmtTok = (n: number) => n > 1e6 ? `${(n/1e6).toFixed(2)}M` : n > 1000 ? `${(n/1000).toFixed(2)}K` : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
                const allRows = [...buys.map(tx => ({ tx, side: 'buy' as const })), ...sells.map(tx => ({ tx, side: 'sell' as const }))].sort((a, b) => b.tx.timestamp - a.tx.timestamp);
                const logo2 = (pnlAsset as any).logoUrl || tokenLogos[(pnlAsset as any).address?.toLowerCase?.()] || getTokenLogoUrl(pnlAsset);
                return (
                  <div style={{ background: '#0d0d0d', border: '1px solid #2a1a3a', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ height: 2, background: 'linear-gradient(90deg,#7c3aed,#ec4899)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {logo2 ? <img src={logo2} alt={pnlAsset.symbol} style={{ width: 28, height: 28, borderRadius: '50%' }}
                            onError={e => { const el = e.target as HTMLImageElement; el.style.display='none'; el.insertAdjacentHTML('afterend', `<div style="width:28px;height:28px;border-radius:50%;background:#2a1a3a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#a78bfa">${pnlAsset.symbol[0]}</div>`); }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a1a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>{pnlAsset.symbol[0]}</div>}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{assetName} Profit &amp; Loss</div>
                          <div style={{ fontSize: 13, color: '#888', marginTop: 1 }}>{swapCount} swap{swapCount !== 1 ? 's' : ''} · approximate (current prices)</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: realizedPnl >= 0 ? '#00c076' : '#ef4444' }}>{realizedPnl >= 0 ? '+' : ''}${fmt(realizedPnl)}</div>
                        <button onClick={() => setPnlAsset(null)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }} onMouseOver={e => (e.currentTarget.style.color = '#fff')} onMouseOut={e => (e.currentTarget.style.color = '#555')}><X size={16} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 14px 14px' }}>
                      <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px', marginBottom: 10 }}>REALIZED</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div><div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Cost</div><div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>${fmt(realizedCostUsd)}</div></div>
                          <div style={{ color: '#666', fontSize: 16, marginTop: 8 }}>→</div>
                          <div><div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>Proceeds</div><div style={{ fontSize: 14, fontWeight: 700, color: '#00c076' }}>${fmt(proceedsUsd)}</div></div>
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}><div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>P&amp;L</div><div style={{ fontSize: 14, fontWeight: 700, color: realizedPnl >= 0 ? '#00c076' : '#ef4444' }}>{realizedPnl >= 0 ? '+' : ''}${fmt(realizedPnl)}</div></div>
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #242424', display: 'flex', gap: 16 }}>
                          <div><div style={{ fontSize: 13, color: '#888' }}>Bought</div><div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>{fmtTok(totalBought)} {pnlAsset.symbol}</div></div>
                          <div><div style={{ fontSize: 13, color: '#888' }}>Sold</div><div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>{fmtTok(totalSold)} {pnlAsset.symbol}</div></div>
                        </div>
                      </div>
                      <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px', marginBottom: 10 }}>HOLDINGS</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div><div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Balance</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmtTok(pnlAsset.balance)} {pnlAsset.symbol}</div></div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Value</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>${fmt(pnlAsset.value)}</div></div>
                        </div>
                        {gasNative > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #242424', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: 13, color: '#888' }}>⛽ Gas</div>
                            <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>{fmtTok(gasNative)} {chainKey === 'ethereum' ? 'ETH' : 'PLS'} <span style={{ color: '#888' }}>(${fmt(gasUsd)})</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                    {allRows.length > 0 && (
                      <div style={{ borderTop: '1px solid #1f1f1f' }}>
                        <div style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.8px' }}>SWAP HISTORY</div>
                        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                          {allRows.map(({ tx, side }, i) => {
                            const isBuy = side === 'buy';
                            const tokenAmt = isBuy ? tx.amount : (tx.counterAmount ?? 0);
                            const otherAmt = isBuy ? (tx.counterAmount ?? 0) : tx.amount;
                            const otherSym = isBuy ? (tx.counterAsset || '?') : tx.asset;
                            const date = new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                            return (
                              <div key={tx.id + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', borderBottom: '1px solid #111', background: i % 2 === 0 ? 'transparent' : '#0a0a0a' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#131313')} onMouseOut={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#0a0a0a')}>
                                <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '.5px', padding: '3px 0', borderRadius: 5, background: isBuy ? 'rgba(0,192,118,0.12)' : 'rgba(239,68,68,0.12)', color: isBuy ? '#00c076' : '#ef4444' }}>{isBuy ? 'BUY' : 'SELL'}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {isBuy ? '+' : '-'}{fmtTok(tokenAmt)} {pnlAsset.symbol}
                                    <span style={{ color: '#888', fontWeight: 400, marginLeft: 6 }}>{isBuy ? 'for' : 'sold for'} {fmtTok(otherAmt)} {otherSym}</span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>${fmt(tx.valueUsd ?? 0)}</div>
                                  <div style={{ fontSize: 13, color: '#888' }}>{date}</div>
                                </div>
                                {tx.hash && <a href={`${CHAINS[chainKey].explorer}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#666', flexShrink: 0 }} onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')} onMouseOut={e => (e.currentTarget.style.color = '#666')}><ExternalLink size={11} /></a>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {swapCount === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: 13 }}>No swaps found for {pnlAsset.symbol} on {chainKey}</div>}
                  </div>
                );
              })()}

              {/* ── WALLET P&L FROM SWAPS ── */}
              {(() => {
                const baseTxs = isAll
                  ? currentTransactions
                  : currentTransactions.filter(tx => tx.from?.toLowerCase() === selectedWalletAddr || tx.to?.toLowerCase() === selectedWalletAddr);
                const swaps = baseTxs.filter(tx => tx.type === 'swap');
                if (swaps.length === 0) return null;

                // Build per-token P&L map
                const tokenMap: Record<string, { sym: string; chain: string; bought: number; sold: number; proceedsUsd: number; currentPrice: number }> = {};
                swaps.forEach(tx => {
                  // Received (buy) side
                  const buyKey = `${tx.chain}:${tx.asset}`;
                  if (!tokenMap[buyKey]) {
                    const asset = currentAssets.find(a => a.chain === tx.chain && a.symbol.toUpperCase() === tx.asset.toUpperCase());
                    tokenMap[buyKey] = { sym: tx.asset, chain: tx.chain, bought: 0, sold: 0, proceedsUsd: 0, currentPrice: asset?.price ?? 0 };
                  }
                  tokenMap[buyKey].bought += tx.amount;

                  // Sold (counterAsset) side
                  if (tx.counterAsset && tx.counterAmount) {
                    const sellKey = `${tx.chain}:${tx.counterAsset}`;
                    if (!tokenMap[sellKey]) {
                      const asset = currentAssets.find(a => a.chain === tx.chain && a.symbol.toUpperCase() === tx.counterAsset!.toUpperCase());
                      tokenMap[sellKey] = { sym: tx.counterAsset, chain: tx.chain, bought: 0, sold: 0, proceedsUsd: 0, currentPrice: asset?.price ?? 0 };
                    }
                    tokenMap[sellKey].sold += tx.counterAmount;
                    tokenMap[sellKey].proceedsUsd += tx.valueUsd ?? 0; // value received when selling this token
                  }
                });

                const rows = Object.values(tokenMap)
                  .filter(r => r.sold > 0 || r.bought > 0)
                  .map(r => {
                    const costUsd = r.bought * r.currentPrice;
                    const soldFraction = r.bought > 0 ? Math.min(r.sold / r.bought, 1) : 0;
                    const realizedCost = costUsd * soldFraction;
                    const realizedPnl = r.proceedsUsd - realizedCost;
                    return { ...r, costUsd, realizedCost, realizedPnl, swapCount: swaps.filter(tx => tx.asset.toUpperCase() === r.sym.toUpperCase() || tx.counterAsset?.toUpperCase() === r.sym.toUpperCase()).length };
                  })
                  .filter(r => Math.abs(r.realizedPnl) > 0.01 || r.sold > 0)
                  .sort((a, b) => Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl));

                const totalPnl = rows.reduce((s, r) => s + r.realizedPnl, 0);
                const chainDot: Record<string, string> = { pulsechain: '#f739ff', ethereum: '#627EEA', base: '#0052FF' };

                return (
                  <div style={{ background: '#0d0d0d', borderRadius: 14, border: '1px solid #242424', overflow: 'hidden' }}>
                    <div style={{ height: 2, background: 'linear-gradient(90deg,#7c3aed,#ec4899)' }} />
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('wallet-pnl') ? 'none' : '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Trade P&amp;L</span>
                        <span style={{ fontSize: 13, color: '#aaa', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>{swaps.length} swaps · approx.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: totalPnl >= 0 ? '#00c076' : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <button onClick={() => toggleSection('wallet-pnl')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')} onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('wallet-pnl') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('wallet-pnl') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>
                    {!isCollapsed('wallet-pnl') && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                              {['Token', 'Swaps', 'Bought', 'Sold', 'Proceeds', 'Cost (est.)', 'Realized P&L'].map(h => (
                                <th key={h} style={{ padding: '9px 14px', textAlign: h === 'Token' ? 'left' : 'right', fontSize: 13, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(r => (
                              <tr key={r.sym + r.chain} style={{ borderBottom: '1px solid #111', transition: 'background .1s' }}
                                onMouseOver={e => (e.currentTarget.style.background = '#111')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: chainDot[r.chain] || '#555', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.sym}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#aaa' }}>{r.swapCount}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#aaa' }}>{r.bought > 1e6 ? `${(r.bought/1e6).toFixed(2)}M` : r.bought.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#aaa' }}>{r.sold > 1e6 ? `${(r.sold/1e6).toFixed(2)}M` : r.sold.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#00c076' }}>${r.proceedsUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: '#ef4444' }}>${r.realizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: r.realizedPnl >= 0 ? '#00c076' : '#ef4444' }}>
                                  {r.realizedPnl >= 0 ? '+' : ''}${r.realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '1px solid #252525' }}>
                              <td colSpan={6} style={{ padding: '10px 14px', fontSize: 13, color: '#888', fontWeight: 600 }}>TOTAL REALIZED P&amp;L</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: totalPnl >= 0 ? '#00c076' : '#ef4444' }}>
                                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── WALLET TRANSACTIONS (Recent Activity style) ── */}
              {(() => {
                const baseTxs = isAll
                  ? currentTransactions
                  : currentTransactions.filter(tx => tx.from?.toLowerCase() === selectedWalletAddr || tx.to?.toLowerCase() === selectedWalletAddr);
                // Apply same filters as history tab
                const filtered = baseTxs.filter(tx => {
                  if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
                  if (walletChainFilter !== 'all' && tx.chain !== walletChainFilter) return false;
                  if (txAssetFilter !== 'all' && tx.asset !== txAssetFilter) return false;
                  return true;
                });
                if (baseTxs.length === 0) return null;
                return (
                  <div style={{ background: '#0d0d0d', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: isCollapsed('wallet-txs') ? 'none' : '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: 'rgba(0,192,118,.1)', color: '#00c076', border: '1px solid rgba(0,192,118,.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00c076', display: 'inline-block' }} />
                          {baseTxs.length} txs
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isCollapsed('wallet-txs') && [
                          { value: txTypeFilter, onChange: setTxTypeFilter, options: [['all','All Types'],['transfer_in','Received'],['transfer_out','Sent'],['swap','Swaps']] as [string,string][] },
                          { value: txAssetFilter, onChange: setTxAssetFilter, options: [['all','All Assets'], ...Array.from(new Set(baseTxs.map(tx => tx.asset))).sort().map(a => [a,a])] as [string,string][] },
                        ].map(({ value, onChange, options }, i) => (
                          <select key={i} value={value} onChange={e => onChange(e.target.value)}
                            style={{ background: '#111', border: '1px solid #252525', borderRadius: 6, color: '#fff', fontSize: 13, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}>
                            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        ))}
                        <button onClick={() => toggleSection('wallet-txs')}
                          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#888', transition: 'color .12s' }}
                          onMouseOver={e => (e.currentTarget.style.color = '#fff')} onMouseOut={e => (e.currentTarget.style.color = '#555')}
                          title={isCollapsed('wallet-txs') ? 'Expand' : 'Collapse'}>
                          {isCollapsed('wallet-txs') ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>
                    {!isCollapsed('wallet-txs') && (
                      <div style={{ maxHeight: 520, overflowY: 'auto' }} className="custom-scrollbar">
                        {filtered.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No transactions match your filters.</div>
                        ) : filtered.map((tx) => {
                          const isHidden = hiddenTxIds.includes(tx.id);
                          if (isHidden && !showHiddenTxs) return null;
                          return (
                            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e1e1e', transition: 'background .1s', opacity: isHidden ? 0.35 : 1 }}
                              onMouseOver={e => (e.currentTarget.style.background = '#111')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: tx.type === 'transfer_in' ? 'rgba(0,192,118,.1)' : tx.type === 'swap' ? 'rgba(139,92,246,.1)' : 'rgba(239,68,68,.1)',
                                  color: tx.type === 'transfer_in' ? '#00c076' : tx.type === 'swap' ? '#8b5cf6' : '#ef4444', flexShrink: 0 }}>
                                  {tx.type === 'transfer_in' ? <ArrowDownLeft size={15} /> : tx.type === 'swap' ? <RefreshCcw size={15} /> : <ArrowUpRight size={15} />}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 13, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
                                      background: tx.type === 'transfer_in' ? 'rgba(0,192,118,.1)' : tx.type === 'swap' ? 'rgba(139,92,246,.1)' : 'rgba(239,68,68,.1)',
                                      color: tx.type === 'transfer_in' ? '#00c076' : tx.type === 'swap' ? '#8b5cf6' : '#ef4444' }}>
                                      {tx.type === 'transfer_in' ? 'Received' : tx.type === 'transfer_out' ? 'Sent' : 'Swap'}
                                    </span>
                                    <span style={{ fontSize: 13, padding: '1px 6px', borderRadius: 3, fontWeight: 600, background: '#1a1a1a', color: '#aaa' }}>{tx.chain}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                      {tx.type === 'swap' && tx.counterAsset
                                        ? `${tx.counterAmount?.toLocaleString()} ${tx.counterAsset} → ${tx.amount.toLocaleString()} ${tx.asset}`
                                        : `${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.asset}`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 13, color: '#aaa', fontFamily: 'monospace' }}>
                                    {tx.hash.slice(0, 6)}…{tx.hash.slice(-4)} · {format(tx.timestamp, 'MMM d, yyyy HH:mm')}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: tx.type === 'transfer_in' ? '#00c076' : '#fff' }}>
                                    {tx.type === 'transfer_in' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.asset}
                                  </div>
                                  {tx.valueUsd && <div style={{ fontSize: 13, color: '#aaa' }}>${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>}
                                </div>
                                <a href={`${CHAINS[tx.chain].explorer}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#666', padding: 4 }}
                                  onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')} onMouseOut={e => (e.currentTarget.style.color = '#666')}>
                                  <ExternalLink size={13} />
                                </a>
                                <button title={isHidden ? 'Unhide' : 'Hide'}
                                  onClick={() => setHiddenTxIds(prev => isHidden ? prev.filter(id => id !== tx.id) : [...prev, tx.id])}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isHidden ? '#00c076' : '#666', padding: 4 }}
                                  onMouseOver={e => (e.currentTarget.style.color = isHidden ? '#00c076' : '#888')} onMouseOut={e => (e.currentTarget.style.color = isHidden ? '#00c076' : '#666')}>
                                  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: '#080808', borderTop: '1px solid #1f1f1f' }}>
        {([
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'assets',   label: 'Assets',   icon: WalletIcon },
          { id: 'stakes',   label: 'Stakes',   icon: Layers },
          { id: 'history',  label: 'History',  icon: History },
          { id: 'wallets',  label: 'Wallets',  icon: User },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{
              minHeight: 56,
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === id ? '#00c076' : '#555',
              transition: 'color .12s',
            }}>
            <Icon size={20} />
            <span style={{ fontSize: 13, fontWeight: activeTab === id ? 700 : 500, lineHeight: 1 }}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Add Wallet Modal */}
      <AnimatePresence>
        {isAddingWallet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingWallet(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Add New Wallet</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 ml-1">Wallet Address</label>
                  <input 
                    type="text" 
                    placeholder="0x..."
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2 ml-1">Wallet Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="My Main Wallet"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsAddingWallet(false)}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addWallet}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-sm hover:opacity-90 transition-all"
                  >
                    Add Wallet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsApiKeyModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#0d0d0d', border: '1px solid #242424', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Settings size={18} style={{ color: '#00c076' }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>API Keys</span>
              </div>
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 14, lineHeight: 1.6 }}>
                One key covers both Ethereum and Base.<br/>
                Get yours free at <span style={{ color: '#627EEA' }}>etherscan.io/myapikey</span>
              </p>
              <input type="text" placeholder="Paste your Etherscan API key..."
                value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
                style={{ width: '100%', background: '#111', border: '1px solid #252525', borderRadius: 8,
                  color: '#fff', fontSize: 13, padding: '10px 14px', outline: 'none',
                  fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setIsApiKeyModalOpen(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#1a1a1a',
                    border: '1px solid #222', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
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
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#00c076',
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
