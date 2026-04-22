export default function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-secondary">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}