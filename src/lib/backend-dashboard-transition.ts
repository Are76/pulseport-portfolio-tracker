import type { Wallet } from '../types';

export function resolveBackendWalletAddress(wallets: Wallet[], activeWallet: string | null): string | null {
  if (activeWallet) {
    const matchedWallet = wallets.find((wallet) => wallet.address.toLowerCase() === activeWallet.toLowerCase());
    if (matchedWallet) return matchedWallet.address;
  }

  return wallets[0]?.address ?? null;
}
