import { useState, useEffect, useRef } from 'react';
import { Search, X, Cpu, Star, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function NodePicker({ value, onChange, onFavoriteToggle, portalOnly = false }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [ownGatewayId, setOwnGatewayId] = useState(null);
  const [portalNodeIds, setPortalNodeIds] = useState(new Set());
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const admin = me?.role === 'admin';
      setIsAdmin(admin);
      setOwnGatewayId(me?.node_id || null);

      // Fetch portal users + mesh nodes via backend function (bypasses RLS for all roles)
      const res = await base44.functions.invoke('getPortalUsers', {});
      const portalUsers = res.data?.users || [];
      const meshNodes = res.data?.nodes || [];
      setPortalNodeIds(new Set(portalUsers.map(u => u.node_id)));

      if (portalOnly) {
        setNodes(portalUsers.map(u => ({
          id: u.id,
          node_id: u.node_id,
          long_name: u.long_name || u.node_id,
          short_name: '',
          _isPortalUser: true,
        })));
      } else if (admin) {
        // Admins see all mesh nodes (own filter to keep favorites editable)
        if (!me?.node_id) { setNodes([]); return; }
        const data = await base44.entities.MeshNode.filter({ gateway_node_id: me.node_id }, '-last_heard', 500);
        setNodes(data);
      } else {
        // Regular users get the same node list as the Nodes page (via service role)
        setNodes(meshNodes);
      }
    })();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggleFav = async (e, node) => {
    e.stopPropagation();
    if (!isAdmin) return;
    await base44.entities.MeshNode.update(node.id, { is_favorite: !node.is_favorite });
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, is_favorite: !n.is_favorite } : n));
    onFavoriteToggle?.();
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

  const favNodes = filtered.filter(n => n.is_favorite);
  const otherNodes = filtered.filter(n => !n.is_favorite);
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

  const isPortal = (nodeId) => portalNodeIds.has(nodeId);
  // "Eigen" = node was discovered/created within the user's own gateway scope.
  // "Fremd" = node belongs to another gateway scope (delivery may not yet be possible).
  const isOwn = (node) => ownGatewayId && node.gateway_node_id === ownGatewayId;

  return (
    <div ref={ref} className="relative">
      {/* Selected display / trigger */}
      {value && selectedNode ? (
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
          {selectedNode.is_favorite
            ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            : <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${isPortal(selectedNode.node_id) ? 'text-emerald-400' : 'text-primary'}`} />
          }
          <span className="text-sm text-foreground truncate">
            {selectedNode.long_name || selectedNode.short_name || selectedNode.node_id}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{selectedNode.node_id}</span>
          {isPortal(selectedNode.node_id) && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">Portal</span>
          )}
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
          {portalOnly ? 'Portal-Nutzer auswählen…' : isAdmin ? 'Search node…' : 'Portal-Nutzer auswählen…'}
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
              placeholder="Filter…"
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
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                {isAdmin ? 'No nodes found' : 'Keine Portal-Nutzer gefunden'}
              </div>
            ) : (
              <>
                {isAdmin && favNodes.length > 0 && !lowerFilter && (
                  <div className="px-3 py-1 text-xs text-yellow-400 font-semibold uppercase tracking-wider bg-yellow-400/5 border-b border-border">
                    ★ Favorites
                  </div>
                )}
                {sorted.map((node, idx) => {
                  const isFirstOther = isAdmin && !lowerFilter && favNodes.length > 0 && idx === favNodes.length;
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
                        {node.is_favorite
                          ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          : node._isPortalUser
                            ? <User className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                            : <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${isOwn(node) ? 'text-primary' : isPortal(node.node_id) ? 'text-emerald-400' : 'text-muted-foreground/60'}`} />
                        }
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${isOwn(node) ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {node.long_name || node.short_name || node.node_id}
                            </span>
                            {isOwn(node) && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-primary/15 text-primary font-semibold flex-shrink-0" title="In deinem Gateway-Scope bekannt">Eigen</span>
                            )}
                            {!isOwn(node) && !isPortal(node.node_id) && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold flex-shrink-0" title="Fremder Node — Zustellung evtl. nicht möglich">Fremd</span>
                            )}
                            {isPortal(node.node_id) && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold flex-shrink-0">Portal</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{node.node_id}</div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleFav(e, node)}
                            className={`p-1 rounded transition-colors ${node.is_favorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground hover:text-yellow-400'}`}
                            title={node.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`w-3.5 h-3.5 ${node.is_favorite ? 'fill-yellow-400' : ''}`} />
                          </button>
                        )}
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