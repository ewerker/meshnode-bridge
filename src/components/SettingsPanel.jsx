import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Radio, Hash, Globe, Link2 } from 'lucide-react';
import DangerZone from '@/components/DangerZone';

const DEFAULT_CHANNELS = Array.from({ length: 8 }, (_, i) => ({ number: i, name: '' }));

export default function SettingsPanel({ onSettingsChanged }) {
  const [user, setUser] = useState(null);
  const [nodeId, setNodeId] = useState('');
  const [region, setRegion] = useState('EU_868');
  const [defaultChannel, setDefaultChannel] = useState(0);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [topicPrefix, setTopicPrefix] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [knownNodes, setKnownNodes] = useState([]);

  const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];

  useEffect(() => {
    loadUser();
    loadKnownNodes();
  }, []);

  const loadKnownNodes = async () => {
    // Suggest gateway-capable nodes (is_gateway=true) we've seen — these are valid "own" node IDs.
    // Dedupe by node_id so each ID appears only once.
    const all = await base44.entities.MeshNode.filter({ is_gateway: true }, '-last_heard', 200);
    const seen = new Set();
    const unique = [];
    for (const n of all) {
      if (!n.node_id || seen.has(n.node_id)) continue;
      seen.add(n.node_id);
      unique.push(n);
    }
    setKnownNodes(unique);
  };

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    setNodeId(me.node_id || '');
    setRegion(me.region || 'EU_868');
    setDefaultChannel(me.default_channel ?? 0);
    setTopicPrefix(me.topic_prefix || '');
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
    const prevNodeId = user?.node_id || '';
    const newNodeId = nodeId.trim();
    await base44.auth.updateMe({
      node_id: newNodeId,
      region,
      default_channel: defaultChannel,
      channels: channelsToSave,
      topic_prefix: topicPrefix.trim(),
    });
    setSaving(false);
    setSaved(true);
    // If the gateway node_id actually changed, do a full reload so all views (messages, nodes,
    // subscriptions, auto-poll status) re-bind to the new gateway from a clean state.
    if (newNodeId && newNodeId !== prevNodeId) {
      setTimeout(() => window.location.reload(), 600);
      return;
    }
    setTimeout(() => setSaved(false), 2000);
    onSettingsChanged?.();
  };

  if (!user) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Node-ID */}
      <div>
        <label className="block text-xs font-medium text-primary mb-2 uppercase tracking-wider">
          <Radio className="inline w-3 h-3 mr-1" />
          My Node ID
        </label>
        <input
          type="text"
          list="known-node-ids"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          placeholder="e.g. !49b65bc8"
          className="w-full max-w-xs bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
        />
        <datalist id="known-node-ids">
          {knownNodes.map(n => (
            <option key={n.node_id} value={n.node_id}>
              {[n.long_name, n.short_name].filter(Boolean).join(' / ') || n.node_id}
            </option>
          ))}
        </datalist>
        {knownNodes.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1.5">Bekannte Gateway-Nodes (zum Übernehmen klicken):</p>
            <div className="flex flex-wrap gap-1.5">
              {knownNodes.map(n => (
                <button
                  key={n.node_id}
                  type="button"
                  onClick={() => setNodeId(n.node_id)}
                  className={`text-xs px-2 py-1 rounded font-mono border transition-colors ${
                    nodeId === n.node_id
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-secondary border-border text-foreground hover:border-primary/50'
                  }`}
                  title={[n.long_name, n.short_name].filter(Boolean).join(' / ')}
                >
                  {n.node_id}
                  {n.long_name && <span className="text-muted-foreground font-sans ml-1.5">({n.long_name})</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Noch keine Gateway-Nodes bekannt — trage deine Node-ID ein, um zum ersten Mal zu senden.
          </p>
        )}
      </div>

      {/* Topic Prefix */}
      <div>
        <label className="block text-xs font-medium text-primary mb-2 uppercase tracking-wider">
          <Link2 className="inline w-3 h-3 mr-1" />
          Topic-Prefix
        </label>
        <input
          type="text"
          value={topicPrefix}
          onChange={(e) => setTopicPrefix(e.target.value)}
          placeholder={`msh/${region}/proxy`}
          className="w-full max-w-md bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Default: <span className="font-mono text-muted-foreground">msh/{region}/proxy</span> — Topics: <span className="font-mono text-muted-foreground">{topicPrefix || `msh/${region}/proxy`}/send/{nodeId || '!gateway'}/group/0</span>, <span className="font-mono text-muted-foreground">{topicPrefix || `msh/${region}/proxy`}/rx/{nodeId || '…'}/scope/group</span>
        </p>
      </div>

      {/* Region & Default Channel */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            <Globe className="inline w-3 h-3 mr-1" />
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Default Channel</label>
          <select
            value={defaultChannel}
            onChange={(e) => setDefaultChannel(parseInt(e.target.value))}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {channels.map(c => (
              <option key={c.number} value={c.number}>
                {c.name ? `${c.name} (${c.number})` : `Channel ${c.number}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channel Names */}
      <div>
        <label className="block text-xs font-medium text-primary mb-2 uppercase tracking-wider">
          <Hash className="inline w-3 h-3 mr-1" />
          Channel Names (0–7)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {channels.map(c => (
            <div key={c.number} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-4 text-right font-mono">{c.number}</span>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateChannelName(c.number, e.target.value)}
                placeholder={`Channel ${c.number}`}
                className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
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
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Danger Zone */}
      <DangerZone nodeId={user?.node_id} onChanged={onSettingsChanged} />
    </div>
  );
}