import { useState, useEffect } from 'react';
import { Send, Radio } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];
const CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const LS_REGION = 'mesh_last_region';
const LS_CHANNEL = 'mesh_last_channel';

export default function SendMessageForm({ onMessageSent, userSettings }) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(LS_CHANNEL);
    let channel = 0;
    if (saved !== null && saved !== 'null' && saved !== 'undefined') {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) channel = parsed;
    }
    return {
      text: '',
      channel,
      region: localStorage.getItem(LS_REGION) || 'EU_868',
      toNode: '^all',
    };
  });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (userSettings?.region) {
      setForm(f => ({ ...f, region: userSettings.region }));
    }
    if (userSettings?.default_channel !== undefined && userSettings.default_channel !== null) {
      const ch = parseInt(userSettings.default_channel);
      if (!isNaN(ch)) {
        setForm(f => ({ ...f, channel: ch }));
      }
    }
  }, [userSettings]);

  const updateField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    if (key === 'region') localStorage.setItem(LS_REGION, value);
    if (key === 'channel') localStorage.setItem(LS_CHANNEL, String(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await base44.functions.invoke('mqttPublish', form);
      setFeedback({ type: 'success', msg: `Gesendet an Topic: ${res.data.topic}` });
      setForm(f => ({ ...f, text: '' }));
      onMessageSent?.();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Fehler beim Senden' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Region</label>
          <select
            value={form.region}
            onChange={(e) => updateField('region', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">
            <Radio className="inline w-3 h-3 mr-1" />
            Kanal
          </label>
          <select
            value={form.channel}
            onChange={(e) => updateField('channel', parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {CHANNELS.map(c => <option key={c} value={c}>Kanal {c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <textarea
          value={form.text}
          onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
          rows={3}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          placeholder="Nachricht eingeben..."
          required
        />
        <button
          type="submit"
          disabled={sending || !form.text.trim()}
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