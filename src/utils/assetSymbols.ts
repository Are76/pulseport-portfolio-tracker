export function normalizeAssetSymbol(symbol: string, chain?: string): string {
  const upper = (symbol || '').toUpperCase();
  return chain === 'pulsechain' && upper === 'WPLS' ? 'PLS' : upper;
}

export function sameAssetSymbol(left: string, right: string, chain?: string): boolean {
  return normalizeAssetSymbol(left, chain) === normalizeAssetSymbol(right, chain);
}
