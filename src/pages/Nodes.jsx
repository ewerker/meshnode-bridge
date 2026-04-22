import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, RefreshCw, Download, Cpu, BarChart3, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import NodeTable from '@/components/NodeTable';
import NodeStats from '@/components/nodes/NodeStats';
import ThemeToggle from '@/components/ThemeToggle';

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('table');
  const fetchNodes = useCallback(async () => {
    const data = await base44.entities.MeshNode.list('-last_heard', 500);
    setNodes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNodes();
    loadUser();
  }, [fetchNodes]);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
  };

  const handlePollNodes = async () => {
    const fromNode = user?.node_id;
    if (!fromNode) {
      setResult({ type: 'error', msg: 'Please set a Node ID in Settings first.' });
      return;
    }
    setPolling(true);
    setResult(null);
    setLogLines([]);
    try {
      const res = await base44.functions.invoke('mqttNodesPoll', { fromNode });
      const d = res.data;
      setLogLines(d.log || []);
      const errText = d.errors ? `, ${d.errors} errors` : '';
      setResult({ type: 'success', msg: `${d.total} nodes read (${d.created} new, ${d.updated} updated${errText})` });
      fetchNodes();
    } catch (err) {
      setResult({ type: 'error', msg: err.message || 'Error fetching nodes' });
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-600/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-bold text-foreground tracking-tight">Mesh Nodes</h1>
              <p className="text-xs text-muted-foreground">{nodes.length} nodes known</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.node_id && (
              <span className="text-xs font-mono text-primary bg-secondary border border-border rounded-lg px-3 py-2">
                {user.node_id}
              </span>
            )}
            <div className="flex bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setView('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'stats' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stats</span>
              </button>
            </div>
            <button
              onClick={handlePollNodes}
              disabled={polling || !user?.node_id}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {polling ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  <span>Reading nodes…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Fetch Nodes</span>
                </>
              )}
            </button>
            <button
              onClick={fetchNodes}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <ThemeToggle />
          </div>
        </div>
        {(result || logLines.length > 0) && (
          <div className="max-w-6xl mx-auto px-4 pb-3 space-y-2">
            {result && (
              <div className={`text-xs px-3 py-2 rounded-lg ${result.type === 'success' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
                {result.msg}
              </div>
            )}
            {logLines.length > 0 && (
              <div className="bg-card border border-border rounded-lg px-3 py-2 max-h-48 overflow-y-auto">
                {logLines.map((line, i) => (
                  <div key={i} className="text-xs text-muted-foreground py-0.5 font-mono">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : view === 'stats' ? (
          <NodeStats nodes={nodes} />
        ) : (
          <NodeTable nodes={nodes} />
        )}
      </main>
    </div>
  );
}