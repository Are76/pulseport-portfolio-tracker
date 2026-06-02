import type { ReactNode } from 'react';

export type AtlasTone = 'neutral' | 'positive' | 'negative' | 'accent' | 'muted';

export type AtlasRange = '24h' | '7d' | '30d' | '90d';

export type AtlasAction = {
  label: string;
  target: string;
  variant?: 'primary' | 'secondary';
};

export type AtlasFact = {
  label: string;
  value: string;
  tone?: AtlasTone;
};

export type AtlasDetailContent = {
  id: string;
  breadcrumb: string[];
  title: string;
  summary: string;
  facts: AtlasFact[];
  actions: AtlasAction[];
};

export type AtlasMetric = {
  id: string;
  label: string;
  value: string;
  subvalue?: string;
  tone?: AtlasTone;
  detailId: string;
};

export type AtlasSignal = {
  id: string;
  label: string;
  value: string;
  tone?: AtlasTone;
  detailId: string;
  description?: string;
  iconKey?: 'holding' | 'stakes' | 'defi' | 'flow' | 'alert';
};

export type AtlasQuickAction = {
  id: string;
  label: string;
  description: string;
  target: string;
};

export type AtlasTokenCardData = {
  id: string;
  symbol: string;
  price: string;
  change: string;
  ratio?: string;
  tone?: AtlasTone;
  detailId: string;
  icon?: ReactNode;
  iconUrl?: string;
};

export type AtlasAllocationItem = {
  id: string;
  label: string;
  width: number;
  detailId: string;
};

export type AtlasAllocationWeight = {
  id: string;
  label: string;
  value: string;
  percent: number;
  detailId: string;
};

export type AtlasAllocationModel = {
  segments: AtlasAllocationItem[];
  topWeights: AtlasAllocationWeight[];
};

export type AtlasHomeSnapshot = {
  eyebrow: string;
  headlineValue: string;
  metrics: AtlasMetric[];
  signals: AtlasSignal[];
  allocation: AtlasAllocationModel;
  tokens: AtlasTokenCardData[];
  quickActions: AtlasQuickAction[];
  details: Record<string, AtlasDetailContent>;
  emptyTokenMessage?: string;
};
