import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from '../App';

describe('GoPulse Compact shell', () => {
  it('renders the shared shell, sidebar brand, and compact header classes', () => {
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

    const shell = document.querySelector('.app-shell');

    expect(shell).toHaveClass('gopulse-shell');
    expect(shell).not.toHaveStyle({ color: 'var(--fg)' });
    expect(document.querySelector('.app-sidebar')).toHaveClass('gopulse-sidebar');
    expect(document.querySelector('.app-header')).toHaveClass('gopulse-header');
  });
});
