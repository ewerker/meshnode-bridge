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