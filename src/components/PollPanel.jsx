import { useState, useEffect } from 'react';
import { Download, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LS_REGION = 'mesh_last_region';
const LS_CHANNEL = 'mesh_last_channel';

export default function PollPanel({ onReceived, userSettings }) {
  const [region, setRegion] = useState(() => localStorage.getItem(LS_REGION) || 'EU_868');
  const [channel, setChannel] = useState(() => parseInt(localStorage.getItem(LS_CHANNEL) ?? '2'));

  useEffect(() => {
    if (userSettings?.region) setRegion(userSettings.region);
    if (userSettings?.default_channel !== undefined) setChannel(userSettings.default_channel);
  }, [userSettings]);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handlePoll = async () => {
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, channel, listenSeconds: 8 });
      setResult({ type: 'success', msg: `${res.data.received} Nachricht(en) empfangen, ${res.data.saved} gespeichert.` });
      if (res.data.received > 0) onReceived?.();
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 whitespace-nowrap">Region:</span>
        <span className="text-sm text-slate-300 font-mono">{region}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 whitespace-nowrap">Kanal:</span>
        <span className="text-sm text-slate-300 font-mono">{channel}</span>
      </div>
      <button
        onClick={handlePoll}
        disabled={polling}
        className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
      >
        {polling ? (
          <>
            <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Lausche… (8s)</span>
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
    </div>
  );
}