import { useEffect, useState } from 'react';
import { Download, Cpu } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function NodePollProgress({ active }) {
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!active) {
      setStatus(null);
      return;
    }
    
    base44.entities.PollStatus.filter({ key: 'manual_nodes_poll' }, '-created_date', 1).then(res => {
      if (res.length > 0 && active) {
        setStatus(res[0]);
      }
    });

    const unsub = base44.entities.PollStatus.subscribe((event) => {
      if (event.data?.key === 'manual_nodes_poll' || event.data?.key === 'daily_nodes_poll') {
        setStatus(event.data);
      }
    });

    setElapsed(0);
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [active]);

  if (!active) return null;

  const total = status?.last_received || 0;
  const processed = status?.last_saved || 0;
  const isProcessing = status?.skip_reason === 'Processing...' || (total > 0 && processed > 0) || (status?.last_polled_at && total > 0);
  const listening = !isProcessing;

  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="bg-card border border-primary/30 rounded-lg px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {listening ? (
            <Download className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
          ) : (
            <Cpu className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              {listening ? 'Node-Daten werden empfangen…' : 'Nodes werden verarbeitet…'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {listening ? `Warten auf Broker (${elapsed}s)` : `${processed} von ${total} Nodes gespeichert`}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-primary whitespace-nowrap">{listening ? `${elapsed}s` : `${percent}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full bg-primary transition-all duration-300 ${listening ? 'animate-pulse w-full opacity-30' : ''}`}
          style={{ width: listening ? '100%' : `${percent}%` }}
        />
      </div>
    </div>
  );
}