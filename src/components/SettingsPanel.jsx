import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Settings } from 'lucide-react';

export default function SettingsPanel({ onSettingsChanged }) {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);


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
      setSettings({ region: 'EU_868', from_node: '!gateway', default_channel: 2 });
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

  if (!settings) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Basis-Einstellungen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Region</label>
          <input
            value={settings.region || ''}
            onChange={e => setSettings(s => ({ ...s, region: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            placeholder="EU_868"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Meine Node-ID</label>
          <input
            value={settings.from_node || ''}
            onChange={e => setSettings(s => ({ ...s, from_node: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            placeholder="!abc1234"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Standard-Kanal (0–9)</label>
          <input
            type="number"
            min={0}
            max={9}
            value={settings.default_channel ?? 2}
            onChange={e => setSettings(s => ({ ...s, default_channel: parseInt(e.target.value) || 0 }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          />
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