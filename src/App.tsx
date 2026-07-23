import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────────────────────

type NavPage = 'dashboard' | 'holdings' | 'stakes' | 'liquidity' | 'transactions' | 'bridge' | 'insights'
type TimeRange = '1D' | '7D' | '30D' | '90D' | '1Y'

// ─── Mock Data ───────────────────────────────────────────────────────────────

const portfolioHistory: Record<TimeRange, { t: string; v: number }[]> = {
  '1D': Array.from({ length: 24 }, (_, i) => ({
    t: `${i}:00`,
    v: 84200 + Math.sin(i * 0.5) * 3000 + Math.random() * 1500,
  })),
  '7D': Array.from({ length: 7 }, (_, i) => ({
    t: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    v: 72000 + i * 2100 + Math.random() * 2000,
  })),
  '30D': Array.from({ length: 30 }, (_, i) => ({
    t: `${i + 1}`,
    v: 60000 + i * 900 + Math.random() * 3000,
  })),
  '90D': Array.from({ length: 12 }, (_, i) => ({
    t: `W${i + 1}`,
    v: 45000 + i * 3500 + Math.random() * 4000,
  })),
  '1Y': Array.from({ length: 12 }, (_, i) => ({
    t: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    v: 28000 + i * 5200 + Math.random() * 5000,
  })),
}

const holdings = [
  { symbol: 'PLS', name: 'PulseChain', balance: 4_820_000, price: 0.0000472, value: 227.50, pnl: 12.4, pnlAmt: 25.10, chain: 'PLS', color: '#7c3aed' },
  { symbol: 'PLSX', name: 'PulseX', balance: 1_240_000, price: 0.0000158, value: 19.59, pnl: -3.2, pnlAmt: -0.65, chain: 'PLS', color: '#8b5cf6' },
  { symbol: 'HEX', name: 'HEX', balance: 382_000, price: 0.00831, value: 3_174.42, pnl: 5.7, pnlAmt: 171.10, chain: 'PLS', color: '#06b6d4' },
  { symbol: 'EHEX', name: 'ETH HEX', balance: 124_500, price: 0.00912, value: 1_135.44, pnl: 2.1, pnlAmt: 23.39, chain: 'ETH', color: '#0ea5e9' },
  { symbol: 'INC', name: 'Incentive', balance: 8_760, price: 0.1840, value: 1_611.84, pnl: 8.9, pnlAmt: 132.06, chain: 'PLS', color: '#a78bfa' },
  { symbol: 'WETH', name: 'Wrapped ETH', balance: 0.412, price: 3_204.80, value: 1_320.38, pnl: -1.4, pnlAmt: -18.76, chain: 'ETH', color: '#64748b' },
  { symbol: 'DAI', name: 'Dai Stablecoin', balance: 2_840, price: 1.0001, value: 2_840.28, pnl: 0.01, pnlAmt: 0.28, chain: 'ETH', color: '#f59e0b' },
  { symbol: 'USDC', name: 'USD Coin', balance: 1_500, price: 1.0000, value: 1_500.00, pnl: 0.0, pnlAmt: 0.00, chain: 'PLS', color: '#3b82f6' },
]

const stakes = [
  { id: 'stake-001', token: 'HEX', principal: 180_000, shares: 4_820_000, start: '2023-01-15', end: '2026-01-15', progress: 71, interest: 42_800, pnl: 23.8 },
  { id: 'stake-002', token: 'HEX', principal: 202_000, shares: 6_140_000, start: '2023-06-01', end: '2028-06-01', progress: 34, interest: 28_400, pnl: 14.1 },
  { id: 'stake-003', token: 'PHEX', principal: 95_000, shares: 1_900_000, start: '2024-03-10', end: '2025-03-10', progress: 91, interest: 18_200, pnl: 19.2 },
]

const liquidityPositions = [
  { pair: 'PLS / DAI', dex: 'PulseX V2', value: 4_820.40, share: 0.0012, fees24h: 12.40, apr: 24.8, range: [0.0000410, 0.0000530] as [number,number] },
  { pair: 'HEX / PLS', dex: 'PulseX V2', value: 2_140.80, share: 0.0004, fees24h: 8.20, apr: 31.2, range: [0.1720, 0.2100] as [number,number] },
  { pair: 'PLSX / HEX', dex: 'PulseX V1', value: 980.20, share: 0.0002, fees24h: 3.10, apr: 18.6, range: null },
]

