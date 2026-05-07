import React from 'react';
import { ArrowLeft, Calculator, Copy, ExternalLink, Globe, Send, TrendingDown, TrendingUp, Twitter } from 'lucide-react';
import type { Asset, Transaction, Wallet } from '../types';
import { TransactionList } from './TransactionList';

interface MarketData {
  liquidity?: number;
  volume24h?: number;
  marketCap?: number | null;
  fdv?: number | null;
  pools?: number;
  txns24h?: number;
  priceChange1h?: number | null;
  priceChange6h?: number | null;
  priceChange24h?: number | null;
  priceChange7d?: number | null;
  holders?: number | null;
  description?: string | null;
  websites?: { label: string; url: string }[];
  socials?: { type: string; url: string }[];
}

interface Props {
  asset: Asset;
  portfolioTotal: number;
  plsUsdPrice: number;
  logoUrl?: string;
  marketData?: MarketData;
  isLoadingMarketData?: boolean;
  theme: 'dark' | 'light';
  explorerUrl?: string | null;
  dexScreenerUrl?: string | null;
  transactions: Transaction[];
  wallets: Wallet[];
  allAssets: Asset[];
  tokenLogos: Record<string, string>;
  getTokenLogoUrl: (asset: Asset) => string;
  onBack: () => void;
  onOpenPnl: (asset: Asset) => void;
}

const CHAIN_LABELS: Record<string, string> = {
  pulsechain: 'PulseChain',
  ethereum: 'Ethereum',
  base: 'Base',
};

const fmtPrice = (price: number) => {
  if (!price) return '$0.00';
  if (price < 0.000001) return `$${price.toFixed(10)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 6 : 2 })}`;
};

const fmtUsd = (value?: number | null) => {
  if (value == null) return '-';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const fmtBalance = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(3)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(3)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

function PriceChangePill({ label, value, theme }: { label: string; value: number | null | undefined; theme: 'dark' | 'light' }) {
  const green = theme === 'dark' ? '#00FF9F' : '#059669';
  const red = theme === 'dark' ? '#f43f5e' : '#dc2626';
  const isPositive = (value ?? 0) >= 0;

  return (
    <div className="product-change-pill">
      <span>{label}</span>
      {value == null ? (
        <strong>-</strong>
      ) : (
        <strong style={{ color: isPositive ? green : red }}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? '+' : ''}
          {value.toFixed(2)}%
        </strong>
      )}
    </div>
  );
}

