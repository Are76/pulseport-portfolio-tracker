import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('production mobile navigation', () => {
  it('exposes active destination and expandable secondary destinations', () => {
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

    const nav = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(nav).getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');

    const more = within(nav).getByRole('button', { name: 'More destinations' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryByRole('button', { name: 'Transactions' })).not.toBeInTheDocument();
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(within(nav).getByRole('button', { name: 'Transactions' }));
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });
});
