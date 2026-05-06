import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Pencil, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Dialog for creating or editing a manual mesh node entry.
// In create mode, the Node-ID input doubles as a search/autocomplete field that
// suggests existing portal users and known mesh nodes (filtered as the user types).
// Free entries are still allowed; ?-IDs are validated server-side.
// Props: open, onClose, onSaved, node (optional, for edit mode)
export default function ManualNodeDialog({ open, onClose, onSaved, node }) {
  const [nodeId, setNodeId] = useState('');
  const [shortName, setShortName] = useState('');
  const [longName, setLongName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const isEdit = !!node;

  useEffect(() => {
    if (open) {
      setNodeId(node?.node_id || '');
      setShortName(node?.short_name || '');
      setLongName(node?.long_name || '');
      setError(null);
      setShowSuggestions(false);
    }
  }, [open, node]);

  // Load suggestions (portal users + known mesh nodes) once when dialog opens in create mode
  useEffect(() => {
    if (!open || isEdit) return;
    (async () => {
      try {
        const res = await base44.functions.invoke('getPortalUsers', {});
        const users = (res.data?.users || []).map(u => ({
          node_id: u.node_id,
          long_name: u.long_name || '',
          short_name: '',
          source: 'portal',
        }));
        const nodes = (res.data?.nodes || []).map(n => ({
          node_id: n.node_id,
          long_name: n.long_name || '',
          short_name: n.short_name || '',
          source: 'mesh',
        }));
        // Dedup by node_id, portal users win
        const map = new Map();
        nodes.forEach(n => map.set(n.node_id, n));
        users.forEach(u => map.set(u.node_id, u));
        setSuggestions(Array.from(map.values()));
      } catch (_) { /* ignore */ }
    })();
  }, [open, isEdit]);

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

  const validId = isEdit || /^[!?][0-9a-fA-F]+$/.test(nodeId.trim());
  const trimmed = nodeId.trim().toLowerCase();
  const filteredSuggestions = trimmed && !isEdit
    ? suggestions.filter(s =>
        s.node_id.toLowerCase().includes(trimmed) ||
        (s.long_name || '').toLowerCase().includes(trimmed) ||
        (s.short_name || '').toLowerCase().includes(trimmed)
      ).slice(0, 8)
    : [];

  const pickSuggestion = (s) => {
    setNodeId(s.node_id);
    if (!shortName && s.short_name) setShortName(s.short_name);
    if (!longName && s.long_name) setLongName(s.long_name);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

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

        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            Node-ID {!isEdit && <span className="text-muted-foreground/70 normal-case font-normal">(suchbar)</span>}
          </label>
          <div className="relative">
            {!isEdit && (
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={nodeId}
              onChange={(e) => { setNodeId(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="!49b65bc8 oder ?abc123 — oder Name eintippen"
              disabled={isEdit}
              className={`w-full bg-secondary border border-border rounded-lg ${isEdit ? 'px-3' : 'pl-8 pr-3'} py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed`}
              required
              autoComplete="off"
            />
          </div>
          {!isEdit && showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.node_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${s.source === 'portal' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'}`}>
                    {s.source === 'portal' ? 'Portal' : 'Mesh'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">
                      {s.long_name || s.short_name || s.node_id}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{s.node_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!isEdit && nodeId && !validId && (
            <p className="text-xs text-destructive mt-1">Format: ! oder ? gefolgt von Hex-Ziffern</p>
          )}
          {!isEdit && validId && nodeId.trim().startsWith('?') && (
            <p className="text-xs text-emerald-400 mt-1">Dummy-Node — wird gegen registrierte Portal-Nutzer geprüft.</p>
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