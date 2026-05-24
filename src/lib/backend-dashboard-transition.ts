import type { Wallet } from '../types';

export function resolveBackendWalletAddress(wallets: Wallet[], activeWallet: string | null): string | null {
  const activeWalletExists = activeWallet
    ? wallets.some((wallet) => wallet.address.toLowerCase() === activeWallet.toLowerCase())
    : false;

  if (activeWallet && activeWalletExists) return activeWallet;
  return wallets[0]?.address ?? null;
}
