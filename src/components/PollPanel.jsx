import { useState } from 'react';
import { Download, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LISTEN_OPTIONS = [
  { label: '10 sec', seconds: 10 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '10 min', seconds: 600 },
  { label: '20 min', seconds: 1200 },
];

const LS_LISTEN = 'mesh_poll_listen_seconds';

export default function PollPanel({ onReceived, userSettings }) {
  const [listenSeconds, setListenSeconds] = useState(() => parseInt(localStorage.getItem(LS_LISTEN) ?? '60'));
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handleListenChange = (val) => {
    const s = parseInt(val);
    setListenSeconds(s);
    localStorage.setItem(LS_LISTEN, String(s));
  };

  const nodeId = userSettings?.node_id;
  const region = userSettings?.region || 'EU_868';
  const prefix = userSettings?.topic_prefix || `msh/${region}/proxy`;

  const handlePoll = async () => {
    if (!nodeId) {
      setResult({ type: 'error', msg: 'Please set your Node ID in Settings first.' });
      return;
    }
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, listenSeconds });
      setResult({ type: 'success', msg: `${res.data.received} message(s) received, ${res.data.saved} saved.` });
      onReceived?.();
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setPolling(false);
    }
  };

  const topic = nodeId ? `${prefix}/rx/${nodeId}/#` : '—';
  const listenLabel = LISTEN_OPTIONS.find(o => o.seconds === listenSeconds)?.label || `${listenSeconds}s`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Topic:</span>
          <span className="text-xs text-cyan-400 font-mono bg-slate-800 px-2 py-0.5 rounded">{topic}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Listen time:</span>
          <select
            value={listenSeconds}
            onChange={e => handleListenChange(e.target.value)}
            disabled={polling}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {LISTEN_OPTIONS.map(o => <option key={o.seconds} value={o.seconds}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={handlePoll}
          disabled={polling || !nodeId}
          className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          {polling ? (
            <>
              <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Listening… ({listenLabel})</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Receive</span>
            </>
          )}
        </button>
        {result && (
          <span className={`text-xs ${result.type === 'success' ? 'text-cyan-400' : 'text-red-400'}`}>
            {result.msg}
          </span>
        )}
      </div>
    </div>
  );
}