import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Clock } from 'lucide-react';

const LISTEN_OPTIONS = [
  { label: '30 Sek.', seconds: 30 },
  { label: '1 Min.', seconds: 60 },
  { label: '2 Min.', seconds: 120 },
  { label: '3 Min.', seconds: 180 },
  { label: '5 Min.', seconds: 298 },
];

const INTERVAL_OPTIONS = [
  { label: 'Alle 5 Min.', minutes: 5 },
  { label: 'Alle 10 Min.', minutes: 10 },
  { label: 'Alle 15 Min.', minutes: 15 },
  { label: 'Alle 30 Min.', minutes: 30 },
];

export default function AutomationSettings({ userSettings, onSettingsChanged }) {
  const [listenSeconds, setListenSeconds] = useState(298);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [channel, setChannel] = useState(2);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setListenSeconds(userSettings.bg_listen_seconds ?? 298);
      setIntervalMinutes(userSettings.bg_poll_interval ?? 5);
      setChannel(userSettings.bg_channel ?? userSettings.default_channel ?? 2);
      setBgEnabled(userSettings.bg_enabled ?? false);
    }
  }, [userSettings]);

  const handleSave = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const list = await base44.entities.UserSettings.filter({ created_by: user.email });
    const updates = { bg_listen_seconds: listenSeconds, bg_poll_interval: intervalMinutes, bg_channel: channel, bg_enabled: bgEnabled };
    if (list.length > 0) {
      await base44.entities.UserSettings.update(list[0].id, updates);
      onSettingsChanged?.({ ...list[0], ...updates });
    } else {
      const created = await base44.entities.UserSettings.create(updates);
      onSettingsChanged?.(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Hintergrund-Polling aktiv</span>
        <button
          onClick={() => setBgEnabled(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bgEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bgEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Kanal</label>
          <select
            value={channel}
            onChange={e => setChannel(parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {[0,1,2,3,4,5,6,7,8,9].map(c => <option key={c} value={c}>Kanal {c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Abruf-Rhythmus
          </label>
          <select
            value={intervalMinutes}
            onChange={e => setIntervalMinutes(parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {INTERVAL_OPTIONS.map(o => (
              <option key={o.minutes} value={o.minutes}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-600 mt-1">Mindestintervall: 5 Min.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
            Lauschzeit pro Abruf
          </label>
          <select
            value={listenSeconds}
            onChange={e => setListenSeconds(parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {LISTEN_OPTIONS.map(o => (
              <option key={o.seconds} value={o.seconds}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">
          Server verbindet sich alle {intervalMinutes} Min. für {LISTEN_OPTIONS.find(o => o.seconds === listenSeconds)?.label ?? `${listenSeconds}s`} mit dem Broker.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? 'Gespeichert ✓' : saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}