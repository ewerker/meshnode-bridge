import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Radio, Hash, Globe, Link2 } from 'lucide-react';
import DangerZone from '@/components/DangerZone';
import ToggleSwitch from '@/components/ToggleSwitch';

const DEFAULT_CHANNELS = Array.from({ length: 8 }, (_, i) => ({ number: i, name: '' }));

export default function SettingsPanel({ onSettingsChanged }) {
  const [user, setUser] = useState(null);
  const [nodeId, setNodeId] = useState('');
  const [region, setRegion] = useState('EU_868');
  const [defaultChannel, setDefaultChannel] = useState(0);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [topicPrefix, setTopicPrefix] = useState('');
  const [sendViaMqtt, setSendViaMqtt] = useState(true);
  const [sendViaPortal, setSendViaPortal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [knownNodes, setKnownNodes] = useState([]);

  const REGIONS = ['EU_868', 'EU_433', 'US', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868', 'MY_433', 'MY_919', 'SG_923'];

  useEffect(() => {
    loadUser();
    loadKnownNodes();
  }, []);

  const loadKnownNodes = async () => {
    // Only admins can see/select gateway node suggestions.
    const me = await base44.auth.me().catch(() => null);
    if (me?.role !== 'admin') {
      setKnownNodes([]);
      return;
    }
    // Two sources of "gateway" identity:
    //  1) Nodes flagged is_gateway=true (as reported by the MQTT proxy).
    //  2) Distinct gateway_node_id values across all MeshNode records — every such id IS by
    //     definition a gateway we've polled through, even if its own record hasn't been
    //     flagged is_gateway:true in this gateway's view.
    const [flagged, all] = await Promise.all([
      base44.entities.MeshNode.filter({ is_gateway: true }, '-last_heard', 500),
      base44.entities.MeshNode.list('-last_heard', 1000),
    ]);

    const byId = new Map();
    for (const n of flagged) {
      if (n.node_id && !byId.has(n.node_id)) byId.set(n.node_id, n);
    }
    // Add distinct gateway_node_ids as gateway candidates. Try to enrich with a matching
    // node record (any gateway_node_id scope) so we can show a name.
    const gwIds = new Set(all.map(n => n.gateway_node_id).filter(Boolean));
    for (const gid of gwIds) {
      if (byId.has(gid)) continue;
      const enrich = all.find(n => n.node_id === gid);
      byId.set(gid, enrich || { node_id: gid });
    }
    setKnownNodes(Array.from(byId.values()));
  };

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    setNodeId(me.node_id || '');
    setRegion(me.region || 'EU_868');
    setDefaultChannel(me.default_channel ?? 0);
    setTopicPrefix(me.topic_prefix || '');
    setSendViaMqtt(me.send_via_mqtt !== false); // default true
    setSendViaPortal(me.send_via_portal !== false); // default true
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
    const isAdmin = user?.role === 'admin';
    const prevNodeId = user?.node_id || '';
    const newNodeId = isAdmin ? nodeId.trim() : prevNodeId;
    const updatePayload = {
      region,
      default_channel: defaultChannel,
      channels: channelsToSave,
      topic_prefix: topicPrefix.trim(),
      send_via_mqtt: sendViaMqtt,
      send_via_portal: sendViaPortal,
    };
    if (isAdmin) updatePayload.node_id = newNodeId;
    await base44.auth.updateMe(updatePayload);
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

  const bothDisabled = !sendViaMqtt && !sendViaPortal;

  if (!user) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  const isAdmin = user?.role === 'admin';
  const inputClass = (extra = '') => `w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-foreground ${extra}`;

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
          list={user?.role === 'admin' ? 'known-node-ids' : undefined}
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          placeholder="e.g. !49b65bc8"
          readOnly={!isAdmin}
          disabled={!isAdmin}
          className={`w-full max-w-xs bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary ${
            !isAdmin ? 'text-muted-foreground cursor-not-allowed opacity-70' : 'text-foreground'
          }`}
        />
        {user?.role === 'admin' && (
          <datalist id="known-node-ids">
            {knownNodes.map(n => (
              <option key={n.node_id} value={n.node_id}>
                {[n.long_name, n.short_name].filter(Boolean).join(' / ') || n.node_id}
              </option>
            ))}
          </datalist>
        )}
        {user?.role === 'admin' ? (
          knownNodes.length > 0 ? (
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
          )
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Die Node-ID kann nur von einem Administrator geändert werden.
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
          readOnly={!isAdmin}
          disabled={!isAdmin}
          className={`w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary max-w-md font-mono ${!isAdmin ? 'text-muted-foreground cursor-not-allowed opacity-70' : 'text-foreground'}`}
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
            disabled={!isAdmin}
            className={`w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary ${!isAdmin ? 'text-muted-foreground cursor-not-allowed opacity-70' : 'text-foreground'}`}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Default Channel</label>
          <select
            value={defaultChannel}
            onChange={(e) => setDefaultChannel(parseInt(e.target.value))}
            disabled={!isAdmin}
            className={`w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary ${!isAdmin ? 'text-muted-foreground cursor-not-allowed opacity-70' : 'text-foreground'}`}
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
                readOnly={!isAdmin}
                disabled={!isAdmin}
                className={`flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary placeholder:text-muted-foreground ${
                  !isAdmin ? 'text-muted-foreground cursor-not-allowed opacity-70' : 'text-foreground'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Weiterleitungsoptionen */}
      <div>
        <label className="block text-xs font-medium text-primary mb-2 uppercase tracking-wider">
          Nachrichtenweiterleitung
        </label>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={sendViaMqtt}
              onChange={(e) => {
                if (!e.target.checked && !sendViaPortal) return;
                setSendViaMqtt(e.target.checked);
              }}
              className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
            />
            <div>
              <span className="text-sm text-foreground">Über MQTT senden</span>
              <p className="text-xs text-muted-foreground">Nachricht an das Radio weiterleiten (wenn Gateway online)</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={sendViaPortal}
              onChange={(e) => {
                if (!e.target.checked && !sendViaMqtt) return;
                setSendViaPortal(e.target.checked);
              }}
              className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
            />
            <div>
              <span className="text-sm text-foreground">Direkt im Portal spiegeln</span>
              <p className="text-xs text-muted-foreground">Nachricht sofort im Portal des Empfängers speichern, wenn dessen Node-ID bekannt ist</p>
            </div>
          </label>
          {bothDisabled && (
            <p className="text-xs text-destructive">Mindestens eine Option muss aktiviert sein.</p>
          )}
        </div>
      </div>

      {/* Speichern */}
      <div className="flex items-center justify-end gap-3">
        {!isAdmin && (
          <span className="text-xs text-muted-foreground">
            Node-ID und Broker-Einstellungen können nur von einem Administrator geändert werden.
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || bothDisabled}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground"
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