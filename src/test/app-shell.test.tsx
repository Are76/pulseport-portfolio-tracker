import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../shell/app-shell';

describe('AppShell', () => {
  it('renders the Pulseport primary navigation', () => {
    render(
      <AppShell
        title="Dashboard"
        activeView="dashboard"
        onNavigate={() => {}}
      >
        <div>Page body</div>
      </AppShell>,
    );

    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByAltText(/pulseport wordmark/i)).toBeInTheDocument();
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });

  it('gives each destination a full accessible label while retaining concise mobile text', () => {
    render(
      <AppShell
        title="Dashboard"
        activeView="dashboard"
        onNavigate={() => {}}
      >
        <div>Page body</div>
      </AppShell>,
    );

    const destinations = [
      { label: 'Dashboard', shortLabel: 'Dash' },
      { label: 'Portfolio' },
      { label: 'My Investments', shortLabel: 'Investments' },
      { label: 'Transactions' },
      { label: 'HEX Staking', shortLabel: 'Staking' },
      { label: 'Wallets & Bridges', shortLabel: 'Wallets' },
      { label: 'Ecosystem' },
    ];

    destinations.forEach(({ label, shortLabel }) => {
      const button = screen.getByRole('button', { name: label });
      if (shortLabel) expect(button.querySelector('.app-shell__nav-short')).toHaveTextContent(shortLabel);
    });
  });
});
