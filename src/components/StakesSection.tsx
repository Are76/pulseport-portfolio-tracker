import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Zap, Lock, TrendingUp, Activity, Layers, Filter } from 'lucide-react';
import type { HexStake } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StakesSectionProps {
  stakes: HexStake[];
  hexUsdPrice: number;
  phexUsdPrice: number;
  ehexUsdPrice: number;
  walletAddresses?: string[];
  walletLabels?: Record<string, string>;
}

type StakeFilter = 'all' | 'phex' | 'ehex' | 'ending-soon' | 'matured';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHex(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function shortenAddr(addr: string): string {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

// ── StakingPie sub-component ──────────────────────────────────────────────────

function StakingPie({ stakes, hexUsdPrice }: { stakes: HexStake[]; hexUsdPrice: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!stakes || stakes.length === 0) return null;

  const byWallet: Record<string, { label: string; tShares: number; stakedHex: number; yieldHex: number; totalHex: number; totalUsd: number; count: number }> = {};
  stakes.forEach(s => {
    const key = s.walletAddress ?? s.id;
    const label = s.walletLabel ?? shortenAddr(key.length >= 10 ? key : s.id);
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
  const large = sorted.filter(w => totalTShares === 0 || w.tShares / totalTShares >= threshold);
  const small = sorted.filter(w => totalTShares > 0 && w.tShares / totalTShares < threshold);
  const chartData = small.length > 0
    ? [...large, { label: 'Others', tShares: small.reduce((a, b) => a + b.tShares, 0), totalUsd: small.reduce((a, b) => a + b.totalUsd, 0), count: small.reduce((a, b) => a + b.count, 0) }]
    : large;

  const GRADIENT = ['#00FF9F', '#6346FF', '#f739ff', '#fb923c', '#3b82f6', '#a855f7'];
  const getColor = (i: number) => GRADIENT[i % GRADIENT.length];

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
      <g>
        <text x={cx} y={cy - 14} textAnchor="middle" fill="var(--fg-subtle)" fontSize="12">{payload.label}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--fg)" fontSize="18" fontWeight="700">{fmtHex(payload.tShares)}</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="var(--fg-subtle)" fontSize="11">T-Shares</text>
        <Pie data={[]} cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
          startAngle={startAngle} endAngle={endAngle} fill={fill} dataKey="value" />
      </g>
    );
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
          Stake Distribution
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{fmtUsd(totalUsd)}</span>
          {' · '}<span style={{ color: '#fb923c' }}>{fmtHex(totalHex)} HEX</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="tShares"
            activeIndex={activeIndex} activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}>
            {chartData.map((_, i) => <Cell key={i} fill={getColor(i)} />)}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="chart-tooltip" style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#00FF9F', marginBottom: 6 }}>{d.label}</div>
                  <div>T-Shares: {fmtHex(d.tShares)}</div>
                  <div>Value: {fmtUsd(d.totalUsd)}</div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── StakingLadder sub-component ───────────────────────────────────────────────

function StakingLadder({ stakes }: { stakes: HexStake[] }) {
  if (!stakes || stakes.length === 0) return null;
  const bucketSize = 30;
  const buckets: Record<number, { totalShares: number; stakeCount: number; bucketRange: string }> = {};

  stakes.forEach(stake => {
    const days = Math.max(0, Math.min(5555, Math.floor(stake.daysRemaining ?? 0)));
    const bucketIdx = Math.floor(days / bucketSize);
    if (!buckets[bucketIdx]) {
      const start = bucketIdx * bucketSize;
      buckets[bucketIdx] = { totalShares: 0, stakeCount: 0, bucketRange: `${start}–${start + bucketSize - 1}d` };
    }
    buckets[bucketIdx].totalShares += (stake.tShares ?? 0);
    buckets[bucketIdx].stakeCount += 1;
  });

  const chartData = Object.entries(buckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idx, d]) => ({ daysRemaining: Number(idx) * bucketSize + bucketSize / 2, ...d }));

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
        Staking Ladder
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="daysRemaining" tick={{ fill: 'var(--fg-subtle)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false}
            label={{ value: 'Days Remaining', position: 'insideBottom', offset: -10, fill: 'var(--fg-subtle)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--fg-subtle)', fontSize: 12 }} axisLine={false} tickLine={false} scale="log" domain={['auto', 'auto']} allowDataOverflow={false} />
          <RechartsTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="chart-tooltip" style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#00FF9F', marginBottom: 6 }}>Days: {d.bucketRange}</div>
                  <div>T-Shares: {d.totalShares.toFixed(2)}</div>
                  <div>Stakes: {d.stakeCount}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="totalShares" fill="rgba(99,70,255,0.75)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main StakesSection component ──────────────────────────────────────────────

export function StakesSection({
  stakes,
  hexUsdPrice,
  phexUsdPrice,
  ehexUsdPrice,
  walletLabels = {},
}: StakesSectionProps) {
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>('all');

  // ── Derived totals ──────────────────────────────────────────────────────────

  const activeStakes = stakes.filter(s => (s.daysRemaining ?? 0) > 0);

  const dailyYieldHex = activeStakes.reduce((sum, s) => {
    return sum + (s.stakeHexYield ?? 0) / Math.max(1, s.daysRemaining ?? 1);
  }, 0);
  const dailyYieldUsd = dailyYieldHex * hexUsdPrice;

  const pHexStakes = stakes.filter(s => s.chain === 'pulsechain');
  const eHexStakes = stakes.filter(s => s.chain === 'ethereum');

  const totalPHex = pHexStakes.reduce((s, st) => s + (st.stakedHex ?? 0), 0);
  const totalEHex = eHexStakes.reduce((s, st) => s + (st.stakedHex ?? 0), 0);

  const totalHexStaked = stakes.reduce((s, st) => s + (st.stakedHex ?? 0), 0);
  const totalCurrentValueUsd = stakes.reduce((s, st) => s + (st.estimatedValueUsd ?? 0), 0);
  const totalMaturityValueUsd = stakes.reduce((s, st) => s + (st.totalValueUsd ?? st.estimatedValueUsd ?? 0), 0);
  const totalTShares = stakes.reduce((s, st) => s + (st.tShares ?? 0), 0);

  // ── Filter stakes ───────────────────────────────────────────────────────────

  const filteredStakes = stakes.filter(s => {
    if (stakeFilter === 'phex') return s.chain === 'pulsechain';
    if (stakeFilter === 'ehex') return s.chain === 'ethereum';
    if (stakeFilter === 'ending-soon') return (s.daysRemaining ?? 0) > 0 && (s.daysRemaining ?? 0) <= 90;
    if (stakeFilter === 'matured') return (s.daysRemaining ?? 0) <= 0;
    return true;
  });

  const filterCounts: Record<StakeFilter, number> = {
    all: stakes.length,
    phex: pHexStakes.length,
    ehex: eHexStakes.length,
    'ending-soon': stakes.filter(s => (s.daysRemaining ?? 0) > 0 && (s.daysRemaining ?? 0) <= 90).length,
    matured: stakes.filter(s => (s.daysRemaining ?? 0) <= 0).length,
  };

  // ── Filter pill labels ──────────────────────────────────────────────────────

  const filterPills: { id: StakeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'phex', label: 'pHEX' },
    { id: 'ehex', label: 'eHEX' },
    { id: 'ending-soon', label: 'Ending Soon' },
    { id: 'matured', label: 'Matured' },
  ];

  // ── Progress bar color ──────────────────────────────────────────────────────
  function progressColor(pct: number): string {
    if (pct > 50) return '#00FF9F';
    if (pct >= 25) return '#f97316';
    return '#ef4444';
  }

  // ── Days left badge class ───────────────────────────────────────────────────
  function daysClass(d: number): string {
    if (d <= 30) return 'days-left-expiring';
    if (d <= 180) return 'days-left-soon';
    return 'days-left-healthy';
  }

  function fmtDays(d: number): string {
    return d >= 365 ? `${(d / 365).toFixed(1)}y` : `${d.toLocaleString(undefined, { maximumFractionDigits: 0 })}d`;
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (stakes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-purple)', border: '1px solid var(--accent-purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={24} style={{ color: '#a78bfa' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>No HEX Stakes Found</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 320, lineHeight: 1.6 }}>
            Add a wallet with active HEX stakes on PulseChain or Ethereum to see your staking dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 1. Hero: Daily HEX Yield ─────────────────────────────────────── */}
      <div className="stakes-hero-card">
        {/* Left: icon + title + big number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'rgba(99,70,255,0.18)', border: '1px solid var(--accent-purple-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              Daily HEX Yield
            </div>
            <div className="tabular-nums" style={{
              fontSize: 36, fontWeight: 800, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--positive)', letterSpacing: '-0.03em',
            }}>
              {fmtHex(dailyYieldHex)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
              {fmtUsd(dailyYieldUsd)} · estimated across all active stakes
            </div>
          </div>
        </div>

        {/* Right: Weekly / Monthly / Annual mini-stats */}
        <div className="stakes-hero-mini-stats" style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          {[
            { label: 'Weekly', hex: dailyYieldHex * 7, usd: dailyYieldUsd * 7 },
            { label: 'Monthly', hex: dailyYieldHex * 30, usd: dailyYieldUsd * 30 },
            { label: 'Annual', hex: dailyYieldHex * 365, usd: dailyYieldUsd * 365 },
          ].map(({ label, hex, usd }) => (
            <div key={label} style={{
              background: 'rgba(99,70,255,0.08)', border: '1px solid var(--accent-purple-border)',
              borderRadius: 12, padding: '12px 16px', minWidth: 90,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{label}</div>
              <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 800, color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
                {fmtHex(hex)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{fmtUsd(usd)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. HEX Totals ────────────────────────────────────────────────── */}
      <div className="stakes-totals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* pHEX */}
        <div className="stakes-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--chain-pulse)', boxShadow: '0 0 6px var(--chain-pulse)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Total pHEX Staked</span>
          </div>
          <div className="tabular-nums" style={{ fontSize: 28, fontWeight: 800, color: 'var(--chain-pulse)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmtHex(totalPHex)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>
            {fmtUsd(totalPHex * phexUsdPrice)} · {pHexStakes.length} stake{pHexStakes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* eHEX */}
        <div className="stakes-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--chain-eth)', boxShadow: '0 0 6px var(--chain-eth)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Total eHEX Staked</span>
          </div>
          <div className="tabular-nums" style={{ fontSize: 28, fontWeight: 800, color: 'var(--chain-eth)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmtHex(totalEHex)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>
            {fmtUsd(totalEHex * ehexUsdPrice)} · {eHexStakes.length} stake{eHexStakes.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── 3. Key Metrics ───────────────────────────────────────────────── */}
      <div className="stakes-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {/* HEX Staked */}
        <div className="stakes-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Layers size={14} style={{ color: 'var(--fg-subtle)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>HEX Staked</div>
          </div>
          <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginBottom: 4 }}>
            {fmtHex(totalHexStaked)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{stakes.length} total stakes</div>
        </div>

        {/* Current Value */}
        <div className="stakes-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Activity size={14} style={{ color: 'var(--fg-subtle)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Current Value</div>
          </div>
          <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginBottom: 4 }}>
            {fmtUsd(totalCurrentValueUsd)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>at current HEX price</div>
        </div>

        {/* Value at Maturity — highlighted */}
        <div className="stakes-metric-card stakes-maturity-highlight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <TrendingUp size={14} style={{ color: 'var(--positive)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--positive)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Value at Maturity</div>
          </div>
          <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginBottom: 4 }}>
            {fmtUsd(totalMaturityValueUsd)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>projected at full maturity</div>
        </div>

        {/* Active T-Shares */}
        <div className="stakes-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Filter size={14} style={{ color: 'var(--fg-subtle)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Active T-Shares</div>
          </div>
          <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginBottom: 4 }}>
            {totalTShares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>across all chains</div>
        </div>
      </div>

      {/* ── 4. Charts ────────────────────────────────────────────────────── */}
      <div className="stakes-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <StakingPie stakes={activeStakes.length > 0 ? activeStakes : stakes} hexUsdPrice={hexUsdPrice} />
        <StakingLadder stakes={activeStakes.length > 0 ? activeStakes : stakes} />
      </div>

      {/* ── 5. Individual Stakes Table ───────────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

        {/* Table header + filter pills */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>HEX Stakes</span>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
                background: 'rgba(99,70,255,0.12)', border: '1px solid var(--accent-purple-border)', color: '#a78bfa',
              }}>
                {filteredStakes.length} shown
              </span>
            </div>
          </div>

          {/* Filter pills */}
          <div className="stakes-filter-tabs">
            {filterPills.map(({ id, label }) => (
              <button
                key={id}
                className={`stake-filter-pill${stakeFilter === id ? ' active' : ''}`}
                onClick={() => setStakeFilter(id)}
              >
                {label}
                {filterCounts[id] > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>
                    {filterCounts[id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table body */}
        {filteredStakes.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 14 }}>
            <Lock size={28} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
            No stakes match this filter
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="stakes-table">
              <thead>
                <tr>
                  <th>Stake ID</th>
                  <th>Chain</th>
                  <th className="col-hide-mobile">Wallet</th>
                  <th>HEX Staked</th>
                  <th className="col-hide-mobile">T-Shares</th>
                  <th className="col-hide-mobile">Progress</th>
                  <th>Days Left</th>
                  <th className="col-hide-mobile">Yield</th>
                  <th>Current Value</th>
                  <th className="col-hide-mobile">Maturity Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredStakes.map(stake => {
                  const stakedHex = stake.stakedHex ?? Number(stake.stakedHearts) / 1e8;
                  const hexPrice = stake.chain === 'pulsechain' ? phexUsdPrice : ehexUsdPrice;
                  const currentValueUsd = stake.estimatedValueUsd ?? (stakedHex * hexPrice);
                  const maturityHex = stakedHex + (stake.stakeHexYield ?? 0);
                  const maturityValueUsd = stake.totalValueUsd ?? (maturityHex * hexPrice);
                  const tShares = stake.tShares ?? Number(stake.stakeShares) / 1e12;
                  const daysLeft = stake.daysRemaining ?? 0;
                  const yieldHex = stake.stakeHexYield ?? 0;
                  const walletLabel = stake.walletLabel
                    ?? (stake.walletAddress ? (walletLabels[stake.walletAddress] ?? shortenAddr(stake.walletAddress)) : '—');

                  return (
                    <tr key={stake.id}>
                      <td style={{ color: 'var(--fg)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        #{stake.stakeId}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: stake.chain === 'pulsechain' ? 'rgba(247,57,255,0.10)' : 'rgba(138,164,240,0.10)',
                          color: stake.chain === 'pulsechain' ? 'var(--chain-pulse)' : 'var(--chain-eth)',
                          border: `1px solid ${stake.chain === 'pulsechain' ? 'rgba(247,57,255,0.20)' : 'rgba(138,164,240,0.20)'}`,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: stake.chain === 'pulsechain' ? 'var(--chain-pulse)' : 'var(--chain-eth)',
                            flexShrink: 0,
                          }} />
                          {stake.chain === 'pulsechain' ? 'pHEX' : 'eHEX'}
                        </span>
                      </td>
                      <td className="col-hide-mobile" style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {walletLabel}
                      </td>
                      <td style={{ color: 'var(--fg)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                        {fmtHex(stakedHex)}
                      </td>
                      <td className="col-hide-mobile" style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                        {tShares.toFixed(2)}
                      </td>
                      <td className="col-hide-mobile" style={{ minWidth: 80 }}>
                        <div className="stake-progress-bar">
                          <div
                            className="stake-progress-fill"
                            style={{ width: `${stake.progress}%`, background: progressColor(stake.progress) }}
                          />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 3, textAlign: 'right' }}>
                          {stake.progress}%
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`days-left-pill ${daysClass(daysLeft)}`}>
                          {fmtDays(daysLeft)}
                        </span>
                      </td>
                      <td className="col-hide-mobile" style={{ textAlign: 'right', color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        +{fmtHex(yieldHex)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--fg)', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtUsd(currentValueUsd)}
                      </td>
                      <td className="col-hide-mobile" style={{ textAlign: 'right', color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                        {fmtUsd(maturityValueUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Total ({filteredStakes.length})
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtHex(filteredStakes.reduce((s, st) => s + (st.stakedHex ?? 0), 0))}
                  </td>
                  <td className="col-hide-mobile" />
                  <td className="col-hide-mobile" />
                  <td />
                  <td className="col-hide-mobile" style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace" }}>
                    +{fmtHex(filteredStakes.reduce((s, st) => s + (st.stakeHexYield ?? 0), 0))}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtUsd(filteredStakes.reduce((s, st) => s + (st.estimatedValueUsd ?? 0), 0))}
                  </td>
                  <td className="col-hide-mobile" style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--positive)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtUsd(filteredStakes.reduce((s, st) => s + (st.totalValueUsd ?? st.estimatedValueUsd ?? 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
