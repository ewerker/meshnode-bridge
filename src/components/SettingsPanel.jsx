import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Radio } from 'lucide-react';

export default function SettingsPanel({ onSettingsChanged }) {
  const [user, setUser] = useState(null);
  const [nodeId, setNodeId] = useState('');
  const [region, setRegion] = useState('EU_868');
  const [defaultChannel, setDefaultChannel] = useState(0);
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
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ node_id: nodeId.trim(), region, default_channel: defaultChannel });
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

      {/* Region & Channel */}
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
            {[0,1,2,3,4,5,6,7,8,9].map(c => <option key={c} value={c}>Kanal {c}</option>)}
          </select>
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