import type { AtlasDetailContent, AtlasRange } from './atlas-types';

export type AtlasDetailId =
  | 'portfolio-change'
  | 'stakes'
  | 'liquidity'
  | 'hidden-noise'
  | 'signal-plsx-strength'
  | 'token-pls';

const DETAILS: Record<AtlasDetailId, AtlasDetailContent> = {
  'portfolio-change': {
    id: 'portfolio-change',
    breadcrumb: ['Home', 'Portfolio', '24h'],
    title: '24h change',
    summary: 'Shows why the portfolio moved during the selected time range.',
    facts: [
      { label: 'Total', value: '+$3,182', tone: 'positive' },
      { label: 'Top driver', value: 'PLSX' },
      { label: 'Range', value: '24h' },
      { label: 'Wallet', value: 'Main vault' },
    ],
    actions: [
      { label: 'Value chart', target: 'overview', variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  },
  stakes: {
    id: 'stakes',
    breadcrumb: ['Home', 'Stakes'],
    title: 'HEX stakes',
    summary: 'Summarizes active stakes and points to the stake ladder.',
    facts: [
      { label: 'Active', value: '18' },
      { label: 'Due soon', value: '1', tone: 'accent' },
      { label: 'Principal', value: '4.2M HEX' },
      { label: 'T-Shares', value: '4.8B' },
    ],
    actions: [
      { label: 'Stake ladder', target: 'stakes', variant: 'primary' },
      { label: 'Due stake', target: 'stakes' },
    ],
  },
  liquidity: {
    id: 'liquidity',
    breadcrumb: ['Home', 'DeFi', 'LP'],
    title: 'Liquidity',
    summary: 'Shows LP value, portfolio share, and the largest pool.',
    facts: [
      { label: 'LP value', value: '$12.6K' },
      { label: 'Share', value: '15%' },
      { label: 'Main pool', value: 'PLSX / WPLS' },
      { label: 'Risk', value: 'Medium' },
    ],
    actions: [
      { label: 'Pools', target: 'defi', variant: 'primary' },
      { label: 'LP history', target: 'history' },
    ],
  },
  'hidden-noise': {
    id: 'hidden-noise',
    breadcrumb: ['Home', 'Hidden Tokens'],
    title: 'Hidden noise',
    summary: 'Shows what was hidden by the spam/noise filter.',
    facts: [
      { label: 'Hidden', value: '2' },
      { label: 'Value', value: '$0' },
      { label: 'Reason', value: 'No price' },
      { label: 'Mode', value: 'Auto' },
    ],
    actions: [
      { label: 'Review hidden', target: 'assets', variant: 'primary' },
      { label: 'Filter', target: 'assets' },
    ],
  },
  'signal-plsx-strength': {
    id: 'signal-plsx-strength',
    breadcrumb: ['Home', 'Signals', 'PLSX'],
    title: 'PLSX strength',
    summary: 'Explains a compact signal with the evidence behind it.',
    facts: [
      { label: 'Price', value: '+4.1%', tone: 'positive' },
      { label: 'Impact', value: '+$1,420', tone: 'positive' },
      { label: 'Liquidity', value: 'Stable' },
      { label: 'Confidence', value: 'High' },
    ],
    actions: [
      { label: 'Open PLSX', target: 'product', variant: 'primary' },
      { label: 'Evidence', target: 'overview' },
    ],
  },
  'token-pls': {
    id: 'token-pls',
    breadcrumb: ['Home', 'Coins', 'PLS'],
    title: 'PLS',
    summary: 'Combines token market stats with wallet-specific context.',
    facts: [
      { label: 'Price', value: '$0.00000694' },
      { label: 'Ratio', value: '0.07 x Sac' },
      { label: '24h', value: '-3.21%', tone: 'negative' },
      { label: 'Your value', value: '$8,420' },
    ],
    actions: [
      { label: 'Token page', target: 'product', variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  },
};

const UNAVAILABLE_DETAIL: AtlasDetailContent = {
  id: 'unavailable',
  breadcrumb: ['Home', 'Details'],
  title: 'Detail unavailable',
  summary: 'This information is not available yet.',
  facts: [],
  actions: [],
};

function buildPortfolioChangeDetail(range: AtlasRange): AtlasDetailContent {
  return {
    ...DETAILS['portfolio-change'],
    title: `${range} change`,
    breadcrumb: ['Home', 'Portfolio', range],
    facts: DETAILS['portfolio-change'].facts.map(fact => (
      fact.label === 'Range' ? { ...fact, value: range } : fact
    )),
  };
}

export function buildAtlasDetail(
  id: AtlasDetailId | string,
  runtimeDetails: Record<string, AtlasDetailContent> = {},
  range: AtlasRange = '24h',
): AtlasDetailContent {
  if (id === 'portfolio-change') return buildPortfolioChangeDetail(range);
  return runtimeDetails[id] ?? DETAILS[id as AtlasDetailId] ?? UNAVAILABLE_DETAIL;
}
