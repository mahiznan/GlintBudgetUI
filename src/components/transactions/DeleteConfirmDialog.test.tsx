import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteConfirmDialog from './DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  it('renders confirmation prompt', () => {
    render(<DeleteConfirmDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/delete this transaction/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete button clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /confirm|delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<DeleteConfirmDialog onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
