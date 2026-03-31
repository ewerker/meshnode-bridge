import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Plus, Trash2, Radio, Settings } from 'lucide-react';

export default function SettingsPanel({ onSettingsChanged }) {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', psk: '' });

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
      setSettings({ region: 'EU_868', from_node: '!gateway', channels: [{ name: 'LongFast', psk: '' }], default_channel: 'LongFast' });
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

  const addChannel = () => {
    if (!newChannel.name.trim()) return;
    setSettings(s => ({ ...s, channels: [...(s.channels || []), { ...newChannel }] }));
    setNewChannel({ name: '', psk: '' });
  };

  const removeChannel = (idx) => {
    setSettings(s => ({ ...s, channels: s.channels.filter((_, i) => i !== idx) }));
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
          <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Standard-Kanal</label>
          <select
            value={settings.default_channel || ''}
            onChange={e => setSettings(s => ({ ...s, default_channel: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {(settings.channels || []).map((ch, i) => (
              <option key={i} value={ch.name}>{ch.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanäle */}
      <div>
        <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" /> Gespeicherte Kanäle
        </h3>
        <div className="space-y-2 mb-3">
          {(settings.channels || []).map((ch, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-200 flex-1 font-mono">{ch.name}</span>
              {ch.psk && <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">PSK gesetzt</span>}
              <button onClick={() => removeChannel(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {/* Neuen Kanal hinzufügen */}
        <div className="flex gap-2">
          <input
            value={newChannel.name}
            onChange={e => setNewChannel(n => ({ ...n, name: e.target.value }))}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            placeholder="Kanalname z.B. LongFast"
            onKeyDown={e => e.key === 'Enter' && addChannel()}
          />
          <input
            value={newChannel.psk}
            onChange={e => setNewChannel(n => ({ ...n, psk: e.target.value }))}
            type="password"
            className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            placeholder="PSK (opt.)"
          />
          <button onClick={addChannel} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />
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