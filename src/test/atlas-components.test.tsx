import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AtlasDetailPanel } from '../components/atlas/AtlasDetailPanel';
import { AtlasDetailSheet } from '../components/atlas/AtlasDetailSheet';
import { AtlasHomeSurface } from '../components/atlas/AtlasHomeSurface';
import { AtlasMetricTile } from '../components/atlas/AtlasMetricTile';
import { AtlasSignalRow } from '../components/atlas/AtlasSignalRow';
import { AtlasTokenCard } from '../components/atlas/AtlasTokenCard';

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
});

describe('atlas home surface', () => {
  it('renders portfolio value and updates detail panel when a tile is clicked', () => {
    render(<AtlasHomeSurface onNavigate={() => undefined} />);

    expect(screen.getByText('$84,920')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stakes/i }));
    expect(screen.getByRole('heading', { name: 'HEX stakes' })).toBeInTheDocument();
  });
});
