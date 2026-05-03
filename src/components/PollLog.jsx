import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, SkipForward, ScrollText } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function PollLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.PollStatus.list('-created_date', PAGE_SIZE);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.PollStatus.subscribe((event) => {
      if (event.type === 'create') {
        setLogs(prev => [event.data, ...prev].slice(0, PAGE_SIZE));
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ScrollText className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-xs">No poll runs yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log) => {
        const labels = {
          auto_poll: 'Auto',
          manual_poll: 'Manual',
          initial_poll: 'Initial',
        };
        const label = labels[log.key] || 'Poll';
        const ts = log.last_run_at
          ? format(new Date(log.last_run_at * 1000), 'HH:mm:ss')
          : log.created_date
          ? format(new Date(log.created_date.endsWith('Z') ? log.created_date : log.created_date + 'Z'), 'HH:mm:ss')
          : '—';
        const date = log.last_run_at
          ? format(new Date(log.last_run_at * 1000), 'dd.MM.')
          : '';

        return (
          <div
            key={log.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
              log.skipped
                ? 'bg-secondary/50 border-border'
                : 'bg-primary/5 border-primary/20'
            }`}
          >
            <div className="flex-shrink-0">
              {log.skipped ? (
                <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
              {label}
            </span>
            <span className="font-mono text-muted-foreground whitespace-nowrap">
              {date} {ts}
            </span>
            <span className="flex-1 text-foreground truncate">
              {log.skipped ? (
                <span className="text-muted-foreground">Skipped · {log.skip_reason}</span>
              ) : (
                <>
                  <span className="text-primary font-medium">{log.last_received ?? 0} received</span>
                  <span className="text-muted-foreground"> · {log.last_saved ?? 0} saved</span>
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}