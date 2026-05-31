import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('Atlas theme CSS', () => {
  it('keeps light-mode blur removal separate from the glass-card appearance rule', () => {
    expect(css).toMatch(/\[data-theme="light"\]\s+\.chart-tooltip\s*{[^}]*backdrop-filter:\s*none\s*!important;[^}]*-webkit-backdrop-filter:\s*none\s*!important;[^}]*}/);
  });

  it('uses theme-aware contrast colors for Atlas controls', () => {
    expect(css).toContain('--atlas-on-fg:');
    expect(css).toContain('--atlas-control-bg:');
    expect(css).toContain('--atlas-control-fg:');
    expect(css).toContain('background: var(--atlas-control-bg);');
    expect(css).toContain('color: var(--atlas-control-fg);');
    expect(css).toContain('color: var(--atlas-on-fg);');
  });

  it('uses flat GoPulse Compact shell surfaces without decorative gradients', () => {
    expect(css).toContain('--shell-canvas:');
    expect(css).toContain('--shell-sidebar:');
    expect(css).toContain('--shell-header:');
    expect(css).not.toMatch(/\.gopulse-shell\s*{[^}]*gradient\s*\(/);
    expect(css).toMatch(/\[data-theme="light"\]\s+\.gopulse-shell\s*{[^}]*background:\s*var\(--shell-canvas\);[^}]*}/);
    expect(css).not.toMatch(/\[data-theme="light"\]\s+\.gopulse-shell\s*{[^}]*gradient\s*\(/);
  });
});
