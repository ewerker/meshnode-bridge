import { useState, useEffect } from 'react';
import { X, UserPlus, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Dialog for creating or editing a manual mesh node entry.
// Props: open, onClose, onSaved, node (optional, for edit mode)
export default function ManualNodeDialog({ open, onClose, onSaved, node }) {
  const [nodeId, setNodeId] = useState('');
  const [shortName, setShortName] = useState('');
  const [longName, setLongName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!node;

  useEffect(() => {
    if (open) {
      setNodeId(node?.node_id || '');
      setShortName(node?.short_name || '');
      setLongName(node?.long_name || '');
      setError(null);
    }
  }, [open, node]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = isEdit
        ? { action: 'update', id: node.id, short_name: shortName, long_name: longName }
        : { action: 'create', node_id: nodeId, short_name: shortName, long_name: longName };
      const res = await base44.functions.invoke('manualNodeCrud', payload);
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        onSaved?.();
        onClose?.();
      }
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const validId = isEdit || /^![0-9a-fA-F]+$/.test(nodeId.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
            {isEdit ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isEdit ? 'Node bearbeiten' : 'Manuelle Node anlegen'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Node-ID
          </label>
          <input
            type="text"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            placeholder="!49b65bc8"
            disabled={isEdit}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
            required
          />
          {!isEdit && nodeId && !validId && (
            <p className="text-xs text-destructive mt-1">Format: !gefolgt von Hex-Ziffern</p>
          )}
          {isEdit && (
            <p className="text-xs text-muted-foreground mt-1">Die Node-ID kann nicht geändert werden.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Kurzname
          </label>
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="z.B. ABC"
            maxLength={4}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Langname
          </label>
          <input
            type="text"
            value={longName}
            onChange={(e) => setLongName(e.target.value)}
            placeholder="z.B. Alice's Node"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {error && (
          <div className="text-xs px-3 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving || (!isEdit && !validId)}
            className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium transition-colors"
          >
            {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}