import { useState, useEffect } from 'react';
import { Download, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LS_REGION = 'mesh_last_region';
const LS_CHANNEL = 'mesh_last_channel';

export default function PollPanel({ onReceived, userSettings }) {
  const [region, setRegion] = useState(() => localStorage.getItem(LS_REGION) || 'EU_868');
  const [channel, setChannel] = useState(() => parseInt(localStorage.getItem(LS_CHANNEL) ?? '0'));

  useEffect(() => {
    if (userSettings?.region) setRegion(userSettings.region);
    if (userSettings?.default_channel !== undefined) setChannel(userSettings.default_channel);
  }, [userSettings]);
  const [listenSeconds, setListenSeconds] = useState(() => parseInt(localStorage.getItem('mesh_listen_seconds') ?? '8'));
  const [sinceMinutes, setSinceMinutes] = useState(() => parseInt(localStorage.getItem('mesh_since_minutes') ?? '60'));
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handlePoll = async () => {
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, channel, listenSeconds, sinceMinutes });
      setResult({ type: 'success', msg: `${res.data.received} Nachricht(en) empfangen, ${res.data.saved} gespeichert.` });
      if (res.data.received > 0) onReceived?.();
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setPolling(false);
    }
  };

  const handleChannelChange = (val) => {
    const num = parseInt(val);
    setChannel(num);
    localStorage.setItem(LS_CHANNEL, String(num));
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 whitespace-nowrap">Region:</span>
        <span className="text-sm text-slate-300 font-mono">{region}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 whitespace-nowrap">Kanal:</span>
        <select
          value={channel}
          onChange={(e) => handleChannelChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          {Array.from({ length: 100 }, (_, i) => (
            <option key={i} value={i}>Kanal {i}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handlePoll}
        disabled={polling}
        className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
      >
        {polling ? (
          <>
            <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Lausche… ({listenSeconds}s)</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Empfangen</span>
          </>
        )}
      </button>
      {result && (
        <span className={`text-xs ${result.type === 'success' ? 'text-cyan-400' : 'text-red-400'}`}>
          {result.msg}
        </span>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-slate-500 whitespace-nowrap">Lausch-Zeit (s):</label>
        <input
          type="number" min={3} max={30} value={listenSeconds}
          onChange={e => { const v = Math.min(30, Math.max(3, parseInt(e.target.value) || 8)); setListenSeconds(v); localStorage.setItem('mesh_listen_seconds', String(v)); }}
          className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
        />
        <label className="text-xs text-slate-500 whitespace-nowrap">Zeitfenster (min):</label>
        <input
          type="number" min={1} max={1440} value={sinceMinutes}
          onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 60); setSinceMinutes(v); localStorage.setItem('mesh_since_minutes', String(v)); }}
          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>
  );
}