import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('Atlas theme CSS', () => {
  it('keeps light-mode blur removal separate from the glass-card appearance rule', () => {
    expect(css).toContain(`[data-theme="light"] .chart-tooltip {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}`);
  });

  it('uses theme-aware contrast colors for Atlas controls', () => {
    expect(css).toContain('--atlas-on-fg:');
    expect(css).toContain('--atlas-control-bg:');
    expect(css).toContain('--atlas-control-fg:');
    expect(css).toContain('background: var(--atlas-control-bg);');
    expect(css).toContain('color: var(--atlas-control-fg);');
    expect(css).toContain('color: var(--atlas-on-fg);');
  });
});
