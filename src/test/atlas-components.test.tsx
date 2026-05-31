import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AtlasDetailPanel } from '../components/atlas/AtlasDetailPanel';
import { AtlasDetailSheet } from '../components/atlas/AtlasDetailSheet';
import { AtlasHomeSurface } from '../components/atlas/AtlasHomeSurface';
import { AtlasMetricTile } from '../components/atlas/AtlasMetricTile';
import { AtlasSignalRow } from '../components/atlas/AtlasSignalRow';
import { AtlasTokenCard } from '../components/atlas/AtlasTokenCard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('atlas clickable components', () => {
  it('calls onSelect with the metric detail id', () => {
    const onSelect = vi.fn();

    render(
      <AtlasMetricTile
        metric={{ id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' }}
        active={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /24h/i }));
    expect(onSelect).toHaveBeenCalledWith('portfolio-change');
  });

  it('marks active signal rows with aria-pressed', () => {
    render(
      <AtlasSignalRow
        signal={{ id: 'plsx', label: 'PLSX strength', value: '+4.1%', tone: 'positive', detailId: 'signal-plsx-strength' }}
        active={true}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: /PLSX strength/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders token market card price and ratio', () => {
    render(
      <AtlasTokenCard
        token={{ id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token-pls' }}
        active={false}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText('PLS')).toBeInTheDocument();
    expect(screen.getByText('$0.00000694')).toBeInTheDocument();
    expect(screen.getByText('0.07 x Sac')).toBeInTheDocument();
  });
});

const sampleDetail = {
  id: 'portfolio-change',
  breadcrumb: ['Home', 'Portfolio', '24h'],
  title: '24h change',
  summary: 'Shows why the portfolio moved.',
  facts: [{ label: 'Total', value: '+$3,182', tone: 'positive' as const }],
  actions: [{ label: 'Value chart', target: 'overview', variant: 'primary' as const }],
};

describe('atlas detail views', () => {
  it('renders breadcrumb, facts, and actions in the desktop panel', () => {
    render(<AtlasDetailPanel detail={sampleDetail} onAction={() => undefined} />);

    expect(screen.getByText('Home > Portfolio > 24h')).toBeInTheDocument();
    expect(screen.getByText('24h change')).toBeInTheDocument();
    expect(screen.getByText('+$3,182')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Value chart' })).toBeInTheDocument();
  });

  it('does not render the mobile sheet when closed', () => {
    const { container } = render(<AtlasDetailSheet detail={sampleDetail} open={false} onClose={() => undefined} onAction={() => undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('focuses the close control when the mobile sheet opens', () => {
    render(<AtlasDetailSheet detail={sampleDetail} open onClose={() => undefined} onAction={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Close detail panel' })).toHaveFocus();
  });

  it('dismisses the mobile sheet when Escape is pressed', () => {
    function SheetHarness() {
      const [open, setOpen] = useState(true);
      return <AtlasDetailSheet detail={sampleDetail} open={open} onClose={() => setOpen(false)} onAction={() => undefined} />;
    }

    render(<SheetHarness />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses the mobile sheet when the backdrop is clicked', () => {
    function SheetHarness() {
      const [open, setOpen] = useState(true);
      return <AtlasDetailSheet detail={sampleDetail} open={open} onClose={() => setOpen(false)} onAction={() => undefined} />;
    }

    render(<SheetHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss detail panel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not steal focus when the close callback changes while open', () => {
    const { rerender } = render(<AtlasDetailSheet detail={sampleDetail} open onClose={() => undefined} onAction={() => undefined} />);
    const action = screen.getByRole('button', { name: 'Value chart' });

    action.focus();
    rerender(<AtlasDetailSheet detail={sampleDetail} open onClose={() => undefined} onAction={() => undefined} />);

    expect(action).toHaveFocus();
  });

  it('uses the latest close callback after rerender', () => {
    const firstOnClose = vi.fn();
    const latestOnClose = vi.fn();
    const { rerender } = render(<AtlasDetailSheet detail={sampleDetail} open onClose={firstOnClose} onAction={() => undefined} />);

    rerender(<AtlasDetailSheet detail={sampleDetail} open onClose={latestOnClose} onAction={() => undefined} />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(latestOnClose).toHaveBeenCalledOnce();
  });

  it('contains focus within the sheet when tabbing past either boundary', () => {
    render(<AtlasDetailSheet detail={sampleDetail} open onClose={() => undefined} onAction={() => undefined} />);
    const closeButton = screen.getByRole('button', { name: 'Close detail panel' });
    const action = screen.getByRole('button', { name: 'Value chart' });

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(action).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });
});

describe('atlas home surface', () => {
  it('changes the selected time range when a range button is clicked', () => {
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    fireEvent.click(screen.getByRole('button', { name: /24h \+3\.8%/i }));

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: '30d history unavailable' })).toBeInTheDocument();
    expect(screen.getByText('Historical portfolio change data is not available yet.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).queryByText('+$3,182')).not.toBeInTheDocument();
  });

  it('opens the exact allocation detail when an allocation segment is clicked', () => {
    render(
      <AtlasHomeSurface
        onNavigate={() => undefined}
        snapshot={{
          ...DEFAULT_LIVE_SNAPSHOT,
          details: {
            'token:plsx': {
              id: 'token:plsx',
              breadcrumb: ['Home', 'Coins', 'PLSX'],
              title: 'PLSX',
              summary: 'PLSX in your tracked portfolio.',
              facts: [],
              actions: [],
            },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'PLSX allocation' }));

    expect(screen.getByRole('heading', { name: 'PLSX' })).toBeInTheDocument();
  });

  it('renders portfolio value and updates detail panel when a tile is clicked', () => {
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    expect(screen.getByText('$84,920')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('heading', { name: 'HEX stakes' })).toBeInTheDocument();
  });

  it('renders a supplied live snapshot instead of the design fallback', () => {
    render(
      <AtlasHomeSurface
        onNavigate={() => undefined}
        snapshot={{
          eyebrow: '2 wallets',
          headlineValue: '$450',
          metrics: [
            { id: 'change', label: '24h', value: '+0.31%', subvalue: '+$1.40', tone: 'positive', detailId: 'portfolio-change' },
            { id: 'stakes', label: 'Stakes', value: '1', subvalue: '1 active', detailId: 'stakes' },
            { id: 'lp', label: 'LP', value: '$100', subvalue: '22.2%', detailId: 'liquidity' },
            { id: 'noise', label: 'Noise', value: '3', subvalue: 'hidden', detailId: 'hidden-noise' },
          ],
          signals: [{ id: 'top', label: 'Top holding', value: 'PLSX', detailId: 'portfolio-change' }],
          allocation: [{ id: 'plsx', label: 'PLSX', width: 53.33, detailId: 'token:plsx' }],
          tokens: [{ id: 'plsx', symbol: 'PLSX', price: '$0.00001', change: '-5.00%', ratio: '$80.00', tone: 'negative', detailId: 'portfolio-change' }],
          details: {},
        }}
      />,
    );

    expect(screen.getByText('2 wallets')).toBeInTheDocument();
    expect(screen.getByText('$450')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Top holding/i })).toBeInTheDocument();
    expect(screen.queryByText('$84,920')).not.toBeInTheDocument();
  });

  it('restores focus to the tile that launched the mobile detail sheet', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);
    const stakesTile = screen.getByRole('button', { name: /Stakes/i });

    stakesTile.focus();
    fireEvent.click(stakesTile);
    const closeButton = screen.getByRole('button', { name: 'Close detail panel' });
    expect(closeButton).toHaveFocus();
    fireEvent.click(closeButton);

    expect(stakesTile).toHaveFocus();
  });

  it('keeps desktop details closed until a card is selected', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '24h change' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('dialog', { name: 'HEX stakes details' })).toBeInTheDocument();
  });

  it('closes the desktop drawer on Escape and restores launching-card focus', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);
    const stakesTile = screen.getByRole('button', { name: /Stakes/i });

    stakesTile.focus();
    fireEvent.click(stakesTile);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stakesTile).toHaveFocus();
  });

  it('closes the desktop drawer when its backdrop is clicked', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss detail panel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('contains focus within the desktop drawer when tabbing past either boundary', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    const closeButton = screen.getByRole('button', { name: 'Close detail panel' });
    const lastAction = screen.getByRole('button', { name: 'Due stake' });

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(lastAction).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
  });

  it('opens the mobile sheet without mounting the desktop drawer', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const { container } = render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));

    expect(container.querySelector('.atlas-detail-sheet')).toBeInTheDocument();
    expect(container.querySelector('.atlas-detail-drawer')).not.toBeInTheDocument();
  });

  it('closes the desktop drawer when the media query changes to mobile', () => {
    let handleChange: ((event: { matches: boolean }) => void) | undefined;
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn((_type: string, listener: (event: { matches: boolean }) => void) => {
        handleChange = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mediaQuery));
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      mediaQuery.matches = true;
      handleChange?.({ matches: true });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the mobile detail sheet when the media query changes to desktop', () => {
    let handleChange: ((event: { matches: boolean }) => void) | undefined;
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: (event: { matches: boolean }) => void) => {
        handleChange = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mediaQuery));
    const { unmount } = render(<AtlasHomeSurface onNavigate={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      mediaQuery.matches = false;
      handleChange?.({ matches: false });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
  });
});

const DEFAULT_LIVE_SNAPSHOT = {
  eyebrow: '2 wallets',
  headlineValue: '$450',
  metrics: [
    { id: 'change', label: '24h', value: '+0.31%', subvalue: '+$1.40', tone: 'positive' as const, detailId: 'portfolio-change' },
    { id: 'stakes', label: 'Stakes', value: '1', subvalue: '1 active', detailId: 'stakes' },
    { id: 'lp', label: 'LP', value: '$100', subvalue: '22.2%', detailId: 'liquidity' },
    { id: 'noise', label: 'Noise', value: '3', subvalue: 'hidden', detailId: 'hidden-noise' },
  ],
  signals: [{ id: 'top', label: 'Top holding', value: 'PLSX', detailId: 'portfolio-change' }],
  allocation: [{ id: 'plsx', label: 'PLSX', width: 53.33, detailId: 'token:plsx' }],
  tokens: [{ id: 'plsx', symbol: 'PLSX', price: '$0.00001', change: '-5.00%', ratio: '$80.00', tone: 'negative' as const, detailId: 'portfolio-change' }],
  details: {},
};
