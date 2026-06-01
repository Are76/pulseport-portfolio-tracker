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

  it('keeps the compact shell neutral with a shared green interaction accent and consistent typography', () => {
    expect(css).toContain("--font-shell-ui: 'Avenir Next Demi', 'Sora', ui-sans-serif, system-ui, sans-serif;");
    expect(css).toMatch(/:root\s*{[^}]*--accent:\s*#00d68f;[^}]*--accent-dim:\s*rgba\(0,\s*214,\s*143,\s*0\.10\);[^}]*--accent-border:\s*rgba\(0,\s*214,\s*143,\s*0\.28\);[^}]*}/);
    expect(css).toMatch(/\[data-theme="light"\]\s*{[^}]*--accent:\s*#148a4b;[^}]*--accent-dim:\s*rgba\(20,\s*138,\s*75,\s*0\.10\);[^}]*--accent-border:\s*rgba\(20,\s*138,\s*75,\s*0\.24\);[^}]*}/);
    expect(css).toMatch(/\.gopulse-shell\s*{[^}]*font-family:\s*var\(--font-shell-ui\);[^}]*}/);
    expect(css).toMatch(/\.gopulse-header\s*{[^}]*background:\s*var\(--shell-sidebar\);[^}]*}/);
    expect(css).toMatch(/\.nav-item-active\s*{[^}]*background:\s*var\(--shell-surface\)\s*!important;[^}]*}/);
    expect(css).toContain('--shell-canvas: #0e1213;');
    expect(css).toContain('--shell-sidebar: var(--shell-canvas);');
    expect(css).toContain('--shell-header: var(--shell-canvas);');
    expect(css).toContain('--atlas-bg: var(--shell-canvas);');
    expect(css).toContain('--atlas-surface: var(--shell-canvas);');
  });

  it('keeps allocation targets large enough with an internal visible focus style', () => {
    expect(css).toMatch(/\.atlas-home__allocation\s*{[^}]*height:\s*44px;/);
    expect(css).toMatch(/\.atlas-home__allocation button\s*{[^}]*min-height:\s*44px;/);
    expect(css).toMatch(/\.atlas-home__allocation button:focus-visible\s*{[^}]*box-shadow:\s*inset 0 0 0 2px/);
  });

  it('does not reserve a desktop detail-panel column after moving details into a drawer', () => {
    const layoutRule = css.match(/\.atlas-home__layout\s*{([^}]*)}/)?.[1];

    expect(layoutRule).toBeDefined();
    expect(layoutRule).not.toContain('grid-template-columns');
    expect(css).not.toContain('.atlas-home__layout,');
    expect(css).not.toContain('.atlas-home__layout > .atlas-detail-panel');
  });

  it('uses a flat compact Atlas dashboard without card glow effects', () => {
    expect(css).toMatch(/\.atlas-surface\s*{[^}]*background:\s*var\(--atlas-bg\);[^}]*}/);
    expect(css).toMatch(/\.atlas-clickable-card\s*{[^}]*border-radius:\s*4px;[^}]*box-shadow:\s*none;[^}]*}/);
    expect(css).toMatch(/\.atlas-clickable-card:hover,\s*\.atlas-clickable-card:focus-visible\s*{[^}]*box-shadow:\s*none;[^}]*}/);
    expect(css).toMatch(/\.atlas-home__secondary\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.25fr\)\s+minmax\(220px,\s*0\.75fr\);[^}]*}/);
  });
});
