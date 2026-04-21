import { useState, useEffect, useRef } from 'react';
import { Search, X, Cpu } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function NodePicker({ value, onChange }) {
  const [nodes, setNodes] = useState([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.MeshNode.list('-last_heard', 500).then(setNodes);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedNode = nodes.find(n => n.node_id === value);
  const lowerFilter = filter.toLowerCase();
  const filtered = nodes.filter(n => {
    if (!lowerFilter) return true;
    return (
      (n.long_name || '').toLowerCase().includes(lowerFilter) ||
      (n.short_name || '').toLowerCase().includes(lowerFilter) ||
      (n.node_id || '').toLowerCase().includes(lowerFilter)
    );
  });

  const select = (node) => {
    onChange(node.node_id);
    setOpen(false);
    setFilter('');
  };

  const clear = () => {
    onChange('');
    setFilter('');
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected display / trigger */}
      {value && selectedNode ? (
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-slate-200 truncate">
            {selectedNode.long_name || selectedNode.short_name || selectedNode.node_id}
          </span>
          <span className="text-xs text-slate-500 font-mono">{selectedNode.node_id}</span>
          <button type="button" onClick={clear} className="ml-auto text-slate-500 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 hover:border-cyan-500 transition-colors text-left"
        >
          <Search className="w-4 h-4" />
          Node suchen…
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Name oder ID filtern…"
              className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder-slate-600"
              autoFocus
            />
            {filter && (
              <button type="button" onClick={() => setFilter('')} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-600 text-center">Keine Nodes gefunden</div>
            ) : (
              filtered.map(node => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => select(node)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 transition-colors text-left"
                >
                  <Cpu className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">
                      {node.long_name || node.short_name || node.node_id}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{node.node_id}</div>
                  </div>
                  {node.short_name && node.long_name && (
                    <span className="text-xs text-slate-600">{node.short_name}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}