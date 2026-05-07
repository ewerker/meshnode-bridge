import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Send, Inbox, Cpu, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

export default function DangerZone({ nodeId, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { language } = useLanguage();
  const isDe = language === 'de';

  useEffect(() => {
    base44.auth.me().then(me => setIsAdmin(me?.role === 'admin')).catch(() => setIsAdmin(false));
  }, []);

  const deleteInBatches = async (records, deleteFn) => {
    let count = 0;
    for (const r of records) {
      try {
        await deleteFn(r.id);
        count++;
      } catch (_) { /* skip */ }
    }
    return count;
  };

  const handleDelete = async (kind) => {
    if (!isAdmin) {
      setFeedback({ type: 'error', msg: isDe ? 'Nur Administratoren dürfen Daten löschen.' : 'Only administrators may delete data.' });
      return;
    }
    if (!nodeId) {
      setFeedback({ type: 'error', msg: isDe ? 'Bitte zuerst Node-ID setzen und speichern.' : 'Please set and save a Node ID first.' });
      return;
    }
    const labels = {
      sent: `alle GESENDETEN Nachrichten der Node-ID ${nodeId}`,
      received: `alle EMPFANGENEN Nachrichten der Node-ID ${nodeId}`,
      nodes: `alle Nodes der Node-ID ${nodeId}`,
    };
    if (!confirm(isDe ? `Wirklich ${labels[kind]} löschen? Das kann nicht rückgängig gemacht werden.` : `Really delete ${labels[kind]}? This cannot be undone.`)) return;

    setBusy(kind);
    setFeedback(null);
    try {
      let deleted = 0;
      if (kind === 'sent') {
        const records = await base44.entities.MeshMessage.filter({ direction: 'outbound', gateway_node_id: nodeId }, '-created_date', 1000);
        deleted = await deleteInBatches(records, (id) => base44.entities.MeshMessage.delete(id));
      } else if (kind === 'received') {
        const records = await base44.entities.MeshMessage.filter({ direction: 'inbound', gateway_node_id: nodeId }, '-created_date', 1000);
        deleted = await deleteInBatches(records, (id) => base44.entities.MeshMessage.delete(id));
      } else if (kind === 'nodes') {
        const records = await base44.entities.MeshNode.filter({ gateway_node_id: nodeId }, '-last_heard', 1000);
        deleted = await deleteInBatches(records, (id) => base44.entities.MeshNode.delete(id));
      }
      setFeedback({ type: 'success', msg: isDe ? `${deleted} Eintrag/Einträge gelöscht.` : `${deleted} record(s) deleted.` });
      onChanged?.();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || (isDe ? 'Löschen fehlgeschlagen' : 'Delete failed') });
    } finally {
      setBusy(null);
    }
  };

  const Btn = ({ kind, icon: Icon, label }) => {
    const disabled = busy !== null || !nodeId || !isAdmin;
    return (
      <button
        onClick={() => handleDelete(kind)}
        disabled={disabled}
        title={!isAdmin ? (isDe ? 'Nur Administratoren dürfen löschen' : 'Only administrators may delete') : undefined}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${
          !isAdmin
            ? 'bg-secondary text-muted-foreground border-border cursor-not-allowed opacity-60'
            : 'bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 text-destructive border-destructive/30'
        }`}
      >
        {busy === kind ? (
          <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
        ) : !isAdmin ? (
          <Lock className="w-3.5 h-3.5" />
        ) : (
          <Icon className="w-3.5 h-3.5" />
        )}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="border-t border-border pt-5">
      <label className="block text-xs font-medium text-destructive mb-2 uppercase tracking-wider">
        <AlertTriangle className="inline w-3 h-3 mr-1" />
        {isDe ? 'Gefahrenzone' : 'Danger Zone'}
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        {isDe ? 'Löscht nur Daten, die zur konfigurierten Node-ID' : 'Deletes only data belonging to the configured Node ID'} <span className="font-mono text-foreground">{nodeId || '—'}</span>.
        {!isAdmin && (
          <span className="block mt-1 text-muted-foreground/80">{isDe ? 'Diese Aktionen sind nur für Administratoren verfügbar.' : 'These actions are only available to administrators.'}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn kind="sent" icon={Send} label={isDe ? 'Gesendete Messages löschen' : 'Delete sent messages'} />
        <Btn kind="received" icon={Inbox} label={isDe ? 'Empfangene Messages löschen' : 'Delete received messages'} />
        <Btn kind="nodes" icon={Cpu} label={isDe ? 'Alle Nodes löschen' : 'Delete all nodes'} />
      </div>
      {feedback && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}