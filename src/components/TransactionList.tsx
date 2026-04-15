/**
 * TransactionList — unified, mobile-first transaction card list.
 *
 * This is the single source of truth for rendering transactions across all
 * views (History tab, Wallets tab, Assets tab).
 *
 * Props:
 *   transactions  — already-normalized Transaction[] to display
 *   onSelect      — callback fired when a card is clicked (for parent-managed expansion)
 *   compact       — smaller card variant (less padding, no type icon)
 *   hideIds       — IDs that should be hidden (dimmed) unless showHidden is true
 *   onToggleHide  — called with tx.id to toggle hidden state
 *   showHidden    — if true, hidden rows are still shown (at reduced opacity)
 *   wallets       — address→label map used to show "You" instead of raw hex
 */

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCcw, ExternalLink, EyeOff, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../types';
import type { Wallet } from '../types';

// ── Explorer base URLs per chain ──────────────────────────────────────────────
const EXPLORER: Record<string, string> = {
  pulsechain: 'https://scan.pulsechain.com',
  ethereum:   'https://etherscan.io',
  base:       'https://basescan.org',
};

// ── Chain dot colours ─────────────────────────────────────────────────────────
const CHAIN_DOT: Record<string, string> = {
  pulsechain: '#f739ff',
  ethereum:   '#627EEA',
  base:       '#0052ff',
};

// ── Type → visual config ──────────────────────────────────────────────────────
function txVisual(type: Transaction['type']) {
  switch (type) {
    case 'deposit': return { icon: ArrowDownLeft, bg: 'rgba(0,255,159,.12)', color: 'var(--positive)', label: 'Received' };
    case 'withdraw': return { icon: ArrowUpRight,  bg: 'rgba(244,63,94,.12)', color: 'var(--negative)', label: 'Sent' };
    case 'swap':    return { icon: RefreshCcw,      bg: 'rgba(139,92,246,.12)', color: '#a78bfa', label: 'Swap' };
  }
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface TransactionListProps {
  transactions: Transaction[];
  onSelect?: (tx: Transaction) => void;
  /** Show smaller rows with less padding */
  compact?: boolean;
  hideIds?: string[];
  onToggleHide?: (id: string) => void;
  showHidden?: boolean;
  /** Used to resolve "You" label for from/to addresses */
  wallets?: Wallet[];
  /** Optional token logo URLs keyed by lowercase contract address or symbol */
  tokenLogos?: Record<string, string>;
  /** Message shown when the list is empty after filtering */
  emptyMessage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TransactionList({
  transactions,
  onSelect,
  compact = false,
  hideIds = [],
  onToggleHide,
  showHidden = false,
  wallets = [],
  tokenLogos = {},
  emptyMessage = 'No transactions found.',
}: TransactionListProps) {
  const walletSet = React.useMemo(
    () => new Set(wallets.map(w => w.address.toLowerCase())),
    [wallets],
  );

  const walletLabel = React.useCallback(
    (addr: string) => {
      if (!addr) return '';
      const lower = addr.toLowerCase();
      if (walletSet.has(lower)) {
        const w = wallets.find(w => w.address.toLowerCase() === lower);
        return w?.name || 'You';
      }
      return shortAddr(addr);
    },
    [wallets, walletSet],
  );

  if (transactions.length === 0) {
    return (
      <div className="tx-list-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="tx-list">
      {transactions.map(tx => {
        const isHidden = hideIds.includes(tx.id);
        if (isHidden && !showHidden) return null;

        const { icon: Icon, bg, color, label } = txVisual(tx.type);
        const amtStr = tx.type === 'swap' && tx.counterAsset
          ? `${(tx.counterAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.counterAsset} → ${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.asset}`
          : `${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tx.asset}`;

        const signPrefix = tx.type === 'deposit' ? '+' : tx.type === 'withdraw' ? '−' : '';

        // Wallet context: who sent / who received
        const contextLine = tx.type === 'deposit'
          ? `From ${walletLabel(tx.from)}`
          : tx.type === 'withdraw'
          ? `To ${walletLabel(tx.to)}`
          : `${walletLabel(tx.from)} → ${walletLabel(tx.to)}`;

        const explorerUrl = `${EXPLORER[tx.chain] ?? 'https://scan.pulsechain.com'}/tx/${tx.hash}`;

        return (
          <div
            key={tx.id}
            className={`tx-card${compact ? ' tx-card--compact' : ''}${isHidden ? ' tx-card--hidden' : ''}`}
            onClick={() => onSelect?.(tx)}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={onSelect ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tx); } } : undefined}
          >
            {/* ── Left: icon + meta ── */}
            <div className="tx-card__left">
              {!compact && (
                <div className="tx-card__icon" style={{ background: bg, color }}>
                  <Icon size={14} />
                </div>
              )}
              <div className="tx-card__meta">
                {/* Row 1: type badge + chain dot + date */}
                <div className="tx-card__badges">
                  <span className="tx-card__type-badge" style={{ background: bg, color }}>
                    {label}
                  </span>
                  <span
                    className="tx-chain-dot"
                    style={{ background: CHAIN_DOT[tx.chain] ?? 'var(--fg-subtle)' }}
                    title={tx.chain}
                  />
                  <span
                    className="tx-chain-label"
                    style={{ color: CHAIN_DOT[tx.chain] ?? 'var(--fg-subtle)' }}
                  >
                    {tx.chain === 'pulsechain' ? 'PLS' : tx.chain === 'ethereum' ? 'ETH' : 'BASE'}
                  </span>
                  <span className="tx-card__date">
                    {format(tx.timestamp, 'MMM d, yyyy')}
                  </span>
                </div>
                {/* Row 2: amount */}
                {(!compact || tx.type === 'swap') && (
                  <div className="tx-card__amount" style={{ color: tx.type === 'deposit' ? 'var(--positive)' : tx.type === 'withdraw' ? 'var(--negative)' : 'var(--fg)' }}>
                    {signPrefix}{amtStr}
                    {tx.valueUsd ? (
                      <span className="tx-card__usd">≈ ${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    ) : null}
                  </div>
                )}
                {/* Row 3: wallet context */}
                <div className="tx-card__context">{contextLine}</div>
              </div>
            </div>

            {/* ── Right: actions ── */}
            <div className="tx-card__actions">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-card__explorer-link"
                onClick={e => e.stopPropagation()}
                title="View on explorer"
              >
                <ExternalLink size={12} />
              </a>
              {onToggleHide && (
                <button
                  className="tx-card__hide-btn"
                  title={isHidden ? 'Unhide' : 'Hide'}
                  onClick={e => { e.stopPropagation(); onToggleHide(tx.id); }}
                >
                  {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
