import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Radio, Hash } from 'lucide-react';

const DEFAULT_CHANNELS = Array.from({ length: 8 }, (_, i) => ({ number: i, name: '' }));

export default function SettingsPanel({ onSettingsChanged }) {
  const [user, setUser] = useState(null);
  const [nodeId, setNodeId] = useState('');
  const [region, setRegion] = useState('EU_868');
  const [defaultChannel, setDefaultChannel] = useState(0);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    setNodeId(me.node_id || '');
    setRegion(me.region || 'EU_868');
    setDefaultChannel(me.default_channel ?? 0);
    // Merge saved channels with defaults
    const saved = me.channels || [];
    const merged = DEFAULT_CHANNELS.map(def => {
      const found = saved.find(c => c.number === def.number);
      return found || def;
    });
    setChannels(merged);
  };

  const updateChannelName = (num, name) => {
    setChannels(prev => prev.map(c => c.number === num ? { ...c, name } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    const channelsToSave = channels.filter(c => c.name.trim());
    await base44.auth.updateMe({
      node_id: nodeId.trim(),
      region,
      default_channel: defaultChannel,
      channels: channelsToSave,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSettingsChanged?.();
  };

  if (!user) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Node-ID */}
      <div>
        <label className="block text-xs font-medium text-cyan-400 mb-2 uppercase tracking-wider">
          <Radio className="inline w-3 h-3 mr-1" />
          Meine Node-ID
        </label>
        <input
          type="text"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          placeholder="z.B. !49b65bc8"
          className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Region & Default Channel */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Standard-Kanal</label>
          <select
            value={defaultChannel}
            onChange={(e) => setDefaultChannel(parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {channels.map(c => (
              <option key={c.number} value={c.number}>
                {c.name ? `${c.name} (${c.number})` : `Kanal ${c.number}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channel Names */}
      <div>
        <label className="block text-xs font-medium text-cyan-400 mb-2 uppercase tracking-wider">
          <Hash className="inline w-3 h-3 mr-1" />
          Kanalnamen (0–7)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {channels.map(c => (
            <div key={c.number} className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 w-4 text-right font-mono">{c.number}</span>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateChannelName(c.number, e.target.value)}
                placeholder={`Kanal ${c.number}`}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Speichern */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Gespeichert ✓' : saving ? 'Speichern…' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}