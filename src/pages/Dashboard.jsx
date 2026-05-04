import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Radio, RefreshCw, Activity, Layers, Cpu, Settings, HelpCircle } from 'lucide-react';
import SettingsPanel from '@/components/SettingsPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import MessageList from '@/components/MessageList';
import SendMessageForm from '@/components/SendMessageForm';
import PollPanel from '@/components/PollPanel';
import AutoPollStatus from '@/components/AutoPollStatus';
import PollCountdown from '@/components/PollCountdown';
import PollLog from '@/components/PollLog';
import CollapsibleSection from '@/components/CollapsibleSection';
import GatewayStatusIndicator from '@/components/GatewayStatusIndicator';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyHopLimit, setReplyHopLimit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMessages = useCallback(async (gw) => {
    const me = gw || (await base44.auth.me()).node_id;
    if (!me) { setMessages([]); setLoading(false); return; }
    const data = await base44.entities.MeshMessage.filter({ gateway_node_id: me }, '-created_date', 100);
    setMessages(sortMessages(data));
    setLoading(false);
  }, []);

  const pollingRef = useRef(false);
  const [isPolling, setIsPolling] = useState(false);

  const autoPoll = useCallback(async () => {
    if (!currentUser?.node_id || pollingRef.current) return;
    pollingRef.current = true;
    setIsPolling(true);
    const releaseUi = setTimeout(() => {
      pollingRef.current = false;
      setIsPolling(false);
    }, 32000);
    try {
      await base44.functions.invoke('mqttPoll', { region: currentUser.region || 'EU_868', listenSeconds: 30, pollType: 'initial_poll' });
      fetchMessages();
    } catch (_) { /* silent */ }
    finally {
      clearTimeout(releaseUi);
      pollingRef.current = false;
      setIsPolling(false);
    }
  }, [currentUser, fetchMessages]);

  const sortMessages = (msgs) => {
    const uniqueMap = new Map();
    msgs.forEach(m => { uniqueMap.set(m.id, m); });
    const uniqueMsgs = Array.from(uniqueMap.values());

    return uniqueMsgs.sort((a, b) => {
      const aTime = a.meshtastic_timestamp || (a.created_date ? new Date(a.created_date.endsWith('Z') ? a.created_date : a.created_date + 'Z').getTime() / 1000 : 0);
      const bTime = b.meshtastic_timestamp || (b.created_date ? new Date(b.created_date.endsWith('Z') ? b.created_date : b.created_date + 'Z').getTime() / 1000 : 0);
      return bTime - aTime;
    });
  };

  const handleDelete = async (id) => {
    await base44.entities.MeshMessage.delete(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    fetchMessages();
    loadUser();
    const unsub = base44.entities.MeshMessage.subscribe((event) => {
      if (event.type === 'create') {
        // Only show messages for the currently configured gateway
        const myGw = currentUser?.node_id;
        if (myGw && event.data?.gateway_node_id !== myGw) return;
        setMessages((prev) => sortMessages([event.data, ...prev]));
      }
    });
    return unsub;
  }, [fetchMessages]);

  const initialPollRef = useRef(false);
  useEffect(() => {
    if (!currentUser?.node_id || initialPollRef.current) return;
    initialPollRef.current = true;
    autoPoll();
  }, [currentUser?.node_id, autoPoll]);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setCurrentUser(me);
    if (me.node_id) {
      const nodes = await base44.entities.MeshNode.filter({ node_id: me.node_id });
      setNodeName(nodes.length > 0 ? (nodes[0].long_name || nodes[0].short_name || '') : '');
    } else {
      setNodeName('');
    }
  };

  const stats = {
    total: messages.length,
    sent: messages.filter((m) => m.direction === 'outbound').length,
    received: messages.filter((m) => m.direction === 'inbound').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="tracking-tight">
                <GatewayStatusIndicator nodeName={nodeName} nodeId={currentUser?.node_id} />
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                {currentUser?.node_id
                  ? <span className="font-mono text-primary">{currentUser.node_id}</span>
                  : <span>Web ↔ MQTT ↔ Meshtastic Network</span>}
                {currentUser?.email && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="truncate max-w-[180px]" title={currentUser.email}>
                      {currentUser.full_name || currentUser.email}
                    </span>
                    {currentUser.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider font-semibold">
                        admin
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">{stats.sent} sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-muted-foreground">{stats.received} received</span>
              </div>
            </div>
            <Link
              to="/nodes"
              className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors"
            >
              <Cpu className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Nodes</span>
            </Link>
            <Link
              to="/about"
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="About"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Link>
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => { fetchMessages(); autoPoll(); }}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <AutoPollStatus currentUser={currentUser} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isPolling && (
          <div className="bg-card rounded-2xl border border-primary/30 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Empfang beim Seitenladen läuft</p>
              <p className="text-xs text-muted-foreground">Manual Receive ist danach wieder nutzbar.</p>
            </div>
            <PollCountdown active={isPolling} seconds={30} />
          </div>
        )}
        {showSettings && (
          <section className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </h2>
            <SettingsPanel onSettingsChanged={() => { loadUser(); fetchMessages(); setRefreshKey(k => k + 1); }} />
          </section>
        )}
        <>
        {/* Manual Poll */}
        <CollapsibleSection id="manual_receive" icon={Layers} title="Manual Receive">
          <PollPanel onReceived={fetchMessages} userSettings={currentUser} />
        </CollapsibleSection>

        {/* Send Form */}
        <CollapsibleSection id="send_message" icon={Radio} title="Send Message" headerColorClass="text-primary">
          <SendMessageForm onMessageSent={() => { fetchMessages(); autoPoll(); }} userSettings={currentUser} replyTo={replyTo} replyHopLimit={replyHopLimit} onReplyToClear={() => { setReplyTo(null); setReplyHopLimit(null); }} />
        </CollapsibleSection>


        {/* Message Log */}
        <CollapsibleSection
          id="message_history"
          icon={Layers}
          title={`Message History (${stats.total})`}
          headerColorClass="text-foreground"
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <MessageList messages={sortMessages(messages)} onDelete={handleDelete} channels={currentUser?.channels} refreshKey={refreshKey} onReply={(nodeId, hopStart) => { setReplyTo(nodeId); setReplyHopLimit(hopStart !== undefined && hopStart > 3 ? hopStart : null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          )}
        </CollapsibleSection>

        {/* Auto-Poll Log (bottom) */}
        <CollapsibleSection id="poll_log" icon={Activity} title="Poll Log" defaultOpen={false}>
          <PollLog />
        </CollapsibleSection>
        </>
      </main>
    </div>
  );
}