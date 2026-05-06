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

  // Hide for non-admin users whose configured node_id differs from the admin's gateway node
  // (the auto-poll runs on the admin's gateway, so it's irrelevant for them).
  const userNode = currentUser?.node_id;
  const isAdmin = currentUser?.role === 'admin';
  if (!isAdmin && status.gateway_node_id && userNode && status.gateway_node_id !== userNode) {
    return null;
  }

  const skipped = status.skipped;
  const lastPolled = status.last_polled_at
    ? formatDistanceToNow(new Date(status.last_polled_at * 1000), { addSuffix: true })
    : '—';
  const lastRun = status.last_run_at
    ? formatDistanceToNow(new Date(status.last_run_at * 1000), { addSuffix: true })
    : '—';

  return (
    <div
      title={skipped
        ? `Auto-Poll pausiert${status.skip_reason ? ` · ${status.skip_reason}` : ''}`
        : `Auto-Poll aktiv · ${status.last_received ?? 0} empfangen ${lastPolled}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
      skipped
        ? 'bg-secondary border-border text-muted-foreground'
        : 'bg-primary/10 border-primary/30 text-primary'
    }`}>
      {skipped ? (
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <Wifi className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
      )}
      <span>{skipped ? 'paused' : 'live'}</span>
    </div>
  );
}