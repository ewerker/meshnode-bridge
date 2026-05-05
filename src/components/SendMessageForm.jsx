import { useState, useEffect } from 'react';
import { Send, Radio, Users, User, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NodePicker from '@/components/NodePicker';

const ALL_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7];
const LS_CHANNEL = 'mesh_last_channel';
const LS_MODE = 'mesh_send_mode';

export default function SendMessageForm({ onMessageSent, userSettings, replyTo, replyHopLimit, replyRequest, editRequest, onReplyToClear }) {
  const isAdmin = userSettings?.role === 'admin';
  // Admins see all 8 channels; regular users only see channels with a configured name.
  const namedChannelNumbers = (userSettings?.channels || [])
    .filter(c => c?.name && c.name.trim())
    .map(c => c.number);
  const CHANNELS = isAdmin ? ALL_CHANNELS : ALL_CHANNELS.filter(c => namedChannelNumbers.includes(c));
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
  const [hopLimit, setHopLimit] = useState(6);
  const [wantAck, setWantAck] = useState(true);
  const [withBell, setWithBell] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // React to a reply request:
  //  - If the source was a received DM (forceDM), always switch to DM mode and set sender.
  //  - Otherwise keep the user's selected mode and only fill in the matching field.
  useEffect(() => {
    if (!replyRequest) return;
    if (replyRequest.forceDM && replyRequest.fromNode) {
      switchMode('dm');
      setDmNodeId(replyRequest.fromNode);
    } else if (mode === 'dm') {
      if (replyRequest.fromNode) setDmNodeId(replyRequest.fromNode);
    } else if (mode === 'channel') {
      if (replyRequest.channel !== null && replyRequest.channel !== undefined && !isNaN(replyRequest.channel)) {
        updateChannel(parseInt(replyRequest.channel));
      }
    }
    if (replyRequest.hopStart !== null && replyRequest.hopStart !== undefined && replyRequest.hopStart > 3) {
      setHopLimit(replyRequest.hopStart);
    }
  }, [replyRequest]);

  // Edit request: load an existing outbound message into the form for adjustment.
  useEffect(() => {
    if (!editRequest) return;
    setText(editRequest.text || '');
    setWithBell(!!editRequest.withBell);
    if (editRequest.mode === 'dm') {
      switchMode('dm');
      if (editRequest.toNode) setDmNodeId(editRequest.toNode);
    } else if (editRequest.mode === 'channel') {
      switchMode('channel');
      if (editRequest.channel !== null && editRequest.channel !== undefined) {
        updateChannel(editRequest.channel);
      }
    }
  }, [editRequest]);

  // Backwards compatibility: legacy replyTo prop still switches to DM mode.
  useEffect(() => {
    if (replyRequest) return; // structured request takes precedence
    if (replyTo) {
      switchMode('dm');
      setDmNodeId(replyTo);
      if (replyHopLimit !== null && replyHopLimit !== undefined && replyHopLimit > 3) {
        setHopLimit(replyHopLimit);
      }
    }
  }, [replyTo, replyHopLimit, replyRequest]);

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

  // If the currently selected channel is not available for this user, fall back to the first available one.
  useEffect(() => {
    if (CHANNELS.length === 0) return;
    if (!CHANNELS.includes(channel)) {
      setChannel(CHANNELS[0]);
      localStorage.setItem(LS_CHANNEL, String(CHANNELS[0]));
    }
  }, [CHANNELS.join(',')]);

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
  const gatewayNodeId = userSettings?.node_id || '!gateway';
  const topic = `${prefix}/send/${gatewayNodeId}/group/${channel}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const finalText = withBell ? `${text}\u0007` : text;
      const res = await base44.functions.invoke('mqttPublish', {
        mode,
        text: finalText,
        channel,
        toNode: mode === 'dm' ? dmNodeId : '^all',
        hop_limit: hopLimit,
        want_ack: wantAck,
      });
      const { client_ref: ref, final_status } = res.data;
      setText('');
      onReplyToClear?.();
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
            Channel
          </label>
          {CHANNELS.length === 0 ? (
            <div className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Keine Channels verfügbar — bitte einen Administrator bitten, Channel-Namen zu konfigurieren.
            </div>
          ) : (
            <select
              value={channel}
              onChange={(e) => updateChannel(parseInt(e.target.value))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {CHANNELS.map(c => {
                const ch = (userSettings?.channels || []).find(x => x.number === c);
                return <option key={c} value={c}>{ch?.name ? `${ch.name} (${c})` : `Channel ${c}`}</option>;
              })}
            </select>
          )}
        </div>
      )}

      {/* DM Mode */}
      {mode === 'dm' && (
        <div>
          <label className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
            Recipient
          </label>
          <NodePicker value={dmNodeId} onChange={setDmNodeId} />
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

      {/* Message + Bell + Send */}
      <div className="flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
          placeholder="Enter message..."
          required
        />
        <div className="flex flex-col gap-2 min-w-[64px]">
          <button
            type="button"
            onClick={() => setWithBell(v => !v)}
            title="Glockenzeichen (U+0007) an die Nachricht anhängen"
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              withBell ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/40' : 'bg-secondary text-muted-foreground border-border'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${withBell ? 'fill-yellow-400' : ''}`} />
            Bell
          </button>
          <button
            type="submit"
            disabled={sending || !text.trim() || (mode === 'dm' && !dmNodeId.trim())}
            className="flex-1 px-5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1"
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
      </div>

      {feedback && (
        <div className={`text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
          {feedback.msg}
        </div>
      )}

    </form>
  );
}