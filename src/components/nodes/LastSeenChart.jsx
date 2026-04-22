import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const NOW = () => Date.now() / 1000;

const BUCKETS = [
  { label: '<1h', maxAge: 3600, color: 'hsl(160, 60%, 45%)' },
  { label: '1–6h', maxAge: 21600, color: 'hsl(186, 100%, 42%)' },
  { label: '6–24h', maxAge: 86400, color: 'hsl(45, 90%, 50%)' },
  { label: '1–7d', maxAge: 604800, color: 'hsl(30, 80%, 55%)' },
  { label: '>7d', maxAge: Infinity, color: 'hsl(0, 70%, 50%)' },
];

export default function LastSeenChart({ nodes }) {
  const now = NOW();
  const withLastHeard = nodes.filter(n => n.last_heard);
  
  let prevMax = 0;
  const data = BUCKETS.map(b => {
    const count = withLastHeard.filter(n => {
      const age = now - n.last_heard;
      return age >= prevMax && age < b.maxAge;
    }).length;
    const item = { name: b.label, count, color: b.color };
    prevMax = b.maxAge;
    return item;
  });

  const noData = nodes.length - withLastHeard.length;
  if (noData > 0) {
    data.push({ name: 'Never', count: noData, color: 'hsl(222, 30%, 25%)' });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Last Seen Distribution</h3>
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