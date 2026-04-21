import { ArrowUpRight, ArrowDownLeft, Radio, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MessageList({ messages, onDelete }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <Radio className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No messages</p>
        <p className="text-xs mt-1 opacity-60">Waiting for Meshtastic messages…</p>
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
              ? 'bg-cyan-950/30 border-cyan-900/50 mr-8'
              : 'bg-slate-800/60 border-slate-700/50 ml-8'
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
                {msg.mqtt_topic ? msg.mqtt_topic.split('/')[1] : '—'}
              </span>
              <span className="text-slate-600">·</span>
              {msg.to_node && msg.to_node !== '^all' ? (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-900/50 text-purple-400">
                  DM → {msg.to_node}
                </span>
              ) : (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.direction === 'outbound' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-emerald-900/50 text-emerald-400'
                }`}>
                  Channel {msg.channel}
                </span>
              )}
              {msg.direction === 'outbound' && msg.status && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.status === 'acked' ? 'bg-emerald-900/50 text-emerald-400' :
                  msg.status === 'implicit_ack' ? 'bg-yellow-900/50 text-yellow-400' :
                  msg.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {msg.status === 'acked' ? '✓ ACK' : msg.status === 'implicit_ack' ? '⚡ Implicit' : msg.status === 'failed' ? '✗ NAK' : msg.status}
                </span>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 rounded hover:bg-red-900/40 text-slate-600 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-sm text-slate-200 break-words">{msg.text}</p>
            <p className="text-xs text-slate-600 mt-1">
              {msg.meshtastic_timestamp
                ? formatDistanceToNow(new Date(msg.meshtastic_timestamp * 1000), { addSuffix: true })
                : msg.created_date && !isNaN(new Date(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z').getTime())
                ? formatDistanceToNow(
                    new Date(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z'),
                    { addSuffix: true }
                  )
                : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}