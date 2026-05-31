import { describe, expect, it } from 'vitest';

import { buildAtlasDetail, type AtlasDetailId } from '../components/atlas/atlas-detail-model';

describe('atlas detail model', () => {
  it.each<AtlasDetailId>([
    'portfolio-change',
    'stakes',
    'liquidity',
    'hidden-noise',
    'signal-plsx-strength',
    'token-pls',
  ])('builds complete detail content for %s', (id) => {
    const detail = buildAtlasDetail(id);

    expect(detail.id).toBe(id);
    expect(detail.breadcrumb.length).toBeGreaterThan(0);
    expect(detail.title.length).toBeGreaterThan(0);
    expect(detail.summary.length).toBeGreaterThan(0);
    expect(detail.facts.length).toBeGreaterThan(0);
    expect(detail.actions.length).toBeGreaterThan(0);
  });

  it('returns an honest unavailable state for unknown detail ids', () => {
    const detail = buildAtlasDetail('missing' as AtlasDetailId);

    expect(detail.id).toBe('unavailable');
    expect(detail.title).toBe('Detail unavailable');
  });

  it('uses runtime token details and returns an honest unavailable state for unknown ids', () => {
    const runtimeDetail = {
      id: 'token:hex',
      breadcrumb: ['Home', 'Coins', 'HEX'],
      title: 'HEX',
      summary: 'Wallet-aware HEX detail.',
      facts: [],
      actions: [],
    };

    expect(buildAtlasDetail('token:hex', { 'token:hex': runtimeDetail })).toBe(runtimeDetail);
    expect(buildAtlasDetail('token:missing').id).toBe('unavailable');
  });

  it('returns honest unavailable history for unsupported portfolio ranges', () => {
    const detail = buildAtlasDetail('portfolio-change', {}, '30d');

    expect(detail.title).toBe('30d history unavailable');
    expect(detail.summary).toBe('Historical portfolio change data is not available yet.');
    expect(detail.facts).toEqual([]);
  });

  it('preserves the real 24h portfolio change detail', () => {
    const detail = buildAtlasDetail('portfolio-change');

    expect(detail.title).toBe('24h change');
    expect(detail.facts).toContainEqual({ label: 'Total', value: '+$3,182', tone: 'positive' });
  });
});
