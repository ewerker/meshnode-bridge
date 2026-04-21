import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Plus, X, Radio } from 'lucide-react';

export default function SettingsPanel({ onSettingsChanged }) {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const user = await base44.auth.me();
    const list = await base44.entities.UserSettings.filter({ created_by: user.email });
    if (list.length > 0) {
      setSettings(list[0]);
      setSettingsId(list[0].id);
    } else {
      setSettings({ region: 'EU_868', from_node: '!gateway', default_channel: 2, node_ids: [] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      await base44.entities.UserSettings.update(settingsId, settings);
    } else {
      const created = await base44.entities.UserSettings.create(settings);
      setSettingsId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSettingsChanged?.(settings);
  };

  const addNodeId = () => {
    const id = newNodeId.trim();
    if (!id) return;
    const list = settings.node_ids || [];
    if (list.includes(id)) return;
    setSettings({ ...settings, node_ids: [...list, id] });
    setNewNodeId('');
  };

  const removeNodeId = (id) => {
    setSettings({ ...settings, node_ids: (settings.node_ids || []).filter(n => n !== id) });
  };

  if (!settings) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const nodeIds = settings.node_ids || [];

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