const transactions = [
  { hash: '0x4a2f...c81d', type: 'Swap', from: 'PLS', to: 'HEX', amount: '$428.20', time: '2m ago', status: 'confirmed', chain: 'PLS' },
  { hash: '0x8b3e...f42a', type: 'Add Liquidity', from: 'PLS', to: 'DAI', amount: '$840.00', time: '18m ago', status: 'confirmed', chain: 'PLS' },
  { hash: '0x1d7c...291b', type: 'Stake', from: 'HEX', to: '—', amount: '$1,240.50', time: '2h ago', status: 'confirmed', chain: 'PLS' },
  { hash: '0x9f2a...b83e', type: 'Bridge', from: 'ETH', to: 'PLS', amount: '$2,100.00', time: '4h ago', status: 'confirmed', chain: 'ETH' },
  { hash: '0x3c8d...a41f', type: 'Swap', from: 'WETH', to: 'DAI', amount: '$310.80', time: '6h ago', status: 'confirmed', chain: 'ETH' },
  { hash: '0x7e1b...d92c', type: 'Unstake', from: 'HEX', to: '—', amount: '$580.20', time: '1d ago', status: 'confirmed', chain: 'PLS' },
]

const CHAIN_COLORS: Record<string, string> = {
  PLS: '#7c3aed',
  ETH: '#627eea',
  BNB: '#f0b90b',
}

const pieData = [
  { name: 'HEX', value: 3174.42, color: '#06b6d4' },
  { name: 'DAI', value: 2840.28, color: '#f59e0b' },
  { name: 'INC', value: 1611.84, color: '#a78bfa' },
  { name: 'USDC', value: 1500.00, color: '#3b82f6' },
  { name: 'WETH', value: 1320.38, color: '#64748b' },
  { name: 'EHEX', value: 1135.44, color: '#0ea5e9' },
  { name: 'Other', value: 247.09, color: '#374151' },
]

const gainersData = [
  { symbol: 'INC', change: 8.9 },
  { symbol: 'HEX', change: 5.7 },
  { symbol: 'EHEX', change: 2.1 },
  { symbol: 'DAI', change: 0.01 },
  { symbol: 'USDC', change: 0.0 },
  { symbol: 'WETH', change: -1.4 },
  { symbol: 'PLSX', change: -3.2 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtUsd(n: number) {
  return '$' + fmt(n)
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return fmt(n)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <span className="relative inline-flex">
      <span className="w-2 h-2 rounded-full bg-emerald-500 relative z-10" />
      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
    </span>
  )
}

function StatCard({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-1 transition-all duration-200 hover:border-purple-700/40 group"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{label}</span>
      <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-family-mono)' }}>{value}</span>
      {sub && (
        <span className="text-xs font-medium" style={{
          color: up === undefined ? 'var(--muted-foreground)' : up ? 'var(--gain)' : 'var(--loss)',
          fontFamily: 'var(--font-family-mono)',
        }}>{sub}</span>
      )}
    </div>
  )
}

function ChainBadge({ chain }: { chain: string }) {
  const color = CHAIN_COLORS[chain] ?? '#6b7280'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: color + '22', color, border: `1px solid ${color}44`, fontFamily: 'var(--font-family-mono)' }}>
      {chain}
    </span>
  )
}

