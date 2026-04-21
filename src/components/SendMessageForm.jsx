import { useState, useEffect } from 'react';
import { Send, Radio, Users, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
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

  const topic = `msh/EU_868/proxy/send/group/${channel}`;

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
      });
      setFeedback({ type: 'success', msg: `Gesendet an Topic: ${res.data.topic}` });
      setText('');
      onMessageSent?.();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Fehler beim Senden' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => switchMode('channel')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'channel' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Channel
        </button>
        <button
          type="button"
          onClick={() => switchMode('dm')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'dm' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          DM
        </button>
      </div>

      {/* Channel Mode */}
      {mode === 'channel' && (
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">
            <Radio className="inline w-3 h-3 mr-1" />
            Gruppe
          </label>
          <select
            value={channel}
            onChange={(e) => updateChannel(parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {CHANNELS.map(c => <option key={c} value={c}>Gruppe {c}</option>)}
          </select>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Topic:</span>
            <span className="text-xs text-cyan-400 font-mono bg-slate-800 px-2 py-0.5 rounded">{topic}</span>
          </div>
        </div>
      )}

      {/* DM Mode */}
      {mode === 'dm' && (
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">
            Empfänger Node-ID
          </label>
          <input
            type="text"
            value={dmNodeId}
            onChange={(e) => setDmNodeId(e.target.value)}
            placeholder="z.B. !13c2288b"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Topic:</span>
            <span className="text-xs text-cyan-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              msh/EU_868/proxy/send/direct/{dmNodeId || '…'}
            </span>
          </div>
        </div>
      )}

      {/* Message + Send */}
      <div className="flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          placeholder="Nachricht eingeben..."
          required
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || (mode === 'dm' && !dmNodeId.trim())}
          className="px-5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex flex-col items-center justify-center gap-1 min-w-[64px]"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="text-xs">Senden</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div className={`text-xs px-3 py-2 rounded-lg ${feedback.type === 'success' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
          {feedback.msg}
        </div>
      )}
    </form>
  );
}