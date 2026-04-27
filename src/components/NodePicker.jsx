import { useState, useEffect, useRef } from 'react';
import { Search, X, Cpu, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LS_KEY = 'mesh_fav_nodes';

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

export function toggleFavorite(nodeId) {
  const favs = getFavorites();
  const updated = favs.includes(nodeId) ? favs.filter(id => id !== nodeId) : [...favs, nodeId];
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  return updated;
}

export default function NodePicker({ value, onChange }) {
  const [nodes, setNodes] = useState([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState(getFavorites);
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

  const handleToggleFav = (e, nodeId) => {
    e.stopPropagation();
    setFavorites(toggleFavorite(nodeId));
  };

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

  // Favorites first, then rest
  const favNodes = filtered.filter(n => favorites.includes(n.node_id));
  const otherNodes = filtered.filter(n => !favorites.includes(n.node_id));
  const sorted = [...favNodes, ...otherNodes];

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
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
          {favorites.includes(selectedNode.node_id) && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          {!favorites.includes(selectedNode.node_id) && <Cpu className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          <span className="text-sm text-foreground truncate">
            {selectedNode.long_name || selectedNode.short_name || selectedNode.node_id}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{selectedNode.node_id}</span>
          <button type="button" onClick={clear} className="ml-auto text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors text-left"
        >
          <Search className="w-4 h-4" />
          Search node…
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or ID…"
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {filter && (
              <button type="button" onClick={() => setFilter('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No nodes found</div>
            ) : (
              <>
                {favNodes.length > 0 && !lowerFilter && (
                  <div className="px-3 py-1 text-xs text-yellow-400 font-semibold uppercase tracking-wider bg-yellow-400/5 border-b border-border">
                    ★ Favorites
                  </div>
                )}
                {sorted.map((node, idx) => {
                  const isFav = favorites.includes(node.node_id);
                  const isFirstOther = !lowerFilter && favNodes.length > 0 && idx === favNodes.length;
                  return (
                    <div key={node.id}>
                      {isFirstOther && (
                        <div className="px-3 py-1 text-xs text-muted-foreground font-semibold uppercase tracking-wider bg-muted/30 border-b border-border">
                          All Nodes
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => select(node)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                      >
                        {isFav
                          ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          : <Cpu className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        }
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground truncate">
                            {node.long_name || node.short_name || node.node_id}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{node.node_id}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFav(e, node.node_id)}
                          className={`p-1 rounded transition-colors ${isFav ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground hover:text-yellow-400'}`}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-yellow-400' : ''}`} />
                        </button>
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}