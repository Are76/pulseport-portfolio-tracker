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

  it('falls back to portfolio-change for unknown detail ids', () => {
    const detail = buildAtlasDetail('missing' as AtlasDetailId);

    expect(detail.id).toBe('portfolio-change');
    expect(detail.title).toBe('24h change');
  });
});
