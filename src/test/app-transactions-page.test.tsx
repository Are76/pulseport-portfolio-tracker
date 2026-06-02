import { render, screen } from '@testing-library/react';
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

describe('Transactions Atlas surface', () => {
  it('shows the dedicated transactions page shell and ledger controls', () => {
    stubMatchMedia();
    window.localStorage.setItem('pulseport_active_tab', 'history');

    render(<App />);

    expect(screen.getByText('PulseChain activity')).toBeInTheDocument();
    expect(screen.getByText('Ledger overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view as you/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });
});
