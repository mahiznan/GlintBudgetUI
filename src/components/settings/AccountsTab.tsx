import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';
import { useBulkRenameAccount } from '../../hooks/useBulkRenameAccount';

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
  return items.some(
    (item) =>
      item.name.toLowerCase() === lower &&
      item.name.toLowerCase() !== (excludeName?.toLowerCase() ?? '\0'),
  );
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

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    name: string;
    source: 'active' | 'archived';
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  function isDefault(item: BudgetData): boolean {
    return defaultItems.some((d) => d.name.toLowerCase() === item.name.toLowerCase());
  }

  const userItems = accounts.filter((item) => !isDefault(item));

  function startEdit(item: BudgetData) {
    setEditingName(item.name);
    setEditName(item.name);
    setEditEmoji(item.emoji ?? '');
    setEditError('');
  }

  function cancelEdit() {
    setEditingName(null);
    setEditError('');
  }

  function handleSaveEdit() {
    const oldName = editingName!;
    const def = isDefault({ name: oldName } as BudgetData);

    if (def) {
      // Default accounts: name is read-only; only emoji can change.
      // Write the default with its new emoji alongside user items so
      // mergeWithDefaults will pick up the Firestore version.
      const defaultItem = accounts.find((i) => i.name === oldName)!;
      onSaveActive([
        { ...defaultItem, emoji: editEmoji.slice(0, 2) || defaultItem.emoji },
        ...userItems,
      ]);
      setEditingName(null);
      return;
    }

    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, accounts, oldName)) {
      setEditError(`"${name}" already exists.`);
      return;
    }
    const updated = userItems.map((item) =>
      item.name === oldName
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    onSaveActive(updated);
    if (name !== oldName) {
      setRenameModal({ oldName, newName: name });
    }
    setEditingName(null);
    setEditError('');
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    if (isDuplicate(name, accounts)) {
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
                <div key={item.name} className="px-5 py-3">
                  {editingName === item.name ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editEmoji}
                          onChange={(e) => setEditEmoji(e.target.value.slice(0, 2))}
                          className="w-10 text-center border border-border rounded-lg p-1.5 text-sm"
                          placeholder="😀"
                          aria-label="Emoji"
                          maxLength={2}
                        />
                        {isDefault({ name: editingName! } as BudgetData) ? (
                          <span className="flex-1 text-sm text-text px-3 py-1.5" aria-label="Name">
                            {editName}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              setEditError('');
                            }}
                            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                            aria-label="Name"
                          />
                        )}
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                          style={{ background: 'var(--brand-gradient)' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
                        >
                          Cancel
                        </button>
                      </div>
                      {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
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
            onClick={() => setArchivedOpen((o) => !o)}
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

      {/* Rename modal */}
      {renameModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-modal-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="rename-modal-title" className="text-base font-semibold text-text">
              Update transactions?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Do you want to update all existing transactions from{' '}
              <strong>"{renameModal.oldName}"</strong> to{' '}
              <strong>"{renameModal.newName}"</strong>?
            </p>
            <p className="text-xs text-text-muted italic">
              Choosing No will keep old transactions linked to "{renameModal.oldName}".
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text"
              >
                No, keep as-is
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkRename(uid, renameModal.oldName, renameModal.newName);
                  setRenameModal(null);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Yes, update all
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
