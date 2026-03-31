import { useState } from 'react';
import { Download, Wifi, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PollPanel({ onReceived }) {
  const [region, setRegion] = useState('EU_868');
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handlePoll = async () => {
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, listenSeconds: 8 });
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
      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
        <span className="text-xs text-slate-500 whitespace-nowrap">Region:</span>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          placeholder="EU_868"
          disabled={polling}
        />
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