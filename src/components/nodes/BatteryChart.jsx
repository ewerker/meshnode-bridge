import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BUCKETS = [
  { label: 'USB (>100)', min: 101, max: Infinity, color: 'hsl(30, 80%, 55%)' },
  { label: '76–100%', min: 76, max: 100, color: 'hsl(160, 60%, 45%)' },
  { label: '51–75%', min: 51, max: 75, color: 'hsl(186, 100%, 42%)' },
  { label: '26–50%', min: 26, max: 50, color: 'hsl(45, 90%, 50%)' },
  { label: '0–25%', min: 0, max: 25, color: 'hsl(0, 70%, 50%)' },
];

export default function BatteryChart({ nodes }) {
  const withBattery = nodes.filter(n => n.battery_level !== null && n.battery_level !== undefined);

  const data = BUCKETS.map(b => ({
    name: b.label,
    count: withBattery.filter(n => n.battery_level >= b.min && n.battery_level <= b.max).length,
    color: b.color,
  })).filter(d => d.count > 0);

  const noBattery = nodes.length - withBattery.length;
  if (noBattery > 0) {
    data.push({ name: 'No data', count: noBattery, color: 'hsl(222, 30%, 25%)' });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Battery Distribution</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(210, 20%, 45%)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(210, 20%, 45%)' }} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 47%, 7%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 40%, 92%)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}