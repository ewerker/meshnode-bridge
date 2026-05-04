import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Wifi, WifiOff, Clock, SkipForward } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AutoPollStatus({ currentUser }) {
  const [status, setStatus] = useState(null);

  // Load poll status (latest entry) and subscribe to updates
  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.PollStatus.filter({ key: 'auto_poll' }, '-created_date', 1);
      if (data.length > 0) setStatus(data[0]);
    };
    load();

    const unsub = base44.entities.PollStatus.subscribe((event) => {
      if (event.type === 'create' && event.data?.key === 'auto_poll') setStatus(event.data);
    });
    return unsub;
  }, []);

  if (!status) return null;

  const skipped = status.skipped;
  const lastPolled = status.last_polled_at
    ? formatDistanceToNow(new Date(status.last_polled_at * 1000), { addSuffix: true })
    : '—';
  const lastRun = status.last_run_at
    ? formatDistanceToNow(new Date(status.last_run_at * 1000), { addSuffix: true })
    : '—';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
      skipped
        ? 'bg-secondary border-border text-muted-foreground'
        : 'bg-primary/10 border-primary/30 text-primary'
    }`}>
      {skipped ? (
        <>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Auto-Poll pausiert</span>
          <span className="text-muted-foreground/70 hidden md:inline">· {status.skip_reason}</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
          <span className="hidden sm:inline">Auto-Poll aktiv</span>
          <span className="text-primary/70 hidden md:inline">· {status.last_received ?? 0} empfangen {lastPolled}</span>
        </>
      )}
    </div>
  );
}