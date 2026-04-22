import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = [
  'hsl(186, 100%, 42%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)', 'hsl(45, 90%, 50%)',
  'hsl(200, 70%, 50%)', 'hsl(120, 50%, 45%)',
];

export default function HardwareChart({ nodes }) {
  const hwCount = {};
  nodes.forEach(n => {
    const hw = n.hw_model || 'Unknown';
    hwCount[hw] = (hwCount[hw] || 0) + 1;
  });

  const data = Object.entries(hwCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Hardware Models</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(210, 20%, 45%)' }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'hsl(210, 40%, 92%)' }} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 47%, 7%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 40%, 92%)' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}