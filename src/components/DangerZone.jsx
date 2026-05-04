import { useState } from 'react';
import { Trash2, AlertTriangle, Send, Inbox, Cpu } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DangerZone({ nodeId, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);

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
    if (!nodeId) {
      setFeedback({ type: 'error', msg: 'Bitte zuerst Node-ID setzen und speichern.' });
      return;
    }
    const labels = {
      sent: `alle GESENDETEN Nachrichten von ${nodeId}`,
      received: `alle EMPFANGENEN Nachrichten an ${nodeId}`,
      nodes: `den Node-Eintrag für ${nodeId} (eigener Node)`,
    };
    if (!confirm(`Wirklich ${labels[kind]} löschen? Das kann nicht rückgängig gemacht werden.`)) return;

    setBusy(kind);
    setFeedback(null);
    try {
      let deleted = 0;
      if (kind === 'sent') {
        const records = await base44.entities.MeshMessage.filter({ direction: 'outbound', from_node: nodeId }, '-created_date', 1000);
        deleted = await deleteInBatches(records, (id) => base44.entities.MeshMessage.delete(id));
      } else if (kind === 'received') {
        const records = await base44.entities.MeshMessage.filter({ direction: 'inbound', to_node: nodeId }, '-created_date', 1000);
        deleted = await deleteInBatches(records, (id) => base44.entities.MeshMessage.delete(id));
      } else if (kind === 'nodes') {
        const records = await base44.entities.MeshNode.filter({ node_id: nodeId });
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

  const Btn = ({ kind, icon: Icon, label }) => (
    <button
      onClick={() => handleDelete(kind)}
      disabled={busy !== null || !nodeId}
      className="flex items-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 text-destructive border border-destructive/30 rounded-lg text-xs font-medium transition-colors"
    >
      {busy === kind ? (
        <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="border-t border-border pt-5">
      <label className="block text-xs font-medium text-destructive mb-2 uppercase tracking-wider">
        <AlertTriangle className="inline w-3 h-3 mr-1" />
        Danger Zone
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        Löscht nur Daten, die zur konfigurierten Node-ID <span className="font-mono text-foreground">{nodeId || '—'}</span> gehören.
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn kind="sent" icon={Send} label="Gesendete Messages löschen" />
        <Btn kind="received" icon={Inbox} label="Empfangene Messages löschen" />
        <Btn kind="nodes" icon={Cpu} label="Eigenen Node-Eintrag löschen" />
      </div>
      {feedback && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}