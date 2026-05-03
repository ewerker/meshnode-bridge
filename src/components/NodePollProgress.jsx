import { useEffect, useState } from 'react';
import { Download, Cpu } from 'lucide-react';

export default function NodePollProgress({ active, progress }) {
  if (!active) return null;

  const phase = progress?.phase || 'listening';
  const current = progress?.current || 0;
  const total = progress?.total || 0;
  const listening = phase === 'listening';
  
  let percent = 0;
  let statusText = 'Daten werden vom Broker gelesen';
  
  if (listening) {
    percent = 10;
  } else if (total > 0) {
    percent = Math.round((current / total) * 100);
    statusText = `${current} von ${total} Nodes gespeichert (in 5er Batches)`;
  }

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
              {statusText}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-primary whitespace-nowrap">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full bg-primary transition-all duration-300 ${listening ? 'animate-pulse' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}