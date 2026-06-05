import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BudgetData } from '../../firestore/types';

const mockBulkRename = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useBulkRenameAccount', () => ({
  useBulkRenameAccount: () => ({ mutate: mockBulkRename }),
}));

const mockAuthState = vi.hoisted(() => ({
  status: 'authenticated' as const,
  user: { uid: 'u1', name: 'Test', email: 'test@example.com', photoUrl: null, user_isPremium: false },
}));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

import AccountsTab from './AccountsTab';

const defaultItem: BudgetData = { name: 'Monthly Budget', emoji: '💼', type: 'account', parent: null };
const userItemA: BudgetData = { name: 'HDFC', emoji: '🏦', type: 'account', parent: null };
const archivedItem: BudgetData = { name: 'Old Wallet', emoji: '👛', type: 'account', parent: null };

function renderTab(overrides: Partial<React.ComponentProps<typeof AccountsTab>> = {}) {
  return render(
    <AccountsTab
      accounts={[defaultItem]}
      archivedAccounts={[]}
      defaultItems={[defaultItem]}
      onSaveActive={vi.fn()}
      onSaveArchived={vi.fn()}
      uid="u1"
      {...overrides}
    />,
  );
}

describe('AccountsTab — active accounts rendering', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('renders default account with star badge and edit button, no archive/delete', () => {
    renderTab();
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Default account')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Monthly Budget')).toBeInTheDocument();
    expect(screen.queryByLabelText('Archive Monthly Budget')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Monthly Budget')).not.toBeInTheDocument();
  });

  it('edit modal for default shows name as plain text (not editable) and emoji as input', async () => {
    renderTab();
    await userEvent.click(screen.getByLabelText('Edit Monthly Budget'));
    expect(screen.getByRole('dialog', { name: /edit account/i })).toBeInTheDocument();
    // Emoji is editable
    expect(screen.getByLabelText('Emoji')).toBeInTheDocument();
    // Name input should not exist for default accounts
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('saving a default emoji change calls onSaveActive with the default (updated emoji) + user items', async () => {
    const onSaveActive = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive });
    await userEvent.click(screen.getByLabelText('Edit Monthly Budget'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '💰');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSaveActive).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Monthly Budget', emoji: '💰' }),
      userItemA,
    ]);
    // No rename modal
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders user account with edit, archive, and delete buttons', () => {
    renderTab({ accounts: [defaultItem, userItemA] });
    expect(screen.getByLabelText('Edit HDFC')).toBeInTheDocument();
    expect(screen.getByLabelText('Archive HDFC')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete HDFC')).toBeInTheDocument();
  });

  it('hides archived section when archivedAccounts is empty', () => {
    renderTab({ archivedAccounts: [] });
    expect(screen.queryByText(/Archived/)).not.toBeInTheDocument();
  });

  it('shows archived section with account name when archivedAccounts has items', async () => {
    renderTab({ archivedAccounts: [archivedItem] });
    expect(screen.getByText(/Archived \(1\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Archived/i }));
    expect(screen.getByText('Old Wallet')).toBeInTheDocument();
  });
});

describe('AccountsTab — delete', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('shows delete dialog on delete click, dismisses on Cancel', async () => {
    renderTab({ accounts: [defaultItem, userItemA] });
    await userEvent.click(screen.getByLabelText('Delete HDFC'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onSaveActive without the deleted item on confirm', async () => {
    const onSaveActive = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive });
    await userEvent.click(screen.getByLabelText('Delete HDFC'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    // only user items are passed (defaults re-added at read time)
    expect(onSaveActive).toHaveBeenCalledWith([]);
  });

  it('calls onSaveArchived without the deleted item when deleting from archived section', async () => {
    const onSaveArchived = vi.fn();
    renderTab({ archivedAccounts: [archivedItem], onSaveArchived });
    await userEvent.click(screen.getByRole('button', { name: /Archived/i }));
    await userEvent.click(screen.getByLabelText('Delete Old Wallet'));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onSaveArchived).toHaveBeenCalledWith([]);
  });
});

describe('AccountsTab — archive & restore', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('calls onSaveActive and onSaveArchived on archive', async () => {
    const onSaveActive = vi.fn();
    const onSaveArchived = vi.fn();
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive, onSaveArchived });
    await userEvent.click(screen.getByLabelText('Archive HDFC'));
    expect(onSaveActive).toHaveBeenCalledWith([]);
    expect(onSaveArchived).toHaveBeenCalledWith([userItemA]);
  });

  it('calls onSaveActive and onSaveArchived on restore', async () => {
    const onSaveActive = vi.fn();
    const onSaveArchived = vi.fn();
    renderTab({
      accounts: [defaultItem],
      archivedAccounts: [archivedItem],
      onSaveActive,
      onSaveArchived,
    });
    await userEvent.click(screen.getByRole('button', { name: /Archived/i }));
    await userEvent.click(screen.getByLabelText('Restore Old Wallet'));
    expect(onSaveActive).toHaveBeenCalledWith([archivedItem]);
    expect(onSaveArchived).toHaveBeenCalledWith([]);
  });

  it('shows error when restoring an account whose name conflicts with an active account', async () => {
    const conflictItem: BudgetData = { name: 'HDFC', emoji: '🏦', type: 'account', parent: null };
    renderTab({
      accounts: [defaultItem, userItemA],
      archivedAccounts: [conflictItem],
    });
    await userEvent.click(screen.getByRole('button', { name: /Archived/i }));
    await userEvent.click(screen.getByLabelText('Restore HDFC'));
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });
});

describe('AccountsTab — rename modal', () => {
  beforeEach(() => mockBulkRename.mockReset());

  it('shows rename modal when account name changes on save', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('dialog', { name: /update account name/i })).toBeInTheDocument();
  });

  it('does NOT show rename modal when only emoji changes', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const emojiInput = screen.getByLabelText('Emoji');
    await userEvent.clear(emojiInput);
    await userEvent.type(emojiInput, '💰');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows premium promotion when user is non-premium', async () => {
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText(/premium feature/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Update all existing transactions')).toBeDisabled();
  });

  it('calls bulkRename when checkbox is checked and button clicked', async () => {
    mockAuthState.user!.user_isPremium = true;
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn(), uid: 'u1' });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    const checkbox = screen.getByLabelText('Update all existing transactions') as HTMLInputElement;
    await userEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /update all & save/i }));
    expect(mockBulkRename).toHaveBeenCalledWith('u1', 'HDFC', 'HDFC Savings');
  });

  it('does NOT call bulkRename when checkbox is unchecked', async () => {
    mockAuthState.user!.user_isPremium = true;
    renderTab({ accounts: [defaultItem, userItemA], onSaveActive: vi.fn() });
    await userEvent.click(screen.getByLabelText('Edit HDFC'));
    const nameInput = screen.getByDisplayValue('HDFC');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'HDFC Savings');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await userEvent.click(screen.getByRole('button', { name: /save without updating/i }));
    expect(mockBulkRename).not.toHaveBeenCalled();
  });
});
