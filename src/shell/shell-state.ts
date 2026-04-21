import { useState } from 'react';
import type { ShellView } from './shell-types';

export function useShellState() {
  const [activeView, setActiveView] = useState<ShellView>('dashboard');

  return {
    activeView,
    setActiveView,
  };
}
