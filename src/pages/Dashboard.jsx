import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Radio, RefreshCw, Activity, Layers, Cpu, Settings, HelpCircle } from 'lucide-react';
import SettingsPanel from '@/components/SettingsPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import MessageList from '@/components/MessageList';
import SendMessageForm from '@/components/SendMessageForm';
import PollPanel from '@/components/PollPanel';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [nodeName, setNodeName] = useState('');

  const fetchMessages = useCallback(async () => {
    const data = await base44.entities.MeshMessage.list('-meshtastic_timestamp', 100);
    setMessages(data);
    setLoading(false);
  }, []);

  const pollingRef = useRef(false);

  const autoPoll = useCallback(async () => {
    if (!currentUser?.node_id || pollingRef.current) return;
    pollingRef.current = true;
    try {
      await base44.functions.invoke('mqttPoll', { region: currentUser.region || 'EU_868', listenSeconds: 10 });
      fetchMessages();
    } catch (_) { /* silent */ }
    finally { pollingRef.current = false; }
  }, [currentUser, fetchMessages]);

  const sortMessages = (msgs) => {
    return [...msgs].sort((a, b) => {
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
        setMessages((prev) => sortMessages([event.data, ...prev]));
      }
    });
    return unsub;
  }, [fetchMessages]);

  // Auto-poll on page load, tab focus, and every 2 minutes while active
  useEffect(() => {
    if (!currentUser?.node_id) return;
    // Poll on initial load
    autoPoll();

    // Poll when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') autoPoll();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Poll every 2 minutes while tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') autoPoll();
    }, 120000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground tracking-tight">
                {nodeName || 'Meshtastic MQTT Bridge'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentUser?.node_id ? <span className="font-mono text-primary">{currentUser.node_id}</span> : 'Web ↔ MQTT ↔ Meshtastic Network'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {showSettings && (
          <section className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </h2>
            <SettingsPanel onSettingsChanged={() => loadUser()} />
          </section>
        )}
        <>
        {/* Send Form */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Send Message
          </h2>
          <SendMessageForm onMessageSent={() => { fetchMessages(); autoPoll(); }} userSettings={currentUser} />
        </section>

        {/* Manual Poll */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Manual Receive
          </h2>
          <PollPanel onReceived={fetchMessages} userSettings={currentUser} />
        </section>



        {/* Message Log */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Message History
            </h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              {stats.total} total
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <MessageList messages={sortMessages(messages)} onDelete={handleDelete} channels={currentUser?.channels} />
          )}
        </section>
        </>
      </main>
    </div>
  );
}