function ProgressBar({ value, color = '#7c3aed' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function DashboardPage() {
  const [range, setRange] = useState<TimeRange>('7D')
  const data = portfolioHistory[range]
  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const totalPnlAmt = holdings.reduce((s, h) => s + h.pnlAmt, 0)
  const pnlPct = (totalPnlAmt / (totalValue - totalPnlAmt)) * 100

  const chartMin = Math.min(...data.map(d => d.v)) * 0.995
  const chartMax = Math.max(...data.map(d => d.v)) * 1.005

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg px-3 py-2 text-xs border" style={{ background: 'var(--card)', borderColor: 'var(--border)', fontFamily: 'var(--font-family-mono)' }}>
        <div style={{ color: 'var(--muted-foreground)' }}>{label}</div>
        <div className="font-semibold text-sm">{fmtUsd(payload[0].value)}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="TOTAL VALUE" value={fmtUsd(totalValue)} sub={`${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}% all time`} up={pnlPct >= 0} />
        <StatCard label="24H PNL" value={`${totalPnlAmt >= 0 ? '+' : ''}${fmtUsd(Math.abs(totalPnlAmt))}`} sub={`${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}%`} up={totalPnlAmt >= 0} />
        <StatCard label="STAKED VALUE" value={fmtUsd(6840.20)} sub="3 active stakes" />
        <StatCard label="LP VALUE" value={fmtUsd(7941.40)} sub="3 positions" />
      </div>

      {/* Chart + Allocation */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <LiveDot />
                <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Portfolio Value</span>
              </div>
              <div className="text-3xl font-semibold tracking-tight mt-1" style={{ fontFamily: 'var(--font-family-mono)' }}>
                {fmtUsd(data[data.length - 1]?.v ?? totalValue)}
              </div>
            </div>
            <div className="flex gap-1">
              {(['1D', '7D', '30D', '90D', '1Y'] as TimeRange[]).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    fontFamily: 'var(--font-family-mono)',
                    background: range === r ? 'var(--primary)' : 'var(--secondary)',
                    color: range === r ? '#fff' : 'var(--muted-foreground)',
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[chartMin, chartMax]} hide />
              <Tooltip content={customTooltip} />
              <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="text-sm font-medium mb-4" style={{ color: 'var(--muted-foreground)' }}>Allocation</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-family-mono)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-3">
            {pieData.slice(0, 5).map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs" style={{ fontFamily: 'var(--font-family-mono)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span style={{ color: 'var(--foreground)' }}>{d.name}</span>
                </div>
                <span style={{ color: 'var(--muted-foreground)' }}>{((d.value / totalValue) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gainers / Losers bar */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="text-sm font-medium mb-4" style={{ color: 'var(--muted-foreground)' }}>24h Performance</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={gainersData} barCategoryGap="30%">
            <XAxis dataKey="symbol" tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-family-mono)', fontSize: 12 }} />
            <Bar dataKey="change" radius={[4, 4, 0, 0]}>
              {gainersData.map((entry, i) => <Cell key={i} fill={entry.change >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions preview */}
      <div className="rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-medium">Recent Activity</span>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>last 24h</span>
        </div>
        {transactions.slice(0, 4).map((tx) => (
          <div key={tx.hash} className="flex items-center justify-between px-5 py-3 border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--secondary)', color: 'var(--primary)', fontFamily: 'var(--font-family-mono)' }}>
                {tx.type[0]}
              </div>
              <div>
                <div className="text-sm font-medium">{tx.type}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{tx.from}{tx.to !== '—' ? ` → ${tx.to}` : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ChainBadge chain={tx.chain} />
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>{tx.amount}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{tx.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HoldingsPage() {
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'symbol'>('value')
  const [filterChain, setFilterChain] = useState<'ALL' | 'PLS' | 'ETH'>('ALL')

  const sorted = [...holdings]
    .filter(h => filterChain === 'ALL' || h.chain === filterChain)
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value
      if (sortBy === 'pnl') return b.pnl - a.pnl
      return a.symbol.localeCompare(b.symbol)
    })

  const total = sorted.reduce((s, h) => s + h.value, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Holdings</h2>
          <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
            {sorted.length} assets · {fmtUsd(total)}
          </div>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PLS', 'ETH'] as const).map(c => (
            <button key={c} onClick={() => setFilterChain(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                fontFamily: 'var(--font-family-mono)',
                background: filterChain === c ? 'var(--primary)' : 'var(--secondary)',
                color: filterChain === c ? '#fff' : 'var(--muted-foreground)',
              }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {[
                { label: 'Asset', key: 'symbol' },
                { label: 'Balance', key: null },
                { label: 'Price', key: null },
                { label: 'Value', key: 'value' },
                { label: '24h PnL', key: 'pnl' },
                { label: 'Chain', key: null },
                { label: 'Share', key: null },
              ].map(col => (
                <th key={col.label}
                  className={`px-4 py-3 text-left font-medium text-xs tracking-wide ${col.key ? 'cursor-pointer hover:text-purple-400' : ''}`}
                  style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}
                  onClick={() => col.key && setSortBy(col.key as any)}>
                  {col.label} {col.key === sortBy ? '↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <tr key={h.symbol} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: h.color + '33', border: `1px solid ${h.color}55`, color: h.color }}>
                      {h.symbol[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{h.symbol}</div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{h.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  <span className="text-sm">{fmtCompact(h.balance)}</span>
                </td>
                <td className="px-4 py-3.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  <span className="text-sm">{h.price < 0.001 ? h.price.toFixed(8) : h.price.toFixed(4)}</span>
                </td>
                <td className="px-4 py-3.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  <span className="text-sm font-medium">{fmtUsd(h.value)}</span>
                </td>
                <td className="px-4 py-3.5" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  <div>
                    <span className="text-sm font-medium" style={{ color: h.pnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                      {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)}%
                    </span>
                    <div className="text-xs" style={{ color: h.pnlAmt >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                      {h.pnlAmt >= 0 ? '+' : ''}{fmtUsd(Math.abs(h.pnlAmt))}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5"><ChainBadge chain={h.chain} /></td>
                <td className="px-4 py-3.5">
                  <div className="w-20">
                    <div className="text-xs mb-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
                      {((h.value / total) * 100).toFixed(1)}%
                    </div>
                    <ProgressBar value={(h.value / total) * 100} color={h.color} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StakesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">HEX Stakes</h2>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
          {stakes.length} active · {fmtUsd(stakes.reduce((s, st) => s + (st.principal * 0.00831), 0))} principal
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {stakes.map(stake => (
          <div key={stake.id} className="rounded-xl border p-5 hover:border-purple-700/40 transition-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stake.token}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#06b6d422', color: '#06b6d4', border: '1px solid #06b6d433', fontFamily: 'var(--font-family-mono)' }}>
                    Active
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{stake.id}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: 'var(--gain)', fontFamily: 'var(--font-family-mono)' }}>+{stake.pnl}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'PRINCIPAL', value: fmtCompact(stake.principal) },
                { label: 'SHARES', value: fmtCompact(stake.shares) },
                { label: 'INTEREST', value: fmtCompact(stake.interest) },
                { label: 'PROGRESS', value: `${stake.progress}%` },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs mb-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{item.label}</div>
                  <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
                <span>{stake.start}</span>
                <span>{stake.end}</span>
              </div>
              <ProgressBar value={stake.progress} color={stake.progress > 80 ? '#10b981' : '#7c3aed'} />
            </div>

            <button className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiquidityPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Liquidity Positions</h2>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
          {liquidityPositions.length} positions · {fmtUsd(liquidityPositions.reduce((s, p) => s + p.value, 0))} total
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {liquidityPositions.map((pos) => (
          <div key={pos.pair} className="rounded-xl border p-5 hover:border-cyan-700/30 transition-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="font-semibold text-base">{pos.pair}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{pos.dex}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtUsd(pos.value)}</div>
                <div className="text-xs" style={{ color: 'var(--gain)', fontFamily: 'var(--font-family-mono)' }}>{pos.apr.toFixed(1)}% APR</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'POOL SHARE', value: `${(pos.share * 100).toFixed(4)}%` },
                { label: '24H FEES', value: fmtUsd(pos.fees24h) },
                { label: 'RANGE', value: pos.range ? `${pos.range[0].toFixed(7)}–${pos.range[1].toFixed(7)}` : 'Full range' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs mb-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{item.label}</div>
                  <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TransactionsPage() {
  const [filter, setFilter] = useState<'All' | 'Swap' | 'Stake' | 'Bridge'>('All')
  const filtered = transactions.filter(t => filter === 'All' || t.type === filter || (filter === 'Stake' && (t.type === 'Stake' || t.type === 'Unstake')))

  const TYPE_ICONS: Record<string, string> = {
    Swap: '⇄', 'Add Liquidity': '+', Stake: '⬡', Unstake: '○', Bridge: '⇒',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{filtered.length} results</div>
        </div>
        <div className="flex gap-2">
          {(['All', 'Swap', 'Stake', 'Bridge'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ fontFamily: 'var(--font-family-mono)', background: filter === f ? 'var(--primary)' : 'var(--secondary)', color: filter === f ? '#fff' : 'var(--muted-foreground)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {filtered.map((tx) => (
          <div key={tx.hash} className="flex items-center justify-between px-5 py-4 border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                style={{ background: 'var(--secondary)', color: 'var(--primary)' }}>
                {TYPE_ICONS[tx.type] ?? '·'}
              </div>
              <div>
                <div className="font-medium text-sm">{tx.type}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
                  {tx.hash}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {tx.to !== '—' && (
                <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--secondary)', fontFamily: 'var(--font-family-mono)' }}>{tx.from}</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--secondary)', fontFamily: 'var(--font-family-mono)' }}>{tx.to}</span>
                </div>
              )}
              <ChainBadge chain={tx.chain} />
              <div className="text-right min-w-[80px]">
                <div className="font-semibold text-sm" style={{ fontFamily: 'var(--font-family-mono)' }}>{tx.amount}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{tx.time}</div>
              </div>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gain)', flexShrink: 0 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BridgePage() {
  const [fromChain, setFromChain] = useState('ETH')
  const [toChain, setToChain] = useState('PLS')
  const [amount, setAmount] = useState('1000')

  const chains = ['ETH', 'PLS', 'BNB']

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold">Bridge</h2>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Transfer assets across chains</div>
      </div>
      <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>FROM</div>
            <div className="flex gap-2">
              {chains.map(c => (
                <button key={c} onClick={() => setFromChain(c)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ fontFamily: 'var(--font-family-mono)', background: fromChain === c ? (CHAIN_COLORS[c] + '33') : 'var(--secondary)', color: fromChain === c ? CHAIN_COLORS[c] : 'var(--muted-foreground)', border: `1px solid ${fromChain === c ? CHAIN_COLORS[c] + '55' : 'transparent'}` }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="text-2xl" style={{ color: 'var(--muted-foreground)', marginTop: 20 }}>⇄</div>
          <div className="flex-1">
            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>TO</div>
            <div className="flex gap-2">
              {chains.map(c => (
                <button key={c} onClick={() => setToChain(c)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ fontFamily: 'var(--font-family-mono)', background: toChain === c ? (CHAIN_COLORS[c] + '33') : 'var(--secondary)', color: toChain === c ? CHAIN_COLORS[c] : 'var(--muted-foreground)', border: `1px solid ${toChain === c ? CHAIN_COLORS[c] + '55' : 'transparent'}` }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>AMOUNT (USDC)</div>
          <div className="flex items-center gap-2 rounded-lg px-4 py-3 border" style={{ background: 'var(--secondary)', borderColor: 'var(--border)' }}>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold outline-none"
              style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--foreground)' }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>≈ ${Number(amount).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-5 text-xs" style={{ fontFamily: 'var(--font-family-mono)' }}>
          {[
            ['Bridge Fee', '0.05%'],
            ['Estimated Time', '~3–5 min'],
            ['You Receive', `$${(Number(amount) * 0.9995).toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: 'var(--muted-foreground)' }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        <button className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: '#fff' }}>
          Bridge {fromChain} → {toChain}
        </button>
      </div>

      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="text-sm font-medium mb-3">Recent Bridges</div>
        {transactions.filter(t => t.type === 'Bridge').map(tx => (
          <div key={tx.hash} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gain)' }} />
              <div>
                <div className="text-sm">{tx.from} → {tx.to}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{tx.hash}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>{tx.amount}</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{tx.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsPage() {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const topHolder = [...holdings].sort((a, b) => b.value - a.value)[0]
  const bestPerformer = [...holdings].sort((a, b) => b.pnl - a.pnl)[0]

  const metrics = [
    { label: 'Portfolio Score', value: '87 / 100', sub: 'Well diversified', color: '#10b981' },
    { label: 'Risk Level', value: 'Medium', sub: 'Balanced exposure', color: '#f59e0b' },
    { label: 'Largest Position', value: topHolder.symbol, sub: `${((topHolder.value / totalValue) * 100).toFixed(1)}% of portfolio`, color: '#7c3aed' },
    { label: 'Best Performer', value: bestPerformer.symbol, sub: `+${bestPerformer.pnl.toFixed(1)}% 24h`, color: '#10b981' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Portfolio Insights</h2>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>AI-powered analysis of your holdings</div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color, fontFamily: 'var(--font-family-mono)' }}>{m.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="text-sm font-medium mb-4">Chain Exposure</div>
        {[
          { chain: 'PLS', pct: 68, value: totalValue * 0.68, color: '#7c3aed' },
          { chain: 'ETH', pct: 32, value: totalValue * 0.32, color: '#627eea' },
        ].map(item => (
          <div key={item.chain} className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <ChainBadge chain={item.chain} />
                <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--muted-foreground)' }}>{item.pct}%</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)' }}>{fmtUsd(item.value)}</span>
            </div>
            <ProgressBar value={item.pct} color={item.color} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="text-sm font-medium mb-4">Recommendations</div>
        <div className="flex flex-col gap-3">
          {[
            { icon: '💡', text: 'Consider rebalancing PLSX — it represents only 0.2% of your portfolio while showing negative momentum.', type: 'info' },
            { icon: '📈', text: 'INC has strong 24h performance (+8.9%). Your position size may be too small to maximize gains.', type: 'gain' },
            { icon: '⚠️', text: 'Stake maturity approaching: PHEX stake ends in ~34 days. Prepare an end-stake strategy.', type: 'warn' },
          ].map((rec, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg" style={{ background: 'var(--secondary)' }}>
              <span className="text-lg flex-shrink-0">{rec.icon}</span>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{rec.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: NavPage; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'holdings', label: 'Holdings', icon: '⬡' },
  { id: 'stakes', label: 'Stakes', icon: '⬟' },
  { id: 'liquidity', label: 'Liquidity', icon: '◎' },
  { id: 'transactions', label: 'Transactions', icon: '↕' },
  { id: 'bridge', label: 'Bridge', icon: '⇄' },
  { id: 'insights', label: 'Insights', icon: '◉' },
]

function Sidebar({ page, onNav, collapsed }: { page: NavPage; onNav: (p: NavPage) => void; collapsed: boolean }) {
  return (
    <aside
      className="flex flex-col h-full border-r transition-all duration-300"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        width: collapsed ? 64 : 220,
        minWidth: collapsed ? 64 : 220,
      }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
          P
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm tracking-tight">PulsePort</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>Portfolio</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {NAV_ITEMS.map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left"
              style={{
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--muted-foreground)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--secondary)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <span className="text-base flex-shrink-0" style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Wallet status */}
      {!collapsed && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-lg p-3" style={{ background: 'var(--secondary)' }}>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot />
              <span className="text-xs font-medium">Connected</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)' }}>
              0x4f2a...8c91
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ page, onToggleSidebar }: { page: NavPage; onToggleSidebar: () => void }) {
  const [tick, setTick] = useState(0)
  const plsPrice = 0.0000472 + Math.sin(tick * 0.08) * 0.000001

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const label = NAV_ITEMS.find(n => n.id === page)?.label ?? page

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--muted-foreground)' }}>
          ☰
        </button>
        <h1 className="text-base font-semibold">{label}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Live price ticker */}
        <div className="hidden md:flex items-center gap-3 text-xs" style={{ fontFamily: 'var(--font-family-mono)' }}>
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--muted-foreground)' }}>PLS</span>
            <span className="font-medium">${plsPrice.toFixed(8)}</span>
            <span style={{ color: 'var(--gain)' }}>+3.2%</span>
          </div>
          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--muted-foreground)' }}>HEX</span>
            <span className="font-medium">$0.00831</span>
            <span style={{ color: 'var(--gain)' }}>+5.7%</span>
          </div>
        </div>

        {/* Connect wallet btn */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: '#fff' }}>
          <span className="text-xs">◈</span>
          <span className="hidden sm:inline">0x4f2a...8c91</span>
          <span className="sm:hidden">Wallet</span>
        </button>
      </div>
    </header>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<NavPage>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const PAGE_MAP: Record<NavPage, JSX.Element> = {
    dashboard: <DashboardPage />,
    holdings: <HoldingsPage />,
    stakes: <StakesPage />,
    liquidity: <LiquidityPage />,
    transactions: <TransactionsPage />,
    bridge: <BridgePage />,
    insights: <InsightsPage />,
  }

  return (
    <div className="flex h-screen overflow-hidden mesh-bg" style={{ background: 'var(--background)' }}>
      <Sidebar page={page} onNav={setPage} collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header page={page} onToggleSidebar={() => setSidebarCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto p-6">
          {PAGE_MAP[page]}
        </main>
      </div>
    </div>
  )
}
