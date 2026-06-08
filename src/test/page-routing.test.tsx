import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AppShell } from '../shell/app-shell';
import { useShellState } from '../shell/shell-state';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function getDashboardNavButton() {
  return screen
    .getAllByRole('button', { name: /^Dashboard$/i })
    .find((button) => {
      const className = typeof button.className === 'string' ? button.className : '';
      return className.includes('app-nav-item') || className.includes('app-top-nav-btn') || className.includes('mobile-nav-tab-btn');
    })!;
}

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
  function stubMedia() {
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
  }

  it('normalizes legacy overview state to the dashboard surface', async () => {
    stubMedia();

    window.localStorage.setItem('pulseport_active_tab', 'overview');

    render(<App />);

    expect(await screen.findByText('Live Prices')).toBeInTheDocument();
    expect(screen.queryByText('Portfolio Overview')).not.toBeInTheDocument();
  });

  it('opens Portfolio Insights from the dashboard quick action', async () => {
    stubMedia();

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Portfolio insights Open the portfolio narrative and context\./i }));
    expect(await screen.findByText('Total current value')).toBeInTheDocument();
  });

  it('opens Transactions from the dashboard quick action', async () => {
    stubMedia();

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Review transactions/i }));
    expect(await screen.findByText('Full ledger for bridges, swaps, and cost-basis drill-down.')).toBeInTheDocument();
  });

  it('preserves the rebalance planner jump from the dashboard quick action', async () => {
    stubMedia();

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Rebalance planner Set target allocation and see the best path via PLS\./i }));
    expect(await screen.findByText('Coin visibility')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Close Calculator/i })).toBeInTheDocument();
  });

  it('opens the profit planner from the dashboard quick action', async () => {
    stubMedia();

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /Exit plan Open the profit planner for phased exits\./i }));
    expect(await screen.findByText('Profit Planner')).toBeInTheDocument();
  });

  it('opens the exact selected token product page from the dashboard drawer', async () => {
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

    expect(await screen.findByRole('heading', { name: 'USD Coin (Base)' })).toBeInTheDocument();
  });
});
