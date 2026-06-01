import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AppShell } from '../shell/app-shell';
import { useShellState } from '../shell/shell-state';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function Harness() {
  const shell = useShellState();

  return (
    <AppShell title="Dashboard" activeView={shell.activeView} onNavigate={shell.setActiveView}>
      <div>{shell.activeView}</div>
    </AppShell>
  );
}

describe('shell navigation', () => {
  it('switches to My Investments when selected from nav', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /my investments/i }));

    expect(screen.getByText('investments')).toBeInTheDocument();
  });
});

describe('Atlas product navigation', () => {
  it('opens the exact selected token product page from the dashboard drawer', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /USDC.*\$1\.00.*\$2\.5K/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Token page' }));

    expect(screen.getByText('USDC product page')).toBeInTheDocument();
  });
});
