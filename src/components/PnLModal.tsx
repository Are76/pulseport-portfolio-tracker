import React, { useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import type { Asset, Transaction } from '../types';
import { CHAINS } from '../constants';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtD(n: number, dp = 2): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000)    return `$${(a / 1_000).toFixed(1)}K`;
  return `$${a.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}
function fmtT(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(a / 1e3).toFixed(1)}K`;
  return a.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
function sign(n: number): string { return n >= 0 ? '+' : '−'; }
function pnlColor(n: number): string { return n >= 0 ? 'var(--positive)' : 'var(--negative)'; }

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PnLModalProps {
  asset: Asset;
  transactions: Transaction[];
  prices: Record<string, { usd: number; usd_24h_change?: number }>;
  /** optional logo src override */
  logoUrl?: string;
  onClose: () => void;
  /** wallet address to scope txs (undefined = all wallets) */
  walletAddress?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PnLModal({ asset, transactions, prices, logoUrl, onClose, walletAddress }: PnLModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sym       = asset.symbol.toUpperCase();
  const chainKey  = asset.chain as keyof typeof CHAINS;
  const assetName = (asset as any).name || asset.symbol;
  const plsPrice  = prices['pulsechain']?.usd || 0.00005;
  const ethPrice  = prices['ethereum']?.usd || 3400;
  const nativePrice = chainKey === 'ethereum' ? ethPrice : plsPrice;

  // Scope transactions to wallet if provided
  const baseTxs = walletAddress
    ? transactions.filter(tx => tx.from?.toLowerCase() === walletAddress || tx.to?.toLowerCase() === walletAddress)
    : transactions;

  const chainSwaps = baseTxs.filter(tx => tx.type === 'swap' && tx.chain === chainKey);
  const symMatch   = (s: string) => s.toUpperCase() === sym || s.toUpperCase().startsWith(sym + ' ');

  const buys  = chainSwaps.filter(tx => symMatch(tx.asset));
  const sells = chainSwaps.filter(tx => symMatch(tx.counterAsset || ''));
  const swapCount = buys.length + sells.length;

  const totalBought   = buys.reduce((s, tx) => s + tx.amount, 0);
  const totalSold     = sells.reduce((s, tx) => s + (tx.counterAmount ?? 0), 0);
  const proceedsUsd   = sells.reduce((s, tx) => s + (tx.valueUsd ?? 0), 0);
  const costUsd       = totalBought * asset.price;
  const soldFraction  = totalBought > 0 ? Math.min(totalSold / totalBought, 1) : 0;
  const realizedCostUsd = costUsd * soldFraction;
  const realizedPnl   = proceedsUsd - realizedCostUsd;

  const gasNative = [...buys, ...sells].reduce((s, tx) => s + (tx.fee ?? 0), 0);
  const gasUsd    = gasNative * nativePrice;

  const holdingsBal = asset.balance;
  const holdingsUsd = asset.value;
  const totalPnl    = realizedPnl + holdingsUsd;

  const realPct = costUsd > 0 ? (realizedPnl / costUsd) * 100 : null;

  const allRows = [
    ...buys.map(tx => ({ tx, side: 'buy' as const })),
    ...sells.map(tx => ({ tx, side: 'sell' as const })),
  ].sort((a, b) => b.tx.timestamp - a.tx.timestamp);

  const [imgErr, setImgErr] = React.useState(false);
  const explorerBase = CHAINS[chainKey]?.explorer ?? 'https://scan.pulsechain.com';

  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    // Full-screen backdrop
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'modalFadeIn 0.15s ease',
      }}>

      {/* Modal panel */}
      <div
        style={{
          position: 'relative',
          width: '100%', maxWidth: 680,
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(139,92,246,0.28)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 0 80px rgba(139,92,246,0.18), 0 24px 48px rgba(0,0,0,0.50)',
          animation: 'modalSlideIn 0.18s ease',
        }}>

        {/* Purple top accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, transparent 5%, #7c3aed 30%, #a855f7 50%, #ec4899 70%, transparent 95%)',
          flexShrink: 0,
        }} />

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(168,85,247,0.04) 50%, transparent 100%)',
          borderBottom: '1px solid rgba(139,92,246,0.12)',
          flexShrink: 0,
        }}>
          {/* Left: logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.12) 100%)',
              border: '1.5px solid rgba(139,92,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', fontSize: 16, fontWeight: 800, color: '#a78bfa',
            }}>
              {logoUrl && !imgErr ? (
                <img src={logoUrl} alt={sym} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={() => setImgErr(true)} />
              ) : sym[0]}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.015em' }}>
                  {assetName}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#a78bfa',
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                  padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.55px',
                }}>
                  P&amp;L Analysis
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                {swapCount} swap{swapCount !== 1 ? 's' : ''} analyzed
                {chainKey && (
                  <span style={{ color: 'var(--fg-subtle)', marginLeft: 4 }}>
                    · {chainKey === 'ethereum' ? 'Ethereum' : chainKey === 'pulsechain' ? 'PulseChain' : chainKey}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Total P&L + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 3 }}>
                Total P&amp;L
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                {totalPnl >= 0
                  ? <TrendingUp size={14} style={{ color: pnlColor(totalPnl), flexShrink: 0 }} />
                  : <TrendingDown size={14} style={{ color: pnlColor(totalPnl), flexShrink: 0 }} />}
                <span style={{
                  fontSize: 20, fontWeight: 800, color: pnlColor(totalPnl),
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.03em',
                }}>
                  {sign(totalPnl)}{fmtD(Math.abs(totalPnl))}
                </span>
              </div>
              {realPct !== null && (
                <div style={{ fontSize: 11, color: pnlColor(realizedPnl), fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', marginTop: 1 }}>
                  {sign(realPct)}{Math.abs(realPct).toFixed(1)}% on cost
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.20)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fg-muted)', transition: 'all .15s', flexShrink: 0,
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.20)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)';
              }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">

          {/* Two-col stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 20px',
          }}>
            {/* REALIZED */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 14, padding: '16px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>
                Realized
              </div>
              {/* Cost → Proceeds → Net */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Cost basis</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--negative)', fontFamily: 'JetBrains Mono, monospace' }}>
                    −{fmtD(realizedCostUsd)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Proceeds</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--positive)', fontFamily: 'JetBrains Mono, monospace' }}>
                    +{fmtD(proceedsUsd)}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Net P&amp;L</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: pnlColor(realizedPnl), fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                    {sign(realizedPnl)}{fmtD(Math.abs(realizedPnl))}
                  </span>
                </div>
              </div>
              {/* Bought / Sold */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Bought</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtT(totalBought)} {sym}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Sold</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtT(totalSold)} {sym}
                  </div>
                </div>
              </div>
            </div>

            {/* HOLDINGS */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 14, padding: '16px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>
                Holdings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Balance</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtT(holdingsBal)} {sym}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Current value</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtD(holdingsUsd)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Price</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {asset.price < 0.001 ? asset.price.toExponential(3) : asset.price < 1 ? `$${asset.price.toFixed(6)}` : fmtD(asset.price, 4)}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Unrealized</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: holdingsUsd > 0 ? '#a78bfa' : 'var(--fg-subtle)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.02em' }}>
                    {holdingsUsd > 0 ? `+${fmtD(holdingsUsd)}` : '—'}
                  </span>
                </div>
              </div>
              {/* Gas */}
              {gasNative > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>⛽ Gas paid</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtT(gasNative)} {chainKey === 'ethereum' ? 'ETH' : 'PLS'} <span style={{ color: 'var(--fg-subtle)' }}>({fmtD(gasUsd)})</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Swap history list ── */}
          {allRows.length > 0 && (
            <div style={{ margin: '0 20px 20px', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 16px', background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.7px', flex: 1 }}>
                  Swap History
                </span>
                <a href={`${explorerBase}/search?q=${sym}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textDecoration: 'none', transition: 'color .12s' }}
                  onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = '#a78bfa')}
                  onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-subtle)')}>
                  Explorer <ExternalLink size={10} />
                </a>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }} className="custom-scrollbar">
                {allRows.map(({ tx, side }, i) => {
                  const isBuy    = side === 'buy';
                  const tokenAmt = isBuy ? tx.amount : (tx.counterAmount ?? 0);
                  const otherAmt = isBuy ? (tx.counterAmount ?? 0) : tx.amount;
                  const otherSym = isBuy ? (tx.counterAsset || '?') : tx.asset;
                  const date     = new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
                  return (
                    <div key={tx.id + i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                        borderBottom: i < allRows.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background .1s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Buy / Sell badge */}
                      <div style={{
                        width: 38, flexShrink: 0, textAlign: 'center',
                        fontSize: 10, fontWeight: 800, letterSpacing: '.5px', padding: '3px 0', borderRadius: 5,
                        background: isBuy ? 'rgba(0,255,159,0.12)' : 'rgba(239,68,68,0.12)',
                        color: isBuy ? 'var(--positive)' : 'var(--negative)',
                        border: `1px solid ${isBuy ? 'rgba(0,255,159,0.20)' : 'rgba(239,68,68,0.20)'}`,
                      }}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </div>

                      {/* Amounts */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isBuy ? '+' : '−'}{fmtT(tokenAmt)} {sym}
                          <span style={{ color: 'var(--fg-subtle)', fontWeight: 400, marginLeft: 6 }}>
                            {isBuy ? 'for' : 'sold for'} {fmtT(otherAmt)} {otherSym}
                          </span>
                        </div>
                      </div>

                      {/* Value + date */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {fmtD(tx.valueUsd ?? 0)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{date}</div>
                      </div>

                      {/* Tx explorer link */}
                      {tx.hash && (
                        <a href={`${explorerBase}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--fg-subtle)', flexShrink: 0, transition: 'color .12s' }}
                          onMouseOver={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#a78bfa')}
                          onMouseOut={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg-subtle)')}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No swaps fallback */}
          {swapCount === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 14 }}>
              No swap transactions found for <strong style={{ color: 'var(--fg-muted)' }}>{sym}</strong>
              {chainKey && <span> on {chainKey === 'pulsechain' ? 'PulseChain' : 'Ethereum'}</span>}.
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ padding: '0 20px 16px', fontSize: 10, color: 'var(--fg-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
            P&amp;L is estimated from on-chain transaction values at time of execution.
            Cost = USD value of acquisitions · Proceeds = USD value of disposals.
          </div>
        </div>
      </div>
    </div>
  );
}
