import { useState } from 'react';
import { Download, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LISTEN_OPTIONS = [
  { label: '10 sec', seconds: 10 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
];

const LS_LISTEN = 'mesh_poll_listen_seconds';

export default function PollPanel({ onReceived, userSettings }) {
  const [listenSeconds, setListenSeconds] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_LISTEN) ?? '10');
    // Clamp to bounds (10s – 120s)
    if (isNaN(saved) || saved < 10) return 10;
    if (saved > 120) return 120;
    return saved;
  });
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handleListenChange = (val) => {
    const s = parseInt(val);
    setListenSeconds(s);
    localStorage.setItem(LS_LISTEN, String(s));
  };

  const nodeId = userSettings?.node_id;
  const region = userSettings?.region || 'EU_868';

  const runPoll = async (seconds) => {
    if (!nodeId) {
      setResult({ type: 'error', msg: 'Please set your Node ID in Settings first.' });
      return;
    }
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, listenSeconds: seconds, pollType: 'manual_poll' });
      setResult({ type: 'success', msg: `${res.data.received} message(s) received, ${res.data.saved} saved.` });
      onReceived?.();
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setPolling(false);
    }
  };

  const handlePoll = () => runPoll(listenSeconds);

  const listenLabel = LISTEN_OPTIONS.find(o => o.seconds === listenSeconds)?.label || `${listenSeconds}s`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Listen time:</span>
          <select
            value={listenSeconds}
            onChange={e => handleListenChange(e.target.value)}
            disabled={polling}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {LISTEN_OPTIONS.map(o => <option key={o.seconds} value={o.seconds}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={handlePoll}
          disabled={polling || !nodeId}
          className="flex items-center gap-2 px-4 py-1.5 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground rounded-lg text-sm font-medium transition-colors"
        >
          {polling ? (
            <>
              <Wifi className="w-4 h-4 text-primary animate-pulse" />
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
          <span className={`text-xs ${result.type === 'success' ? 'text-primary' : 'text-destructive'}`}>
            {result.msg}
          </span>
        )}
      </div>
    </div>
  );
}