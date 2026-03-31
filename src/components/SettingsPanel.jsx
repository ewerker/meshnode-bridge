import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Settings, Radio } from 'lucide-react';

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

    {/* Hintergrund-Polling */}
    <div className="border border-slate-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Hintergrund-Polling</span>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, bg_enabled: !s.bg_enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.bg_enabled ? 'bg-cyan-600' : 'bg-slate-700'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings.bg_enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
      {settings.bg_enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Region</label>
            <input
              value={settings.bg_region || settings.region || ''}
              onChange={e => setSettings(s => ({ ...s, bg_region: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="EU_868"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Kanal (0–9)</label>
            <input
              type="number"
              min={0}
              max={9}
              value={settings.bg_channel ?? settings.default_channel ?? 2}
              onChange={e => setSettings(s => ({ ...s, bg_channel: parseInt(e.target.value) || 0 }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Lauschzeit (Sek.)</label>
            <input
              type="number"
              min={30}
              max={298}
              value={settings.bg_listen_seconds ?? 298}
              onChange={e => setSettings(s => ({ ...s, bg_listen_seconds: parseInt(e.target.value) || 298 }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}
      <p className="text-xs text-slate-600">
        {settings.bg_enabled
          ? `Server lauscht alle 5 Min. für ${settings.bg_listen_seconds ?? 298} Sek. auf msh/${settings.bg_region || settings.region || 'EU_868'}/${settings.bg_channel ?? settings.default_channel ?? 2}/json`
          : 'Server lauscht nicht im Hintergrund. Nur manuelles Polling aktiv.'}
      </p>
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