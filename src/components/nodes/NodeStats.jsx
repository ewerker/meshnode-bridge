import { Cpu, Battery, Wifi, Clock, Radio, Activity, MapPin, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import HardwareChart from './HardwareChart';
import BatteryChart from './BatteryChart';
import SnrChart from './SnrChart';
import UptimeChart from './UptimeChart';
import LastSeenChart from './LastSeenChart';
import StatCard from './StatCard';

export default function NodeStats({ nodes }) {
  if (!nodes || nodes.length === 0) return null;

  // General stats
  const total = nodes.length;
  const withPosition = nodes.filter(n => n.latitude && n.longitude).length;
  const withBattery = nodes.filter(n => n.battery_level !== null && n.battery_level !== undefined).length;
  const withSnr = nodes.filter(n => n.snr !== null && n.snr !== undefined).length;
  const withUptime = nodes.filter(n => n.uptime_seconds > 0).length;
  const gateways = nodes.filter(n => n.is_gateway).length;
  const onUsb = nodes.filter(n => n.battery_level > 100).length;

  // SNR stats
  const snrValues = nodes.filter(n => n.snr !== null && n.snr !== undefined).map(n => n.snr);
  const avgSnr = snrValues.length ? (snrValues.reduce((a, b) => a + b, 0) / snrValues.length).toFixed(1) : '—';
  const minSnr = snrValues.length ? Math.min(...snrValues).toFixed(1) : '—';
  const maxSnr = snrValues.length ? Math.max(...snrValues).toFixed(1) : '—';

  // Battery stats (excluding USB = >100)
  const batteryValues = nodes.filter(n => n.battery_level !== null && n.battery_level !== undefined && n.battery_level <= 100).map(n => n.battery_level);
  const avgBattery = batteryValues.length ? Math.round(batteryValues.reduce((a, b) => a + b, 0) / batteryValues.length) : '—';

  // Uptime stats
  const uptimeValues = nodes.filter(n => n.uptime_seconds > 0).map(n => n.uptime_seconds);
  const avgUptimeHours = uptimeValues.length ? Math.round(uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length / 3600) : 0;
  const maxUptimeHours = uptimeValues.length ? Math.round(Math.max(...uptimeValues) / 3600) : 0;

  // Last seen stats
  const now = Date.now() / 1000;
  const recentlyActive = nodes.filter(n => n.last_heard && (now - n.last_heard) < 3600).length;
  const activeToday = nodes.filter(n => n.last_heard && (now - n.last_heard) < 86400).length;
  const activeWeek = nodes.filter(n => n.last_heard && (now - n.last_heard) < 604800).length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Cpu} label="Total Nodes" value={total} color="text-primary" />
        <StatCard icon={Radio} label="Gateways" value={gateways} color="text-yellow-400" />
        <StatCard icon={MapPin} label="With GPS" value={withPosition} color="text-emerald-400" />
        <StatCard icon={Activity} label="Active (1h)" value={recentlyActive} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Wifi} label="Avg SNR" value={avgSnr} color="text-primary" />
        <StatCard icon={Battery} label="Avg Battery" value={typeof avgBattery === 'number' ? `${avgBattery}%` : '—'} color="text-emerald-400" />
        <StatCard icon={Clock} label="Avg Uptime" value={`${avgUptimeHours}h`} color="text-yellow-400" />
        <StatCard icon={BarChart3} label="On USB" value={onUsb} color="text-orange-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HardwareChart nodes={nodes} />
        <BatteryChart nodes={nodes} />
        <SnrChart nodes={nodes} />
        <LastSeenChart nodes={nodes} />
        <UptimeChart nodes={nodes} />
      </div>
    </div>
  );
}