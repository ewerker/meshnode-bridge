import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BUCKETS = [
  { label: 'Excellent (>10)', min: 10.01, max: Infinity, color: 'hsl(160, 60%, 45%)' },
  { label: 'Good (5–10)', min: 5, max: 10, color: 'hsl(186, 100%, 42%)' },
  { label: 'Fair (0–5)', min: 0, max: 4.99, color: 'hsl(45, 90%, 50%)' },
  { label: 'Poor (-5–0)', min: -5, max: -0.01, color: 'hsl(30, 80%, 55%)' },
  { label: 'Bad (<-5)', min: -Infinity, max: -5.01, color: 'hsl(0, 70%, 50%)' },
];

export default function SnrChart({ nodes }) {
  const withSnr = nodes.filter(n => n.snr !== null && n.snr !== undefined);

  const data = BUCKETS.map(b => ({
    name: b.label,
    count: withSnr.filter(n => n.snr >= b.min && n.snr <= b.max).length,
    color: b.color,
  })).filter(d => d.count > 0);

  const noSnr = nodes.length - withSnr.length;
  if (noSnr > 0) {
    data.push({ name: 'No data', count: noSnr, color: 'hsl(222, 30%, 25%)' });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">SNR Distribution</h3>
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