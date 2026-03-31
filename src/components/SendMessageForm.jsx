import { useState } from 'react';
import { Send, Lock, Radio } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SendMessageForm({ onMessageSent }) {
  const [form, setForm] = useState({
    text: '',
    channel: 'LongFast',
    toNode: '^all',
    fromNode: '!gateway',
    psk: '',
  });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await base44.functions.invoke('mqttPublish', form);
      setFeedback({ type: 'success', msg: `Gesendet an Topic: ${res.data.topic}` });
      setForm((f) => ({ ...f, text: '' }));
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
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">
            <Radio className="inline w-3 h-3 mr-1" />
            Kanal
          </label>
          <input
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="LongFast"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">
            <Lock className="inline w-3 h-3 mr-1" />
            PSK (optional)
          </label>
          <input
            value={form.psk}
            onChange={(e) => setForm((f) => ({ ...f, psk: e.target.value }))}
            type="password"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="Pre-Shared Key"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
            Von Node
          </label>
          <input
            value={form.fromNode}
            onChange={(e) => setForm((f) => ({ ...f, fromNode: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="!gateway"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
            An Node
          </label>
          <input
            value={form.toNode}
            onChange={(e) => setForm((f) => ({ ...f, toNode: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="^all oder !nodeId"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <textarea
          value={form.text}
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
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