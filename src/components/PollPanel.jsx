import { useState, useEffect } from 'react';
import { Download, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];
const CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7];
const LISTEN_OPTIONS = [
  { label: '10 Sek.', seconds: 10 },
  { label: '30 Sek.', seconds: 30 },
  { label: '1 Min.', seconds: 60 },
  { label: '2 Min.', seconds: 120 },
  { label: '3 Min.', seconds: 180 },
  { label: '10 Min.', seconds: 600 },
  { label: '20 Min.', seconds: 1200 },
];

const LS_REGION = 'mesh_last_region';
const LS_CHANNEL = 'mesh_last_channel';
const LS_LISTEN = 'mesh_poll_listen_seconds';

export default function PollPanel({ onReceived, userSettings }) {
  const [region, setRegion] = useState(() => localStorage.getItem(LS_REGION) || 'EU_868');
  const [channel, setChannel] = useState(() => {
    const saved = localStorage.getItem(LS_CHANNEL);
    if (saved === null || saved === 'null' || saved === 'undefined') {
      return 2;
    }
    const parsed = parseInt(saved);
    return isNaN(parsed) ? 2 : parsed;
  });
  const [listenSeconds, setListenSeconds] = useState(() => parseInt(localStorage.getItem(LS_LISTEN) ?? '60'));

  useEffect(() => {
    if (userSettings?.region) {
      setRegion(userSettings.region);
      localStorage.setItem(LS_REGION, userSettings.region);
    }
    if (userSettings?.default_channel !== undefined && userSettings.default_channel !== null) {
      const ch = parseInt(userSettings.default_channel);
      if (!isNaN(ch)) {
        setChannel(ch);
        localStorage.setItem(LS_CHANNEL, String(ch));
      }
    }
  }, [userSettings]);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);

  const handleRegionChange = (val) => {
    setRegion(val);
    localStorage.setItem(LS_REGION, val);
  };

  const handleChannelChange = (val) => {
    const ch = parseInt(val);
    setChannel(ch);
    localStorage.setItem(LS_CHANNEL, String(ch));
  };

  const handleListenChange = (val) => {
    const s = parseInt(val);
    setListenSeconds(s);
    localStorage.setItem(LS_LISTEN, String(s));
  };

  const handlePoll = async () => {
    setPolling(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('mqttPoll', { region, channel: parseInt(channel), listenSeconds });
      setResult({ type: 'success', msg: `${res.data.received} Nachricht(en) empfangen, ${res.data.saved} gespeichert.` });
      onReceived?.();
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    } finally {
      setPolling(false);
    }
  };

  const topic = `msh/${region}/${channel}/json`;
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
          <span className="text-xs text-slate-500 whitespace-nowrap">Region:</span>
          <select
            value={region}
            onChange={e => handleRegionChange(e.target.value)}
            disabled={polling}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Kanal:</span>
          <select
            value={channel}
            onChange={e => handleChannelChange(e.target.value)}
            disabled={polling}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {CHANNELS.map(c => {
              const ch = (userSettings?.channels || []).find(x => x.number === c);
              return <option key={c} value={c}>{ch?.name ? `${ch.name} (${c})` : `Kanal ${c}`}</option>;
            })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Lauschzeit:</span>
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
          disabled={polling}
          className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          {polling ? (
            <>
              <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Lausche… ({listenLabel})</span>
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
    </div>
  );
}