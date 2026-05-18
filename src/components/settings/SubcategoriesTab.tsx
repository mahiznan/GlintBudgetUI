import { useState } from 'react';
import type { BudgetData } from '../../firestore/types';

interface SubcategoriesTabProps {
  allItems: BudgetData[];
  defaultItems: BudgetData[];
  categories: BudgetData[];
  onSave: (userItems: BudgetData[]) => Promise<void>;
  saving: boolean;
}

export default function SubcategoriesTab({
  allItems,
  defaultItems,
  categories,
  onSave,
  saving,
}: SubcategoriesTabProps) {
  const [defaultsOpen, setDefaultsOpen] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null); // `name::parent`
  const [editEmoji, setEditEmoji] = useState('');
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [addName, setAddName] = useState('');
  const [addParent, setAddParent] = useState('');
  const [addError, setAddError] = useState('');

  const userItems = allItems.filter(
    (item) =>
      !defaultItems.some(
        (d) =>
          d.name.toLowerCase() === item.name.toLowerCase() && d.parent === item.parent,
      ),
  );

  const defaultsByParent: Record<string, BudgetData[]> = {};
  defaultItems.forEach((item) => {
    if (!item.parent) return;
    if (!defaultsByParent[item.parent]) defaultsByParent[item.parent] = [];
    defaultsByParent[item.parent]!.push(item);
  });

  function itemKey(item: BudgetData) {
    return `${item.name}::${item.parent ?? ''}`;
  }

  function isDuplicate(name: string, parent: string, excludeKey?: string): boolean {
    const lower = name.trim().toLowerCase();
    return allItems.some((item) => {
      if (excludeKey && itemKey(item) === excludeKey) return false;
      return item.name.toLowerCase() === lower && item.parent === parent;
    });
  }

  async function handleAdd() {
    const name = addName.trim();
    if (!name || !addParent) return;
    if (isDuplicate(name, addParent)) {
      setAddError(`"${name}" already exists in ${addParent}.`);
      return;
    }
    await onSave([
      ...userItems,
      { name, emoji: addEmoji.slice(0, 2) || null, type: 'sub_category', parent: addParent },
    ]);
    setAddName('');
    setAddEmoji('');
    setAddError('');
  }

  function startEdit(item: BudgetData) {
    setEditingKey(itemKey(item));
    setEditEmoji(item.emoji ?? '');
    setEditName(item.name);
    setEditError('');
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditError('');
  }

  async function handleSaveEdit(original: BudgetData) {
    const name = editName.trim();
    if (!name) return;
    const exKey = itemKey(original);
    if (isDuplicate(name, original.parent ?? '', exKey)) {
      setEditError(`"${name}" already exists in ${original.parent}.`);
      return;
    }
    const updated = userItems.map((item) =>
      itemKey(item) === exKey
        ? { ...item, name, emoji: editEmoji.slice(0, 2) || item.emoji }
        : item,
    );
    await onSave(updated);
    cancelEdit();
  }

  async function handleDelete(item: BudgetData) {
    await onSave(userItems.filter((i) => itemKey(i) !== itemKey(item)));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Defaults grouped by parent */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDefaultsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-muted hover:bg-surface-alt transition-colors"
          aria-expanded={defaultsOpen}
        >
          <span>Defaults</span>
          <span aria-hidden="true">{defaultsOpen ? '▾' : '▸'}</span>
        </button>
        {defaultsOpen && (
          <div className="border-t border-border">
            {Object.entries(defaultsByParent).map(([parent, items]) => (
              <div key={parent} className="border-b border-border last:border-b-0">
                <div className="px-5 py-2 bg-surface-alt">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {categories.find((c) => c.name === parent)?.emoji ?? ''} {parent}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                      <span className="text-sm text-text">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Items */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-widest">My Items</h3>
        </div>
        {userItems.length > 0 && (
          <div className="divide-y divide-border">
            {userItems.map((item) => (
              <div key={itemKey(item)} className="px-5 py-3">
                {editingKey === itemKey(item) ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input type="text" value={editEmoji} onChange={(e) => setEditEmoji(e.target.value.slice(0, 2))} className="w-10 text-center border border-border rounded-lg p-1.5 text-sm" placeholder="😀" aria-label="Emoji" maxLength={2} />
                      <input type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(''); }} className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm" aria-label="Name" />
                      <button type="button" onClick={() => handleSaveEdit(item)} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}>Save</button>
                      <button type="button" onClick={cancelEdit} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text">Cancel</button>
                    </div>
                    {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm">{item.emoji ?? ''}</span>
                    <span className="flex-1 text-sm text-text">{item.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted border border-border">{item.parent}</span>
                    <button type="button" onClick={() => startEdit(item)} className="text-text-muted hover:text-brand p-1" aria-label={`Edit ${item.name}`}>✏️</button>
                    <button type="button" onClick={() => handleDelete(item)} disabled={saving} className="text-text-muted hover:text-red-600 p-1" aria-label={`Delete ${item.name}`}>🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="px-5 py-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input type="text" value={addEmoji} onChange={(e) => setAddEmoji(e.target.value.slice(0, 2))} className="w-10 text-center border border-border rounded-lg p-1.5 text-sm" placeholder="😀" aria-label="Emoji" maxLength={2} />
            <input type="text" value={addName} onChange={(e) => { setAddName(e.target.value); setAddError(''); }} className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm" placeholder="Name" aria-label="Name" />
            <select value={addParent} onChange={(e) => setAddParent(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-sm bg-surface" aria-label="Category">
              <option value="">Category</option>
              {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button type="button" onClick={handleAdd} disabled={saving || !addName.trim() || !addParent} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #007836, #1fa32e)' }}>Add</button>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
        </div>
      </div>
    </div>
  );
}
