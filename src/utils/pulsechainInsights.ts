import type { Asset, Transaction } from '../types';

export type PulsechainInsightTone = 'neutral' | 'positive' | 'warning';

export interface PulsechainInsight {
  id: string;
  label: string;
  value: string;
  tone: PulsechainInsightTone;
}

export function buildPulsechainInsights(assets: Asset[], transactions: Transaction[]): PulsechainInsight[] {
  const pulseAssets = assets.filter(asset => asset.chain === 'pulsechain');
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const pulseValue = pulseAssets.reduce((sum, asset) => sum + asset.value, 0);
  const pulseShare = totalValue > 0 ? (pulseValue / totalValue) * 100 : 0;

  const bridgedValue = pulseAssets
    .filter(asset => asset.isBridged || /\(from (ethereum|eth)\)/i.test(asset.name))
    .reduce((sum, asset) => sum + asset.value, 0);
  const bridgedShare = pulseValue > 0 ? (bridgedValue / pulseValue) * 100 : 0;

  const pulseTxs = transactions.filter(tx => tx.chain === 'pulsechain');
  const bridgeFlows = pulseTxs.filter(tx => tx.bridged || tx.libertySwap).length;

  const topPulseAsset = [...pulseAssets].sort((a, b) => b.value - a.value)[0];

  return [
    {
      id: 'pulse-share',
      label: 'PulseChain allocation',
      value: `${pulseShare.toFixed(1)}%`,
      tone: pulseShare >= 60 ? 'positive' : 'neutral',
    },
    {
      id: 'bridge-exposure',
      label: 'Bridged exposure on PulseChain',
      value: `${bridgedShare.toFixed(1)}%`,
      tone: bridgedShare > 65 ? 'warning' : 'neutral',
    },
    {
      id: 'top-pulse-asset',
      label: 'Largest PulseChain asset',
      value: topPulseAsset ? `${topPulseAsset.symbol} (${((topPulseAsset.value / Math.max(pulseValue, 1)) * 100).toFixed(1)}%)` : 'No PulseChain assets',
      tone: topPulseAsset ? 'positive' : 'neutral',
    },
    {
      id: 'bridge-flows',
      label: 'PulseChain bridge flow txs',
      value: bridgeFlows.toLocaleString('en-US'),
      tone: bridgeFlows > 0 ? 'neutral' : 'warning',
    },
  ];
}
