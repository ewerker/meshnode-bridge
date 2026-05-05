import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Send, Inbox, Cpu, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DangerZone({ nodeId, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
      setFeedback({ type: 'error', msg: 'Nur Administratoren dürfen Daten löschen.' });
      return;
    }
    if (!nodeId) {
      setFeedback({ type: 'error', msg: 'Bitte zuerst Node-ID setzen und speichern.' });
      return;
    }
    const labels = {
      sent: `alle GESENDETEN Nachrichten der Node-ID ${nodeId}`,
      received: `alle EMPFANGENEN Nachrichten der Node-ID ${nodeId}`,
      nodes: `alle Nodes der Node-ID ${nodeId}`,
    };
    if (!confirm(`Wirklich ${labels[kind]} löschen? Das kann nicht rückgängig gemacht werden.`)) return;

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
      setFeedback({ type: 'success', msg: `${deleted} Eintrag/Einträge gelöscht.` });
      onChanged?.();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Löschen fehlgeschlagen' });
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
        title={!isAdmin ? 'Nur Administratoren dürfen löschen' : undefined}
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
        Danger Zone
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        Löscht nur Daten, die zur konfigurierten Node-ID <span className="font-mono text-foreground">{nodeId || '—'}</span> gehören.
        {!isAdmin && (
          <span className="block mt-1 text-muted-foreground/80">Diese Aktionen sind nur für Administratoren verfügbar.</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn kind="sent" icon={Send} label="Gesendete Messages löschen" />
        <Btn kind="received" icon={Inbox} label="Empfangene Messages löschen" />
        <Btn kind="nodes" icon={Cpu} label="Alle Nodes löschen" />
      </div>
      {feedback && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}