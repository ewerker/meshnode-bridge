import { ArrowUpRight, ArrowDownLeft, Radio, Trash2, Wifi, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getFavorites } from '@/components/NodePicker';

export default function MessageList({ messages, onDelete, channels }) {
  const favorites = getFavorites();

  const getChannelName = (ch) => {
    if (!channels || !ch) return null;
    const num = parseInt(ch);
    if (isNaN(num)) return null;
    const found = channels.find(c => c.number === num);
    return found?.name || null;
  };
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Radio className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No messages</p>
        <p className="text-xs mt-1 opacity-60">Waiting for Meshtastic messages…</p>
      </div>
    );
  }

  const parseRaw = (raw) => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  };

  return (
    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
      {messages.map((msg) => {
        const raw = parseRaw(msg.raw_payload);
        const fromLabel = raw.from_label || '';
        const rxSnr = raw.rx_snr;
        const rxRssi = raw.rx_rssi;
        const gatewayId = raw.gateway_id;

        return (
        <div
          key={msg.id}
          className={`flex gap-3 p-3 rounded-xl border transition-all ${
            msg.direction === 'outbound'
              ? 'bg-primary/10 border-primary/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className={`mt-0.5 p-2 rounded-lg ${msg.direction === 'outbound' ? 'bg-primary/20 border border-primary/40' : 'bg-emerald-500/20 border border-emerald-500/40'}`}>
            {msg.direction === 'outbound'
              ? <ArrowUpRight className="w-5 h-5 text-primary" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={`text-xs font-semibold uppercase tracking-wider ${msg.direction === 'outbound' ? 'text-primary' : 'text-emerald-400'}`}>
                {msg.direction === 'outbound' ? '⬆ Sent' : '⬇ Received'}
              </span>
              <span className="text-muted-foreground/60">·</span>
              {msg.direction === 'inbound' && (fromLabel || msg.from_node) && (
                <>
                  <span className="flex items-center gap-1 text-xs text-foreground font-medium">
                    {favorites.includes(msg.from_node) && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    {fromLabel || msg.from_node}
                  </span>
                  {fromLabel && msg.from_node && (
                    <span className="text-xs font-mono text-muted-foreground">{msg.from_node}</span>
                  )}
                  <span className="text-muted-foreground/60">·</span>
                </>
              )}
              {msg.to_node && msg.to_node !== '^all' ? (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-purple-500/15 text-purple-400">
                  {favorites.includes(msg.to_node) && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  DM → {msg.to_node}
                </span>
              ) : (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.direction === 'outbound' ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {getChannelName(msg.channel) ? `${getChannelName(msg.channel)} (${msg.channel})` : `Channel ${msg.channel}`}
                </span>
              )}
              {msg.direction === 'outbound' && msg.status && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.status === 'acked' ? 'bg-emerald-500/15 text-emerald-400' :
                  msg.status === 'implicit_ack' ? 'bg-yellow-500/15 text-yellow-400' :
                  msg.status === 'failed' ? 'bg-destructive/15 text-destructive' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {msg.status === 'acked' ? '✓ ACK' : msg.status === 'implicit_ack' ? '⚡ Implicit' : msg.status === 'failed' ? '✗ NAK' : msg.status}
                </span>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-sm text-foreground break-words">{msg.text}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {(rxSnr !== undefined && rxSnr !== null) && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> SNR {rxSnr}
                </span>
              )}
              {(rxRssi !== undefined && rxRssi !== null) && (
                <span className="text-xs text-muted-foreground">
                  RSSI {rxRssi}
                </span>
              )}
              {gatewayId && (
                <span className="text-xs text-muted-foreground font-mono">
                  GW {gatewayId}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {msg.meshtastic_timestamp
                  ? formatDistanceToNow(new Date(msg.meshtastic_timestamp * 1000), { addSuffix: true })
                  : msg.created_date && !isNaN(new Date(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z').getTime())
                  ? formatDistanceToNow(
                      new Date(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z'),
                      { addSuffix: true }
                    )
                  : ''}
              </span>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}