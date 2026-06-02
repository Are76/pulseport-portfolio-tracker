import type { Asset } from '../types';

function isForcedVisibleCommunityAsset(asset: Asset) {
  const address = asset.address?.toLowerCase?.() ?? '';
  const name = asset.name?.toUpperCase?.() ?? '';
  const id = asset.id.toLowerCase();
  const symbol = asset.symbol.toUpperCase();

  if (asset.chain !== 'pulsechain' || symbol !== 'PCOCK') return false;

  return (
    name.includes('PEACOCK')
    || id.includes('pcock')
    || address.includes('pcock')
  );
}

type Options = {
  hiddenTokens: string[];
  hideDust: boolean;
  hideSpam: boolean;
  spamTokenIds: string[];
  dustThresholdUsd?: number;
};

export function filterVisibleAssets(
  assets: Asset[],
  {
    hiddenTokens,
    hideDust,
    hideSpam,
    spamTokenIds,
    dustThresholdUsd = 1,
  }: Options,
) {
  return assets
    .filter((asset) => !hiddenTokens.includes(asset.id))
    .filter((asset) => {
      if (isForcedVisibleCommunityAsset(asset)) return true;
      return !hideDust || asset.value >= dustThresholdUsd || (asset.balance > 0 && asset.price === 0);
    })
    .filter((asset) => {
      if (isForcedVisibleCommunityAsset(asset)) return true;
      return !hideSpam || (!(asset as any).isSpam && !spamTokenIds.includes(asset.id));
    });
}
