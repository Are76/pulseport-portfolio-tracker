import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

function stubMatchMedia() {
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
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('Etherscan API key settings', () => {
  it('restores a locally saved key after refresh', () => {
    stubMatchMedia();
    window.localStorage.setItem('pulseport_etherscan_key', 'saved-key');

    render(<App />);

    expect(screen.getByRole('button', { name: 'API key set. Open API key settings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'API key set. Open API key settings' }));
    expect(screen.getByLabelText('Etherscan API key')).toHaveValue('saved-key');
  });

  it('saves and removes the key on this device', () => {
    stubMatchMedia();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Open API key settings' }));
    fireEvent.change(screen.getByLabelText('Etherscan API key'), { target: { value: 'new-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Refresh' }));
    expect(window.localStorage.getItem('pulseport_etherscan_key')).toBe('new-key');

    fireEvent.click(screen.getByRole('button', { name: 'API key set. Open API key settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }));
    expect(window.localStorage.getItem('pulseport_etherscan_key')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open API key settings' })).toBeInTheDocument();
  });
});
