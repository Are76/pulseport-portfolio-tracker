import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

function stubMatchMedia() {
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

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Wallets Atlas surface', () => {
  it('shows wallets controls, Atlas sections, and transaction handoff', () => {
    stubMatchMedia();
    window.localStorage.setItem('pulseport_active_tab', 'assets');

    render(<App />);
    const walletsTransactionsButton = screen
      .getAllByRole('button', { name: /^transactions$/i })
      .find(button => button.className.includes('btn-ghost'));

    expect(screen.getByRole('button', { name: /portfolio insights/i })).toBeInTheDocument();
    expect(walletsTransactionsButton).toBeDefined();
    expect(screen.getByText('Coin visibility')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combined' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Per wallet' })).toBeInTheDocument();
  });

  it('turns the calculator into a rebalance planner with normalized targets and PLS guidance', () => {
    stubMatchMedia();
    window.localStorage.setItem('pulseport_active_tab', 'assets');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /open calculator/i }));

    expect(screen.getByText('Rebalance planner')).toBeInTheDocument();
    expect(screen.getByText('Current mix')).toBeInTheDocument();
    expect(screen.getByText('Target mix')).toBeInTheDocument();
    expect(screen.getByText('Suggested move')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: /target allocation for usdc/i }), {
      target: { value: '30' },
    });

    expect(screen.getByText(/Target mix auto-normalized from/i)).toBeInTheDocument();
    expect(screen.getByText(/Swap about .* PLS to buy the needed USDC\./i)).toBeInTheDocument();
  });
});
