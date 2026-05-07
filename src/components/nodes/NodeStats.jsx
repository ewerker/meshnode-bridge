import { Cpu, Battery, BatteryCharging, Wifi, Clock, Radio, Activity, MapPin, HelpCircle } from 'lucide-react';
import HardwareChart from './HardwareChart';
import SnrChart from './SnrChart';
import UptimeChart from './UptimeChart';
import LastSeenChart from './LastSeenChart';
import StatCard from './StatCard';
import { useLanguage } from '@/lib/LanguageContext';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NodeStats({ nodes, ownNode }) {
  const { language } = useLanguage();
  const isDe = language === 'de';
  if (!nodes || nodes.length === 0) return null;

  const total = nodes.length;
  const withPosition = nodes.filter(n => n.latitude && n.longitude).length;
  const gateways = nodes.filter(n => n.is_gateway).length;
  const now = Date.now() / 1000;
  const recentlyActive = nodes.filter(n => n.last_heard && (now - n.last_heard) < 3600).length;

  // Power supply stats
  const onUsb = nodes.filter(n => n.battery_level !== null && n.battery_level !== undefined && n.battery_level > 100).length;
  const onBattery = nodes.filter(n => n.battery_level !== null && n.battery_level !== undefined && n.battery_level <= 100).length;
  const powerUnknown = nodes.filter(n => n.battery_level === null || n.battery_level === undefined).length;

  // SNR stats
  const snrValues = nodes.filter(n => n.snr !== null && n.snr !== undefined).map(n => n.snr);
  const avgSnr = snrValues.length ? (snrValues.reduce((a, b) => a + b, 0) / snrValues.length).toFixed(1) : '—';

  // Uptime stats
  const uptimeValues = nodes.filter(n => n.uptime_seconds > 0).map(n => n.uptime_seconds);
  const avgUptimeHours = uptimeValues.length ? Math.round(uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length / 3600) : 0;

  // Distance stats (from ownNode to all other nodes with GPS)
  let avgDist = '—';
  let maxDist = '—';
  if (ownNode?.latitude && ownNode?.longitude) {
    const distances = nodes
      .filter(n => n.latitude && n.longitude && n.node_id !== ownNode.node_id)
      .map(n => haversineDistance(ownNode.latitude, ownNode.longitude, n.latitude, n.longitude));
    if (distances.length) {
      const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
      const max = Math.max(...distances);
      avgDist = avg < 1 ? `${Math.round(avg * 1000)} m` : `${avg.toFixed(1)} km`;
      maxDist = max < 1 ? `${Math.round(max * 1000)} m` : `${max.toFixed(1)} km`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Cpu} label={isDe ? 'Nodes gesamt' : 'Total Nodes'} value={total} color="text-primary" />
        <StatCard icon={Radio} label="Gateways" value={gateways} color="text-yellow-400" />
        <StatCard icon={MapPin} label={isDe ? 'Mit GPS' : 'With GPS'} value={withPosition} color="text-emerald-400" />
        <StatCard icon={Activity} label={isDe ? 'Aktiv (1h)' : 'Active (1h)'} value={recentlyActive} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BatteryCharging} label={isDe ? 'Stromversorg.' : 'Powered'} value={onUsb} color="text-emerald-400" />
        <StatCard icon={Battery} label={isDe ? 'Batterie' : 'Battery'} value={onBattery} color="text-orange-400" />
        <StatCard icon={HelpCircle} label={isDe ? 'Unbekannt' : 'Unknown'} value={powerUnknown} color="text-muted-foreground" />
        <StatCard icon={Wifi} label="Avg SNR" value={avgSnr} color="text-primary" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Avg Uptime" value={`${avgUptimeHours}h`} color="text-yellow-400" />
        <StatCard icon={MapPin} label={isDe ? 'Ø Entfernung' : 'Avg Distance'} value={avgDist} color="text-cyan-400" />
        <StatCard icon={MapPin} label={isDe ? 'Max Entfernung' : 'Max Distance'} value={maxDist} color="text-blue-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HardwareChart nodes={nodes} />
        <SnrChart nodes={nodes} />
        <LastSeenChart nodes={nodes} />
        <UptimeChart nodes={nodes} />
      </div>
    </div>
  );
}