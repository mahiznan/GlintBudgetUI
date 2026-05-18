import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';

interface BudgetDataTabProps {
  itemType: string;
  allItems: BudgetData[];
  defaultItems: BudgetData[];
  onSave: (userItems: BudgetData[]) => Promise<void>;
  saving: boolean;
}

function isDuplicate(name: string, allItems: BudgetData[], excludeName?: string): boolean {
  const lower = name.trim().toLowerCase();
  return allItems.some(
    (item) =>
      item.name.toLowerCase() === lower &&
      item.name.toLowerCase() !== (excludeName?.toLowerCase() ?? '\0'),
  );
}

export default function BudgetDataTab({
  itemType,
  allItems,
  defaultItems,
  onSave,
  saving,
}: BudgetDataTabProps) {
  const [defaultsOpen, setDefaultsOpen] = useState(true);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editEmoji, setEditEmoji] = useState('');
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');

  const userItems = allItems.filter(
    (item) => !defaultItems.some((d) => d.name.toLowerCase() === item.name.toLowerCase()),
  );

  function startEdit(item: BudgetData) {
    setEditingName(item.name);
    setEditEmoji(item.emoji ?? '');
    setEditName(item.name);
    setEditError('');
  }

  function cancelEdit() {
    setEditingName(null);
    setEditError('');
  }

  async function handleSaveEdit() {
    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, allItems, editingName!)) {
      setEditError(`"${name}" already exists.`);
      return;
    }
    const updated = userItems.map((item) =>
      item.name === editingName
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    await onSave(updated);
    cancelEdit();
  }

  async function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    if (isDuplicate(name, allItems)) {
      setAddError(`"${name}" already exists.`);
      return;
    }
    const newItem: BudgetData = {
      name,
      emoji: addEmoji.slice(0, 2) || null,
      type: itemType,
      parent: null,
    };
    await onSave([...userItems, newItem]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  async function handleDelete(item: BudgetData) {
    await onSave(userItems.filter((i) => i.name !== item.name));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Defaults section */}
      {defaultItems.length > 0 && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setDefaultsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
            aria-expanded={defaultsOpen}
          >
            <span>Defaults ({defaultItems.length})</span>
            <span aria-hidden="true">{defaultsOpen ? '▾' : '▸'}</span>
          </button>
          {defaultsOpen && (
            <div className="divide-y divide-border border-t border-border">
              {defaultItems.map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                  <span className="flex-1 text-sm text-text">{item.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted border border-border">
                    Default
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Items section */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">My Items</h3>
        </div>

        {userItems.length > 0 && (
          <div className="divide-y divide-border">
            {userItems.map((item) => (
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
                        disabled={saving}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}
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
                      onClick={() => handleDelete(item)}
                      disabled={saving}
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
              aria-label="Emoji"
              maxLength={2}
            />
            <input
              type="text"
              value={addName}
              onChange={(e) => { setAddName(e.target.value); setAddError(''); }}
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
              placeholder="Name"
              aria-label="Name"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !addName.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}
            >
              Add
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
        </div>
      </div>
    </div>
  );
}
