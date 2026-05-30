import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';
import { useBulkRenameVendor } from '../../hooks/useBulkRenameVendor';
import { useAllTransactionVendors } from '../../hooks/useAllTransactionVendors';

interface VendorsTabProps {
  vendors: BudgetData[];
  uid: string;
  onSave: (items: BudgetData[]) => void;
}

function isDuplicate(name: string, allNames: Set<string>, excludeName?: string): boolean {
  const lower = name.trim().toLowerCase();
  if (excludeName && lower === excludeName.toLowerCase()) return false;
  return allNames.has(name.trim()) ||
    [...allNames].some((n) => n.toLowerCase() === lower);
}

export default function VendorsTab({ vendors, uid, onSave }: VendorsTabProps) {
  const { mutate: bulkRenameVendor } = useBulkRenameVendor();
  const { vendorNames, loading: txLoading } = useAllTransactionVendors(uid);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editError, setEditError] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addError, setAddError] = useState('');
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [fromTxOpen, setFromTxOpen] = useState(false);
  const [txSearch, setTxSearch] = useState('');

  const allVendorNames: Set<string> = new Set([
    ...vendors.map((v) => v.name),
    ...vendorNames,
  ]);

  const txOnlyVendors = [...vendorNames]
    .filter((name) => !vendors.some((v) => v.name.toLowerCase() === name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const filteredTxVendors = txSearch.trim()
    ? txOnlyVendors.filter((name) => name.toLowerCase().includes(txSearch.trim().toLowerCase()))
    : txOnlyVendors;

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
    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, allVendorNames, oldName)) {
      setEditError(`"${name}" already exists.`);
      return;
    }
    const updated = vendors.map((item) =>
      item.name === oldName
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    onSave(updated);
    if (name !== oldName) {
      setRenameModal({ oldName, newName: name });
    }
    setEditingName(null);
    setEditError('');
  }

  function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    if (isDuplicate(name, allVendorNames)) {
      setAddError(`"${name}" already exists.`);
      return;
    }
    onSave([...vendors, { name, emoji: addEmoji.slice(0, 2) || null, type: 'vendor', parent: null }]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  function handleDelete(name: string) {
    onSave(vendors.filter((v) => v.name !== name));
    setDeleteDialog(null);
  }

  function handleSaveToList(name: string) {
    onSave([...vendors, { name, emoji: null, type: 'vendor', parent: null }]);
  }

  function handleTxRename(oldName: string, newName: string): string | null {
    if (isDuplicate(newName, allVendorNames, oldName)) {
      return `"${newName}" already exists.`;
    }
    setRenameModal({ oldName, newName });
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Saved Vendors */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Saved Vendors
          </h3>
        </div>

        {vendors.length > 0 && (
          <div className="divide-y divide-border">
            {vendors.map((item) => (
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
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                        aria-label="Name"
                      />
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
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-text-muted hover:text-brand p-1"
                      aria-label={`Edit ${item.name}`}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDialog(item.name)}
                      className="text-text-muted hover:text-red-600 p-1"
                      aria-label={`Delete ${item.name}`}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
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
              aria-label="New vendor emoji"
              maxLength={2}
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Vendor name"
              aria-label="New vendor name"
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

      {/* From Transactions */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setFromTxOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
          aria-expanded={fromTxOpen}
        >
          <span>From Transactions ({txLoading ? '…' : txOnlyVendors.length})</span>
          <span aria-hidden="true">{fromTxOpen ? '▾' : '▸'}</span>
        </button>
        {fromTxOpen && (
          <div className="border-t border-border">
            <div className="px-5 py-3 border-b border-border">
              <input
                type="search"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search vendors…"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm"
                aria-label="Search transaction vendors"
              />
            </div>
            <div className="divide-y divide-border">
              {txLoading && (
                <p className="px-5 py-3 text-sm text-text-muted">Loading…</p>
              )}
              {!txLoading && txOnlyVendors.length === 0 && (
                <p className="px-5 py-3 text-sm text-text-muted">
                  All transaction vendors are already saved.
                </p>
              )}
              {!txLoading && txOnlyVendors.length > 0 && filteredTxVendors.length === 0 && (
                <p className="px-5 py-3 text-sm text-text-muted">No vendors match your search.</p>
              )}
              {!txLoading && filteredTxVendors.map((name) => (
                <TxVendorRow
                  key={name}
                  name={name}
                  allVendorNames={allVendorNames}
                  onSaveToList={handleSaveToList}
                  onRename={handleTxRename}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
                  bulkRenameVendor(uid, renameModal.oldName, renameModal.newName);
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

      {/* Delete dialog */}
      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-text">
              Delete "{deleteDialog}"?
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              This vendor will be removed. Transactions using "{deleteDialog}" will{' '}
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
                onClick={() => handleDelete(deleteDialog)}
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

// ── TxVendorRow ──────────────────────────────────────────────────────────────

interface TxVendorRowProps {
  name: string;
  allVendorNames: Set<string>;
  onSaveToList: (name: string) => void;
  onRename: (oldName: string, newName: string) => string | null;
}

function TxVendorRow({ name, onSaveToList, onRename }: TxVendorRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editError, setEditError] = useState('');

  function handleSave() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === name) { setEditing(false); return; }
    const err = onRename(name, trimmed);
    if (err) { setEditError(err); return; }
    setEditing(false);
    setEditError('');
  }

  if (editing) {
    return (
      <div className="px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
            aria-label="Name"
          />
          <button
            type="button"
            onClick={handleSave}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'var(--brand-gradient)' }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setEditName(name); setEditError(''); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
        {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="w-6" />
      <span className="flex-1 text-sm text-text">{name}</span>
      <button
        type="button"
        onClick={() => { setEditing(true); setEditName(name); }}
        className="text-text-muted hover:text-brand p-1"
        aria-label={`Edit ${name}`}
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={() => onSaveToList(name)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
        aria-label={`Save ${name} to list`}
      >
        Save to list
      </button>
    </div>
  );
}
