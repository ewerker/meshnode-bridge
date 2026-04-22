import { useState, useEffect } from 'react';
import { Send, Radio, Users, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NodePicker from '@/components/NodePicker';

const CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7];
const LS_CHANNEL = 'mesh_last_channel';
const LS_MODE = 'mesh_send_mode';

export default function SendMessageForm({ onMessageSent, userSettings }) {
  const [mode, setMode] = useState(() => localStorage.getItem(LS_MODE) || 'channel');
  const [channel, setChannel] = useState(() => {
    const saved = localStorage.getItem(LS_CHANNEL);
    if (saved !== null && saved !== 'null' && saved !== 'undefined') {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  });
  const [text, setText] = useState('');
  const [dmNodeId, setDmNodeId] = useState('');
  const [hopLimit, setHopLimit] = useState(3);
  const [wantAck, setWantAck] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (userSettings?.default_channel !== undefined && userSettings.default_channel !== null) {
      const ch = parseInt(userSettings.default_channel);
      if (!isNaN(ch)) {
        const saved = localStorage.getItem(LS_CHANNEL);
        if (!saved || saved === 'null' || saved === 'undefined') {
          setChannel(ch);
        }
      }
    }
  }, [userSettings]);

  const switchMode = (m) => {
    setMode(m);
    localStorage.setItem(LS_MODE, m);
  };

  const updateChannel = (val) => {
    setChannel(val);
    localStorage.setItem(LS_CHANNEL, String(val));
  };

  const region = userSettings?.region || 'EU_868';
  const prefix = userSettings?.topic_prefix || `msh/${region}/proxy`;
  const topic = `${prefix}/send/group/${channel}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await base44.functions.invoke('mqttPublish', {
        mode,
        text,
        channel,
        toNode: mode === 'dm' ? dmNodeId : '^all',
        hop_limit: hopLimit,
        want_ack: wantAck,
      });
      const { client_ref: ref, final_status } = res.data;
      setText('');
      onMessageSent?.();

      if (!ref) {
        setFeedback({ type: 'success', msg: `Sent (no ACK)` });
        return;
      }

      if (final_status === 'acked') {
        setFeedback({ type: 'success', msg: `✅ ACK received (${ref})` });
      } else if (final_status === 'implicit_ack') {
        setFeedback({ type: 'success', msg: `⚡ Implicit ACK (${ref})` });
      } else if (final_status === 'failed') {
        setFeedback({ type: 'error', msg: `❌ NAK received (${ref})` });
      } else {
        setFeedback({ type: 'success', msg: `⏱ No ACK within timeout (${ref})` });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Error sending message' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        <button
          type="button"
          onClick={() => switchMode('channel')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'channel' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Channel
        </button>
        <button
          type="button"
          onClick={() => switchMode('dm')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'dm' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" />
          DM
        </button>
      </div>

      {/* Channel Mode */}
      {mode === 'channel' && (
        <div>
          <label className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
            <Radio className="inline w-3 h-3 mr-1" />
            Group
          </label>
          <select
            value={channel}
            onChange={(e) => updateChannel(parseInt(e.target.value))}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {CHANNELS.map(c => {
              const ch = (userSettings?.channels || []).find(x => x.number === c);
              return <option key={c} value={c}>{ch?.name ? `${ch.name} (${c})` : `Group ${c}`}</option>;
            })}
          </select>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Topic:</span>
            <span className="text-xs text-primary font-mono bg-secondary px-2 py-0.5 rounded">{topic}</span>
          </div>
        </div>
      )}

      {/* DM Mode */}
      {mode === 'dm' && (
        <div>
          <label className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
            Recipient
          </label>
          <NodePicker value={dmNodeId} onChange={setDmNodeId} />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Topic:</span>
            <span className="text-xs text-primary font-mono bg-secondary px-2 py-0.5 rounded">
              {prefix}/send/direct/{dmNodeId || '…'}
            </span>
          </div>
        </div>
      )}

      {/* Hop Limit + Want Ack */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Hop-Limit:</label>
          <select
            value={hopLimit}
            onChange={(e) => setHopLimit(parseInt(e.target.value))}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {[2, 3, 4, 5, 6, 7].map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setWantAck(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            wantAck ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-secondary text-muted-foreground border border-border'
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${wantAck ? 'bg-primary' : 'bg-muted-foreground'}`} />
          Acknowledge (ACK)
        </button>
      </div>

      {/* Message + Send */}
      <div className="flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
          placeholder="Enter message..."
          required
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || (mode === 'dm' && !dmNodeId.trim())}
          className="px-5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1 min-w-[64px]"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="text-xs">Send</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div className={`text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {feedback.msg}
        </div>
      )}
    </form>
  );
}