import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Radio, ArrowLeft, RefreshCw, Download, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import NodeTable from '@/components/NodeTable';

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [user, setUser] = useState(null);
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
      setResult({ type: 'error', msg: 'Bitte zuerst eine Node-ID in den Einstellungen setzen.' });
      return;
    }
    setPolling(true);
    setResult(null);
    setLogLines([]);
    try {
      const res = await base44.functions.invoke('mqttNodesPoll', { fromNode });
      const d = res.data;
      setLogLines(d.log || []);
      const errText = d.errors ? `, ${d.errors} Fehler` : '';
      setResult({ type: 'success', msg: `${d.total} Nodes gelesen (${d.created} neu, ${d.updated} aktualisiert${errText})` });
      fetchNodes();
    } catch (err) {
      setResult({ type: 'error', msg: err.message || 'Fehler beim Abrufen' });
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-400" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-600/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight">Mesh Nodes</h1>
              <p className="text-xs text-slate-500">{nodes.length} Nodes bekannt</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.node_id && (
              <span className="text-xs font-mono text-cyan-400 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                {user.node_id}
              </span>
            )}
            <button
              onClick={handlePollNodes}
              disabled={polling || !user?.node_id}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {polling ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  <span>Lese Nodes…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Nodes einlesen</span>
                </>
              )}
            </button>
            <button
              onClick={fetchNodes}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        {(result || logLines.length > 0) && (
          <div className="max-w-6xl mx-auto px-4 pb-3 space-y-2">
            {result && (
              <div className={`text-xs px-3 py-2 rounded-lg ${result.type === 'success' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                {result.msg}
              </div>
            )}
            {logLines.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 max-h-48 overflow-y-auto">
                {logLines.map((line, i) => (
                  <div key={i} className="text-xs text-slate-400 py-0.5 font-mono">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <NodeTable nodes={nodes} />
        )}
      </main>
    </div>
  );
}