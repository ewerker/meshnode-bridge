import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Plus, X, Radio } from 'lucide-react';

export default function SettingsPanel({ onSettingsChanged }) {
  const [user, setUser] = useState(null);
  const [nodeIds, setNodeIds] = useState([]);
  const [region, setRegion] = useState('EU_868');
  const [defaultChannel, setDefaultChannel] = useState(0);
  const [newNodeId, setNewNodeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    setNodeIds(me.node_ids || []);
    setRegion(me.region || 'EU_868');
    setDefaultChannel(me.default_channel ?? 0);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ node_ids: nodeIds, region, default_channel: defaultChannel });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSettingsChanged?.({ node_ids: nodeIds, region, default_channel: defaultChannel });
  };

  const addNodeId = () => {
    const id = newNodeId.trim();
    if (!id || nodeIds.includes(id)) return;
    setNodeIds([...nodeIds, id]);
    setNewNodeId('');
  };

  const removeNodeId = (id) => {
    setNodeIds(nodeIds.filter(n => n !== id));
  };

  if (!user) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Node-IDs */}
      <div>
        <label className="block text-xs font-medium text-cyan-400 mb-2 uppercase tracking-wider">
          <Radio className="inline w-3 h-3 mr-1" />
          Meine Node-IDs
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {nodeIds.map((id) => (
            <span key={id} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-slate-200 font-mono">
              {id}
              <button onClick={() => removeNodeId(id)} className="text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {nodeIds.length === 0 && (
            <span className="text-xs text-slate-600">Keine Node-IDs gespeichert</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newNodeId}
            onChange={(e) => setNewNodeId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNodeId())}
            placeholder="z.B. !49b65bc8"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={addNodeId}
            disabled={!newNodeId.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
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