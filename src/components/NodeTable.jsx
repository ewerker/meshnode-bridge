import { Cpu, Radio, Battery, MapPin, Clock, Wifi } from 'lucide-react';
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

export default function NodeTable({ nodes }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <Cpu className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Keine Nodes bekannt</p>
        <p className="text-xs mt-1 opacity-60">Klicke „Nodes einlesen" um Nodes vom Mesh abzurufen</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
            <th className="text-left py-3 px-3">Node</th>
            <th className="text-left py-3 px-3">Kurzname</th>
            <th className="text-left py-3 px-3">Hardware</th>
            <th className="text-left py-3 px-3">Batterie</th>
            <th className="text-left py-3 px-3">SNR</th>
            <th className="text-left py-3 px-3">Position</th>
            <th className="text-left py-3 px-3">Uptime</th>
            <th className="text-left py-3 px-3">Zuletzt gehört</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
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