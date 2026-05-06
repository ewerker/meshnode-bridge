import { useState } from 'react';
import { Cpu, Radio, Battery, MapPin, Clock, Wifi, ChevronUp, ChevronDown, Star, Search, X, Pencil, Trash2, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { base44 } from '@/api/base44Client';

function formatUptime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

function BatteryIcon({ level }) {
  if (level === null || level === undefined) return <span className="text-muted-foreground">—</span>;
  const color = level > 75 ? 'text-emerald-400' : level > 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Battery className="w-3.5 h-3.5" />
      {level > 100 ? 'USB' : `${level}%`}
    </span>
  );
}

const COLUMNS = [
  { key: '_fav', label: '★', sortable: false },
  { key: 'long_name', label: 'Node' },
  { key: 'short_name', label: 'Short Name' },
  { key: 'hw_model', label: 'Hardware' },
  { key: 'battery_level', label: 'Battery' },
  { key: 'snr', label: 'SNR' },
  { key: 'latitude', label: 'Location' },
  { key: 'uptime_seconds', label: 'Uptime' },
  { key: 'last_heard', label: 'Last Heard' },
  { key: '_actions', label: 'Aktionen', sortable: false },
];

function SortIcon({ column, sortKey, sortDir }) {
  if (column !== sortKey) return <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

function getValue(node, key) {
  const v = node[key];
  if (v === null || v === undefined) return null;
  return v;
}

function compareNodes(a, b, key, dir) {
  let aVal = getValue(a, key);
  let bVal = getValue(b, key);

  // For 'long_name' column, fall back to node_id
  if (key === 'long_name') {
    aVal = (a.long_name || a.node_id || '').toLowerCase();
    bVal = (b.long_name || b.node_id || '').toLowerCase();
  }

  // Nulls always last
  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;
  if (bVal === null) return -1;

  if (typeof aVal === 'string') {
    aVal = aVal.toLowerCase();
    bVal = (bVal || '').toString().toLowerCase();
  }

  if (aVal < bVal) return dir === 'asc' ? -1 : 1;
  if (aVal > bVal) return dir === 'asc' ? 1 : -1;
  return 0;
}

export default function NodeTable({ nodes, onFavoriteToggle, currentUser, onEditManual, onDeletedManual }) {
  const [sortKey, setSortKey] = useState('last_heard');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const canEditDelete = (node) => node.is_manual && (isAdmin || node.created_by === currentUser?.email);

  const handleToggleFav = async (e, node) => {
    e.stopPropagation();
    await base44.entities.MeshNode.update(node.id, { is_favorite: !node.is_favorite });
    onFavoriteToggle?.();
  };

  const handleDelete = async (e, node) => {
    e.stopPropagation();
    if (!confirm(`Manuelle Node "${node.long_name || node.node_id}" löschen?`)) return;
    const res = await base44.functions.invoke('manualNodeCrud', { action: 'delete', id: node.id });
    if (res.data?.error) {
      alert(res.data.error);
      return;
    }
    onDeletedManual?.();
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'last_heard' || key === 'battery_level' || key === 'snr' || key === 'uptime_seconds' ? 'desc' : 'asc');
    }
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Cpu className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No nodes known</p>
        <p className="text-xs mt-1 opacity-60">Click "Fetch Nodes" to retrieve nodes from the mesh</p>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? nodes.filter(n =>
        (n.long_name || '').toLowerCase().includes(q) ||
        (n.short_name || '').toLowerCase().includes(q) ||
        (n.node_id || '').toLowerCase().includes(q)
      )
    : nodes;

  const sorted = [...filtered].sort((a, b) => compareNodes(a, b, sortKey, sortDir)).sort((a, b) => {
    // Sort favorites to top
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return 0;
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by long/short name or node ID…"
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {q && (
          <span className="text-xs text-muted-foreground">
            {sorted.length} / {nodes.length}
          </span>
        )}
      </div>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No nodes match "{search}"</p>
        </div>
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`text-left py-3 px-3 select-none transition-colors group ${col.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''}`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable !== false && <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((node) => (
            <tr key={node.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
              <td className="py-2.5 px-3 w-8">
                <button
                  onClick={(e) => handleToggleFav(e, node)}
                  className={`transition-colors ${node.is_favorite ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400'}`}
                  title={node.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-3.5 h-3.5 ${node.is_favorite ? 'fill-yellow-400' : ''}`} />
                </button>
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  {node.is_gateway && <Radio className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  {node.is_manual && (
                    <span title="Manuell angelegt" className="flex-shrink-0">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  )}
                  <div>
                    <div className="text-foreground font-medium text-xs">{node.long_name || node.node_id}</div>
                    <div className="text-muted-foreground text-xs font-mono">{node.node_id}</div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-3 text-muted-foreground text-xs">{node.short_name || '—'}</td>
              <td className="py-2.5 px-3">
                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                  {node.hw_model || '—'}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs">
                <BatteryIcon level={node.battery_level} />
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground">
                {node.snr !== null && node.snr !== undefined ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    {node.snr.toFixed(1)}
                  </span>
                ) : '—'}
              </td>
              <td className="py-2.5 px-3 text-xs">
                {node.latitude && node.longitude ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground">
                {formatUptime(node.uptime_seconds)}
              </td>
              <td className="py-2.5 px-3 text-xs text-muted-foreground">
                {node.last_heard ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(node.last_heard * 1000), { addSuffix: true })}
                  </span>
                ) : '—'}
              </td>
              <td className="py-2.5 px-3 w-16">
                {canEditDelete(node) && (
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditManual?.(node); }}
                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, node)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}