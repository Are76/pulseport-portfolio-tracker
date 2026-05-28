import type { ReactNode } from 'react';

export type AtlasTone = 'neutral' | 'positive' | 'negative' | 'accent' | 'muted';

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
};
