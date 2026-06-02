import type { Asset } from '../types';

export const FORCED_VISIBLE_COMMUNITY_SYMBOLS = new Set(['PCOCK']);

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
      if (FORCED_VISIBLE_COMMUNITY_SYMBOLS.has(asset.symbol.toUpperCase())) return true;
      return !hideDust || asset.value >= dustThresholdUsd || (asset.balance > 0 && asset.price === 0);
    })
    .filter((asset) => {
      if (FORCED_VISIBLE_COMMUNITY_SYMBOLS.has(asset.symbol.toUpperCase())) return true;
      return !hideSpam || (!(asset as any).isSpam && !spamTokenIds.includes(asset.id));
    });
}
