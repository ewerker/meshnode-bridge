import { ArrowUpRight, ArrowDownLeft, Radio, Trash2, Wifi, Star, Bell, RotateCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function MessageList({ messages, onDelete, channels, onReply, onResend, onEdit, refreshKey }) {
  const [nodeMap, setNodeMap] = useState({});
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);

  const filteredMessages = (() => {
    if (isAdmin) return messages || [];
    const namedChannels = (channels || []).filter(c => c?.name && c.name.trim());
    const namedNums = namedChannels.map(c => c.number);
    const namedNamesLc = namedChannels.map(c => c.name.trim().toLowerCase());
    return (messages || []).filter(m => {
      if (m.direction !== 'inbound') return true;
      if (m.to_node && m.to_node !== '^all') return true;
      // Allow when payload-provided channel_name matches a configured channel name
      if (m.channel_name && namedNamesLc.includes(String(m.channel_name).trim().toLowerCase())) return true;
      if (m.channel === undefined || m.channel === null || m.channel === '') return true;
      const num = parseInt(m.channel);
      if (isNaN(num)) return true;
      return namedNums.includes(num);
    });
  })();
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const visibleMessages = filteredMessages.slice(startIdx, startIdx + pageSize);

  useEffect(() => { setPage(1); }, [pageSize]);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      setIsAdmin(me?.role === 'admin');
      if (!me?.node_id) { setNodeMap({}); return; }
      const nodes = await base44.entities.MeshNode.filter({ gateway_node_id: me.node_id }, '-last_heard', 500);
      const map = {};
      nodes.forEach(n => { map[n.node_id] = n; });
      setNodeMap(map);
    })();
  }, [refreshKey]);

  const getChannelName = (ch) => {
    if (!channels || ch === undefined || ch === null || ch === '') return null;
    const num = parseInt(ch);
    if (isNaN(num)) return null;
    const found = channels.find(c => c.number === num);
    return found?.name || null;
  };

  // Prefer payload-provided channel_name (truth from bridge), else map from settings.
  const getDisplayChannelName = (msg) => {
    if (msg.channel_name && String(msg.channel_name).trim()) return String(msg.channel_name).trim();
    return getChannelName(msg.channel);
  };

  if (!filteredMessages || filteredMessages.length === 0) {
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

  // Render text with the Meshtastic bell character (U+0007 BEL) shown as a golden bell icon.
  // Other non-printable C0/C1 control chars and the replacement char are stripped so they
  // don't render as empty squares.
  const renderTextWithBell = (text) => {
    if (!text) return text;
    const cleaned = text.replace(/[\u0000-\u0006\u0008-\u001F\u007F-\u009F\uFFFD]/g, '');
    const out = [];
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '\u0007') {
        out.push(<Bell key={`bell-${i}`} className="inline w-4 h-4 text-yellow-400 fill-yellow-400 mx-0.5 -mt-0.5" />);
      } else {
        const last = out[out.length - 1];
        if (typeof last === 'string') out[out.length - 1] = last + ch;
        else out.push(ch);
      }
    }
    return out;
  };

  return (
    <div className="space-y-2">
      {visibleMessages.map((msg) => {
        const raw = parseRaw(msg.raw_payload);
        const fromLabel = raw.from_label || '';
        const rxSnr = raw.rx_snr;
        const rxRssi = raw.rx_rssi;
        const gatewayId = raw.gateway_id;
        const hopStart = raw.hop_start ?? raw.hopStart ?? 3;
        const hopLimit = raw.hop_limit ?? raw.hopLimit;
        const hopsUsed = (hopLimit !== undefined && hopLimit !== null)
          ? (hopStart - hopLimit) : null;

        return (
        <div
          key={msg.id}
          onClick={() => {
            if (msg.direction === 'inbound' && msg.from_node) {
              const chNum = (msg.channel !== undefined && msg.channel !== null && msg.channel !== '')
                ? parseInt(msg.channel) : null;
              const isDM = msg.to_node && msg.to_node !== '^all';
              onReply?.({
                fromNode: msg.from_node,
                channel: chNum !== null && !isNaN(chNum) ? chNum : null,
                hopStart,
                forceDM: !!isDM,
              });
              return;
            }
            // Outbound: load into send form for editing
            if (msg.direction === 'outbound' && onEdit) {
              onEdit(msg);
            }
          }}
          className={`flex gap-3 p-3 rounded-xl border transition-all ${
            msg.direction === 'outbound'
              ? 'bg-primary/10 border-primary/30 cursor-pointer hover:border-primary/60 hover:bg-primary/15'
              : 'bg-emerald-500/10 border-emerald-500/30 cursor-pointer hover:border-emerald-400/60 hover:bg-emerald-500/15'
          }`}
        >
          <div className={`mt-0.5 flex flex-col items-center gap-1.5 p-2 rounded-lg ${msg.direction === 'outbound' ? 'bg-primary/20 border border-primary/40' : 'bg-emerald-500/20 border border-emerald-500/40'}`}>
            {msg.direction === 'outbound'
              ? <ArrowUpRight className="w-5 h-5 text-primary" />
              : <ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
            {msg.direction === 'outbound' && onResend && (msg.status === 'sent' || msg.status === 'implicit_ack') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Diese Nachricht erneut senden?')) onResend(msg);
                }}
                className="p-1 rounded hover:bg-primary/30 text-primary/80 hover:text-primary transition-colors"
                title="Erneut senden"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(msg.id); }}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
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
                    {nodeMap[msg.from_node]?.is_favorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    {fromLabel || msg.from_node}
                    {nodeMap[msg.from_node]?.short_name && (
                      <span className="text-muted-foreground font-normal">({nodeMap[msg.from_node].short_name})</span>
                    )}
                  </span>
                  {fromLabel && msg.from_node && (
                    <span className="text-xs font-mono text-muted-foreground">{msg.from_node}</span>
                  )}
                  <span className="text-muted-foreground/60">·</span>
                </>
              )}
              {msg.direction === 'outbound' && msg.to_node && msg.to_node !== '^all' && (
                <>
                  <span className="flex items-center gap-1 text-xs text-foreground font-medium">
                    {nodeMap[msg.to_node]?.is_favorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                    {nodeMap[msg.to_node]?.long_name || nodeMap[msg.to_node]?.short_name || msg.to_node}
                    {nodeMap[msg.to_node]?.short_name && nodeMap[msg.to_node]?.long_name && (
                      <span className="text-muted-foreground font-normal">({nodeMap[msg.to_node].short_name})</span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{msg.to_node}</span>
                  <span className="text-muted-foreground/60">·</span>
                </>
              )}
              {msg.to_node && msg.to_node !== '^all' ? (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-purple-500/15 text-purple-400">
                  DM
                </span>
              ) : (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  msg.direction === 'outbound' ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {(() => {
                    const name = getDisplayChannelName(msg);
                    const hasIdx = msg.channel !== undefined && msg.channel !== null && msg.channel !== '';
                    if (name && hasIdx) return `${name} (${msg.channel})`;
                    if (name) return name;
                    if (hasIdx) return `Channel ${msg.channel}`;
                    return 'Channel';
                  })()}
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

            </div>
            <p className="text-sm text-foreground break-words">{renderTextWithBell(msg.text)}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {msg.direction === 'inbound' && hopsUsed !== null && hopsUsed >= 0 && (
                <span className={`text-xs font-medium flex items-center gap-1 ${hopsUsed >= 3 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  🔁 {hopsUsed} hop{hopsUsed !== 1 ? 's' : ''}
                </span>
              )}
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

      {filteredMessages.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-border flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="ml-2">
              {startIdx + 1}–{Math.min(startIdx + pageSize, filteredMessages.length)} of {filteredMessages.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}