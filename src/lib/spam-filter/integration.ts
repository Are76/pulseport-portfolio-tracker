import { SpamFilterService, defaultSpamFilterConfig } from 'pulsechain-spam-filter';

const spamFilter = new SpamFilterService();

export async function filterWalletTokens(tokens: any[]) {
  const result = await spamFilter.filterTokens(tokens, {
    ...defaultSpamFilterConfig,
    strictMode: true,
    minLiquidityUsd: 5000,
  });

  return {
    visibleTokens: result.filteredTokens,
    hiddenTokens: result.spamTokens,
    reasons: result.reasons
  };
}