const SOCIAL_ICONS: Record<string, typeof Twitter> = {
  telegram: Send,
  twitter: Twitter,
  x: Twitter,
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="product-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="product-detail-card">
      <div className="product-detail-card__title">{title}</div>
      <div className="product-detail-card__body">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="product-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function TokenProductPage({
  asset,
  portfolioTotal,
  plsUsdPrice,
  logoUrl,
  marketData,
  isLoadingMarketData = false,
  theme,
  explorerUrl,
  dexScreenerUrl,
  transactions,
  wallets,
  allAssets,
  tokenLogos,
  getTokenLogoUrl,
  onBack,
  onOpenPnl,
}: Props) {
  const priceChange24h = asset.priceChange24h ?? asset.pnl24h ?? marketData?.priceChange24h ?? 0;
  const green = theme === 'dark' ? '#00FF9F' : '#059669';
  const red = theme === 'dark' ? '#f43f5e' : '#dc2626';
  const share = (asset.value / Math.max(portfolioTotal, 1)) * 100;
  const valuePls = plsUsdPrice > 0 ? asset.value / plsUsdPrice : 0;
  const pricePls = plsUsdPrice > 0 ? asset.price / plsUsdPrice : 0;
  const address = asset.address;
  const shortAddress = address && address !== 'native' ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;
  const txs = transactions.filter((tx) =>
    tx.chain === asset.chain &&
    (tx.asset.toUpperCase() === asset.symbol.toUpperCase() || (tx.counterAsset ?? '').toUpperCase() === asset.symbol.toUpperCase()),
  );
  const previewTxs = txs.slice(0, 8);
  const socialLinks = (marketData?.socials ?? []).filter((item) => item.url);
  const websiteLinks = (marketData?.websites ?? []).filter((item) => item.url);
  const activeColor = priceChange24h >= 0 ? green : red;
  const resolvedLogo = logoUrl || getTokenLogoUrl(asset);
  const [logoErrored, setLogoErrored] = React.useState(false);

  React.useEffect(() => {
    setLogoErrored(false);
  }, [asset.id, resolvedLogo]);

  return (
    <div className="product-page-shell">
      <div className="product-page-topbar">
        <button type="button" className="product-back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="product-topbar-actions">
          {shortAddress && (
            <button
              type="button"
              className="product-link-chip"
              onClick={() => {
                if (address) navigator.clipboard.writeText(address);
              }}
            >
              <Copy size={13} />
              {shortAddress}
            </button>
          )}
          {explorerUrl && (
            <a className="product-link-chip" href={explorerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} />
              Explorer
            </a>
          )}
          {dexScreenerUrl && (
            <a className="product-link-chip product-link-chip--accent" href={dexScreenerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} />
              DexScreener
            </a>
          )}
        </div>
      </div>

      <section className="product-hero-card">
        <div className="product-hero-main">
          <div className="product-token-ident">
            <div className="product-token-logo">
              {resolvedLogo && !logoErrored ? (
                <>
                  <img
                    src={resolvedLogo}
                    alt={asset.symbol}
                    onError={() => setLogoErrored(true)}
                  />
                </>
              ) : (
                <span>{asset.symbol.slice(0, 1)}</span>
              )}
            </div>
            <div className="product-token-copy">
              <div className="product-token-meta">
                <span className="product-token-chain">{CHAIN_LABELS[asset.chain] || asset.chain}</span>
                <span className="product-token-symbol">{asset.symbol}</span>
              </div>
              <h1>{asset.name || asset.symbol}</h1>
              <p>
                Live wallet-linked product page for {asset.symbol} with the same price, holdings, and transaction context used across Pulseport.
              </p>
            </div>
          </div>

          <div className="product-hero-price">
            <div>
              <span>Price</span>
              <strong>{fmtPrice(asset.price)}</strong>
              <small>{pricePls > 0 ? `${fmtBalance(pricePls)} PLS` : '-'} per token</small>
            </div>
            <div>
              <span>24h Move</span>
              <strong style={{ color: activeColor }}>{priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%</strong>
              <small>{asset.chain} spot move</small>
            </div>
            <div>
              <span>Your Position</span>
              <strong>{fmtUsd(asset.value)}</strong>
              <small>{fmtBalance(asset.balance)} {asset.symbol}</small>
            </div>
          </div>
        </div>

        <div className="product-overview-grid">
          <StatCard label="% Portfolio" value={`${share.toFixed(2)}%`} sub="Allocation share" />
          <StatCard label="Market Cap" value={fmtUsd(marketData?.marketCap ?? marketData?.fdv)} sub={marketData?.marketCap ? 'Live market cap' : 'FDV fallback'} />
          <StatCard label="Liquidity" value={fmtUsd(marketData?.liquidity)} sub="Across tracked pairs" />
          <StatCard label="24h Volume" value={fmtUsd(marketData?.volume24h)} sub="Wallet-visible market depth" />
          <StatCard label="24h Txns" value={marketData?.txns24h?.toLocaleString('en-US') ?? '-'} sub="Buys + sells" />
          <StatCard label="Holders" value={marketData?.holders?.toLocaleString('en-US') ?? '-'} sub="PulseChain explorer data" />
        </div>
      </section>

      <div className="product-content-grid">
        <div className="product-content-stack">
          <DetailCard title="Overview">
            <DetailRow label="Balance" value={`${fmtBalance(asset.balance)} ${asset.symbol}`} />
            <DetailRow label="USD value" value={fmtUsd(asset.value)} />
            <DetailRow label="PLS value" value={valuePls > 0 ? `${fmtBalance(valuePls)} PLS` : '-'} />
            <DetailRow label="Pools" value={marketData?.pools?.toLocaleString('en-US') ?? '-'} />
          </DetailCard>

          <DetailCard title="Price action">
            <div className="product-change-grid">
              <PriceChangePill label="1H" value={asset.priceChange1h ?? marketData?.priceChange1h} theme={theme} />
              <PriceChangePill label="6H" value={marketData?.priceChange6h} theme={theme} />
              <PriceChangePill label="24H" value={asset.priceChange24h ?? asset.pnl24h ?? marketData?.priceChange24h} theme={theme} />
              <PriceChangePill label="7D" value={asset.priceChange7d ?? marketData?.priceChange7d} theme={theme} />
            </div>
            {isLoadingMarketData && <div className="product-loading-note">Loading live market data…</div>}
          </DetailCard>

          <DetailCard title="About">
            <div className="product-description">
              {marketData?.description || `${asset.symbol} is tracked inside Pulseport with live wallet balances, pricing, and activity.`}
            </div>
            <div className="product-resource-grid">
              {websiteLinks.map((website) => (
                <a key={website.url} className="product-resource-link" href={website.url} target="_blank" rel="noopener noreferrer">
                  <Globe size={13} />
                  {website.label || 'Website'}
                </a>
              ))}
              {socialLinks.map((social) => {
                const normalizedType = social.type?.toLowerCase() ?? '';
                const Icon = Object.entries(SOCIAL_ICONS).find(([key]) => normalizedType.includes(key))?.[1] || ExternalLink;
                return (
                  <a key={social.url} className="product-resource-link" href={social.url} target="_blank" rel="noopener noreferrer">
                    <Icon size={13} />
                    {social.type || 'Social'}
                  </a>
                );
              })}
            </div>
          </DetailCard>
        </div>

        <div className="product-content-stack">
          <DetailCard title="Wallet activity">
            <div className="product-activity-head">
              <div>
                <span>Recent transactions</span>
                <strong>{txs.length.toLocaleString('en-US')}</strong>
              </div>
              <button type="button" className="product-pnl-btn" onClick={() => onOpenPnl(asset)}>
                <Calculator size={14} />
                Open P&amp;L
              </button>
            </div>
            <TransactionList
              transactions={previewTxs}
              viewAsYou
              wallets={wallets}
              compact
              assets={allAssets}
              getTokenLogoUrl={getTokenLogoUrl}
              tokenLogos={tokenLogos}
              emptyMessage="No transactions for this token yet."
            />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
