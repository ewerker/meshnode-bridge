import { useEffect, useState } from 'react';
import { Download, Cpu } from 'lucide-react';

export default function NodePollProgress({ active }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    setElapsed(0);
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const estimatedSeconds = 90;
  const percent = Math.min(95, Math.round((elapsed / estimatedSeconds) * 100));
  const listening = percent < 35;

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
              {listening ? 'Daten werden vom Broker gelesen' : 'Daten werden in 5er-Batches gespeichert'}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-primary whitespace-nowrap">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full bg-primary transition-all duration-300 ${listening ? '' : 'animate-pulse'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}