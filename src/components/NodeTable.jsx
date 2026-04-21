import { useState } from 'react';
import { Cpu, Radio, Battery, MapPin, Clock, Wifi, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

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
  if (level === null || level === undefined) return <span className="text-slate-600">—</span>;
  const color = level > 75 ? 'text-emerald-400' : level > 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Battery className="w-3.5 h-3.5" />
      {level > 100 ? 'USB' : `${level}%`}
    </span>
  );
}

const COLUMNS = [
  { key: 'long_name', label: 'Node' },
  { key: 'short_name', label: 'Kurzname' },
  { key: 'hw_model', label: 'Hardware' },
  { key: 'battery_level', label: 'Batterie' },
  { key: 'snr', label: 'SNR' },
  { key: 'latitude', label: 'Position' },
  { key: 'uptime_seconds', label: 'Uptime' },
  { key: 'last_heard', label: 'Zuletzt gehört' },
];

function SortIcon({ column, sortKey, sortDir }) {
  if (column !== sortKey) return <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cyan-400" />
    : <ChevronDown className="w-3 h-3 text-cyan-400" />;
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

export default function NodeTable({ nodes }) {
  const [sortKey, setSortKey] = useState('last_heard');
  const [sortDir, setSortDir] = useState('desc');

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
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <Cpu className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Keine Nodes bekannt</p>
        <p className="text-xs mt-1 opacity-60">Klicke „Nodes einlesen" um Nodes vom Mesh abzurufen</p>
      </div>
    );
  }

  const sorted = [...nodes].sort((a, b) => compareNodes(a, b, sortKey, sortDir));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="text-left py-3 px-3 cursor-pointer select-none hover:text-slate-300 transition-colors group"
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((node) => (
            <tr key={node.id} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  {node.is_gateway && <Radio className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                  <div>
                    <div className="text-slate-200 font-medium text-xs">{node.long_name || node.node_id}</div>
                    <div className="text-slate-600 text-xs font-mono">{node.node_id}</div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-3 text-slate-400 text-xs">{node.short_name || '—'}</td>
              <td className="py-2.5 px-3">
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {node.hw_model || '—'}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs">
                <BatteryIcon level={node.battery_level} />
              </td>
              <td className="py-2.5 px-3 text-xs text-slate-400">
                {node.snr !== null && node.snr !== undefined ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    {node.snr.toFixed(1)}
                  </span>
                ) : '—'}
              </td>
              <td className="py-2.5 px-3 text-xs">
                {node.latitude && node.longitude ? (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                  </span>
                ) : <span className="text-slate-600">—</span>}
              </td>
              <td className="py-2.5 px-3 text-xs text-slate-400">
                {formatUptime(node.uptime_seconds)}
              </td>
              <td className="py-2.5 px-3 text-xs text-slate-500">
                {node.last_heard ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(node.last_heard * 1000), { addSuffix: true, locale: de })}
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}