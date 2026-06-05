import { useState, useMemo } from 'react';
import type { BudgetData } from '../../firestore/types';
import { useBulkRenameAccount } from '../../hooks/useBulkRenameAccount';
import { useAuth } from '../../auth/AuthContext';

interface AccountsTabProps {
  accounts: BudgetData[];
  archivedAccounts: BudgetData[];
  defaultItems: BudgetData[];
  onSaveActive: (items: BudgetData[]) => void;
  onSaveArchived: (items: BudgetData[]) => void;
  uid: string;
}

function isDuplicate(name: string, items: BudgetData[], excludeName?: string): boolean {
  const lower = name.trim().toLowerCase();
  return items
    .filter((item) => item.name.toLowerCase() !== (excludeName?.toLowerCase() ?? ''))
    .some((item) => item.name.toLowerCase() === lower);
}

export default function AccountsTab({
  accounts,
  archivedAccounts,
  defaultItems,
  onSaveActive,
  onSaveArchived,
  uid,
}: AccountsTabProps) {
  const { mutate: bulkRename } = useBulkRenameAccount();
  const auth = useAuth();
  const isPremium = auth.status === 'authenticated' && (auth.user?.user_isPremium ?? false);

  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [editModal, setEditModal] = useState<{ item: BudgetData; newName: string; newEmoji: string; error: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string; shouldUpdateTransactions: boolean } | null>(null);
  const [mergeConfirmModal, setMergeConfirmModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    name: string;
    source: 'active' | 'archived';
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Track which accounts are defaults
  // An account is default if it matches a default item by name, OR if it's in accounts but not in the user-created items
  const defaultAccountIndices = useMemo(() => {
    const indices = new Set<number>();
    const defaultNameSet = new Set(defaultItems.map(d => d.name.toLowerCase()));

    accounts.forEach((account, idx) => {
      // It's a default if the name matches a default item name
      if (defaultNameSet.has(account.name.toLowerCase())) {
        indices.add(idx);
      }
    });

    return indices;
  }, [accounts, defaultItems]);

  function isDefault(item: BudgetData): boolean {
    const index = accounts.findIndex(a => a.name === item.name && a.emoji === item.emoji);
    return defaultAccountIndices.has(index);
  }

  const userItems = accounts.filter((item) => !isDefault(item));

  function startEdit(item: BudgetData) {
    setEditModal({
      item,
      newName: item.name,
      newEmoji: item.emoji ?? '',
      error: '',
    });
  }

  function cancelEdit() {
    setEditModal(null);
  }

  function handleSaveEdit() {
    if (!editModal) return;

    const name = editModal.newName.trim();
    if (!name) return;

    const def = isDefault(editModal.item);

    // Check if new name already exists in active accounts (not archived)
    const nameExistsInActive = accounts.some(
      (a) => a.name.toLowerCase() === name.toLowerCase() && a.name !== editModal.item.name
    );

    if (nameExistsInActive) {
      // Show merge confirmation dialog instead of error
      setMergeConfirmModal({ oldName: editModal.item.name, newName: name });
      setEditModal(null);
      return;
    }

    if (def) {
      // Default accounts: can change both name and emoji
      const defaultItem = accounts.find((i) => i.name.toLowerCase() === editModal.item.name.toLowerCase())!;
      const updatedDefault = { ...defaultItem, name, emoji: editModal.newEmoji.slice(0, 2) || defaultItem.emoji };
      onSaveActive([updatedDefault, ...userItems]);
      if (name !== editModal.item.name) {
        setRenameModal({ oldName: editModal.item.name, newName: name, shouldUpdateTransactions: false });
      }
      setEditModal(null);
      return;
    }

    // User accounts: can change both name and emoji
    const updated = userItems.map((item) =>
      item.name === editModal.item.name
        ? { ...item, name, emoji: editModal.newEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    onSaveActive(updated);
    if (name !== editModal.item.name) {
      setRenameModal({ oldName: editModal.item.name, newName: name, shouldUpdateTransactions: false });
    }
    setEditModal(null);
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    const allNames = [...accounts, ...archivedAccounts];
    if (isDuplicate(name, allNames)) {
      setAddError(`"${name}" already exists.`);
      return;
    }
    onSaveActive([
      ...userItems,
      { name, emoji: addEmoji.slice(0, 2) || null, type: 'account', parent: null },
    ]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  function handleArchive(item: BudgetData) {
    setRestoreError(null);
    onSaveActive(userItems.filter((i) => i.name !== item.name));
    onSaveArchived([...archivedAccounts, item]);
  }

  function handleDeleteClick(name: string, source: 'active' | 'archived') {
    setDeleteDialog({ name, source });
  }

  function confirmDelete() {
    if (!deleteDialog) return;
    if (deleteDialog.source === 'active') {
      onSaveActive(userItems.filter((i) => i.name !== deleteDialog.name));
    } else {
      onSaveArchived(archivedAccounts.filter((i) => i.name !== deleteDialog.name));
    }
    setDeleteDialog(null);
  }

  function handleRestore(item: BudgetData) {
    if (accounts.some((a) => a.name.toLowerCase() === item.name.toLowerCase())) {
      setRestoreError(
        `An active account named "${item.name}" already exists. Rename it before restoring.`,
      );
      return;
    }
    setRestoreError(null);
    onSaveActive([...userItems, item]);
    onSaveArchived(archivedAccounts.filter((a) => a.name !== item.name));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Active Accounts */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Active Accounts
          </h3>
        </div>

        {accounts.length > 0 && (
          <div className="divide-y divide-border">
            {accounts.map((item) => {
              const def = isDefault(item);
              return (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                  <span className="flex-1 text-sm text-text">{item.name}</span>
                  {def && (
                    <span aria-label="Default account" title="Default">
                      ⭐
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="text-text-muted hover:text-brand p-1"
                    aria-label={`Edit ${item.name}`}
                  >
                    ✏️
                  </button>
                  {!def && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleArchive(item)}
                        className="text-text-muted hover:text-brand p-1"
                        aria-label={`Archive ${item.name}`}
                      >
                        📦
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item.name, 'active')}
                        className="text-text-muted hover:text-red-600 p-1"
                        aria-label={`Delete ${item.name}`}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={addEmoji}
              onChange={(e) => setAddEmoji(e.target.value.slice(0, 2))}
              className="w-10 text-center border border-border rounded-lg p-1.5 text-sm"
              placeholder="😀"
              aria-label="New account emoji"
              maxLength={2}
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => {
                setAddName(e.target.value);
                setAddError('');
              }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Account name"
              aria-label="New account name"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addName.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--brand-gradient)' }}
            >
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
        </div>
      </div>

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setArchivedOpen((o) => !o);
              setRestoreError(null);
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
            aria-expanded={archivedOpen}
          >
            <span>Archived ({archivedAccounts.length})</span>
            <span aria-hidden="true">{archivedOpen ? '▾' : '▸'}</span>
          </button>
          {archivedOpen && (
            <div className="divide-y divide-border border-t border-border">
              {restoreError && (
                <p className="px-5 py-3 text-xs text-red-600">{restoreError}</p>
              )}
              {archivedAccounts.map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3 opacity-60">
                  <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                  <span className="flex-1 text-sm text-text">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
                    aria-label={`Restore ${item.name}`}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item.name, 'archived')}
                    className="text-text-muted hover:text-red-600 p-1"
                    aria-label={`Delete ${item.name}`}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit account modal */}
      {editModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="edit-modal-title" className="text-base font-semibold text-text">
              Edit account
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Emoji</label>
                <input
                  type="text"
                  value={editModal.newEmoji}
                  onChange={(e) => setEditModal({ ...editModal, newEmoji: e.target.value.slice(0, 2) })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm mt-1"
                  placeholder="😀"
                  aria-label="Emoji"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={editModal.newName}
                  onChange={(e) => setEditModal({ ...editModal, newName: e.target.value, error: '' })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm mt-1"
                  aria-label="Name"
                />
              </div>
              {isDefault(editModal.item) && (
                <p className="text-xs text-text-muted italic">
                  ⭐ This is a default account. It cannot be deleted, but you can rename it.
                </p>
              )}
              {editModal.error && <p className="text-xs text-red-600">{editModal.error}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal with update transactions option */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-modal-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="rename-modal-title" className="text-base font-semibold text-text">
              Update account name
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Account "<strong>{renameModal.oldName}</strong>" will be renamed to "<strong>{renameModal.newName}</strong>".
            </p>

            {/* Update transactions checkbox section */}
            <div className="border-t border-border pt-4">
              <div className={`flex items-start gap-3 ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  id="update-transactions"
                  checked={renameModal.shouldUpdateTransactions}
                  onChange={(e) => setRenameModal({ ...renameModal, shouldUpdateTransactions: e.target.checked })}
                  disabled={!isPremium}
                  className="mt-1 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Update all existing transactions"
                />
                <div className="flex-1">
                  <label htmlFor="update-transactions" className={`text-sm font-medium text-text ${!isPremium ? 'cursor-not-allowed' : ''}`}>
                    Update all existing transactions
                  </label>
                  <p className="text-xs text-text-muted mt-1">
                    All past transactions with account "{renameModal.oldName}" will be updated to "{renameModal.newName}".
                  </p>
                  {!isPremium && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-900">
                        💎 <strong>Premium feature:</strong> Upgrade to premium to update all past transactions. Non-premium users can only update future transactions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (renameModal.shouldUpdateTransactions) {
                    bulkRename(uid, renameModal.oldName, renameModal.newName);
                  }
                  setRenameModal(null);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                {renameModal.shouldUpdateTransactions ? 'Update all & save' : 'Save without updating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge confirmation modal */}
      {mergeConfirmModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-modal-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="merge-modal-title" className="text-base font-semibold text-text">
              Merge accounts?
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-text-muted leading-relaxed">
                Account "<strong>{mergeConfirmModal.oldName}</strong>" will be merged into the existing account "<strong>{mergeConfirmModal.newName}</strong>".
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  <strong>⚠️ Warning:</strong> This action will move all transactions from "{mergeConfirmModal.oldName}" to "{mergeConfirmModal.newName}". This action <strong>cannot be reversed</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMergeConfirmModal(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Delete the old account
                  onSaveActive(userItems.filter((a) => a.name !== mergeConfirmModal.oldName));
                  // Update all transactions with the new account name
                  bulkRename(uid, mergeConfirmModal.oldName, mergeConfirmModal.newName);
                  setMergeConfirmModal(null);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Merge accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-text">
              Delete "{deleteDialog.name}"?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This account will be removed. Transactions using "{deleteDialog.name}" will{' '}
              <strong>not</strong> be changed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
