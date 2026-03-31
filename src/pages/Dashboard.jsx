import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Radio, RefreshCw, Activity, Layers } from 'lucide-react';
import MessageList from '@/components/MessageList';
import SendMessageForm from '@/components/SendMessageForm';
import PollPanel from '@/components/PollPanel';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const data = await base44.entities.MeshMessage.list('-created_date', 100);
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
    const unsub = base44.entities.MeshMessage.subscribe((event) => {
      if (event.type === 'create') {
        setMessages((prev) => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [fetchMessages]);

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.direction === 'outbound').length,
    received: messages.filter((m) => m.direction === 'inbound').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-600/40 flex items-center justify-center">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">Meshtastic MQTT Bridge</h1>
              <p className="text-xs text-slate-500">Web ↔ MQTT ↔ Meshtastic Netz</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">{stats.sent} gesendet</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">{stats.received} empfangen</span>
              </div>
            </div>
            <button
              onClick={fetchMessages}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Send Form */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Nachricht senden
          </h2>
          <SendMessageForm onMessageSent={fetchMessages} />
        </section>

        {/* Poll Panel */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Eingehende Nachrichten abrufen
          </h2>
          <PollPanel onReceived={fetchMessages} />
          <p className="text-xs text-slate-600 mt-2">
            Verbindet sich für 8 Sekunden mit dem Broker und speichert empfangene Meshtastic-Nachrichten.
          </p>
        </section>

        {/* Message Log */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Nachrichtenverlauf
            </h2>
            <span className="text-xs text-slate-600 bg-slate-800 px-2 py-1 rounded-full">
              {stats.total} gesamt
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
        </section>
      </main>
    </div>
  );
}