import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../context/SyncStatusContext', () => ({
  useSyncStatus: vi.fn(),
}));

import { useSyncStatus } from '../../context/SyncStatusContext';
import SyncPill from './SyncPill';

function setup(status: 'synced' | 'syncing' | 'pending') {
  vi.mocked(useSyncStatus).mockReturnValue({
    status,
    notifyWrite: vi.fn(),
    notifySnapshot: vi.fn(),
    notifySynced: vi.fn(),
  });
}

describe('SyncPill', () => {
  it('renders "In Sync" label when status is synced', () => {
    setup('synced');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('In Sync');
  });

  it('renders "Syncing…" label when status is syncing', () => {
    setup('syncing');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('Syncing…');
  });

  it('renders "Pending Sync" label when status is pending', () => {
    setup('pending');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveTextContent('Pending Sync');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    setup('synced');
    render(<SyncPill />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('dot has animate-pulse class only in syncing state', () => {
    setup('syncing');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('dot does not have animate-pulse in pending state', () => {
    setup('pending');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).not.toContain('animate-pulse');
  });

  it('dot does not have animate-pulse in synced state', () => {
    setup('synced');
    const { container } = render(<SyncPill />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot?.className).not.toContain('animate-pulse');
  });
});
