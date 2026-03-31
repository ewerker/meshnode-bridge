import { ArrowUpRight, ArrowDownLeft, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MessageList({ messages }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <Radio className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Keine Nachrichten</p>
        <p className="text-xs mt-1 opacity-60">Warte auf Meshtastic-Nachrichten…</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 p-3 rounded-xl border transition-all ${
            msg.direction === 'outbound'
              ? 'bg-cyan-950/30 border-cyan-900/50 ml-8'
              : 'bg-slate-800/60 border-slate-700/50 mr-8'
          }`}
        >
          <div className={`mt-0.5 p-1.5 rounded-lg ${msg.direction === 'outbound' ? 'bg-cyan-800/40' : 'bg-slate-700'}`}>
            {msg.direction === 'outbound'
              ? <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
              : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-slate-400">
                {msg.direction === 'outbound' ? msg.from_node : msg.from_node}
              </span>
              <span className="text-slate-600">→</span>
              <span className="text-xs font-mono text-slate-500">{msg.to_node || '^all'}</span>
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${
                msg.direction === 'outbound' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-emerald-900/50 text-emerald-400'
              }`}>
                {msg.channel}
              </span>
            </div>
            <p className="text-sm text-slate-200 break-words">{msg.text}</p>
            <p className="text-xs text-slate-600 mt-1">
              {msg.created_date
                ? formatDistanceToNow(new Date(msg.created_date), { addSuffix: true, locale: de })
                : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}