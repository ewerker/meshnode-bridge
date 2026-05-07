import { useEffect, useState } from 'react';
import { Download, Cpu } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function NodePollProgress({ active, progress }) {
  const { language } = useLanguage();
  const isDe = language === 'de';
  if (!active) return null;

  const phase = progress?.phase || 'listening';
  const current = progress?.current || 0;
  const total = progress?.total || 0;
  const listening = phase === 'listening';
  
  let percent = 0;
  let statusText = isDe ? 'Daten werden vom Broker gelesen' : 'Reading data from broker';
  
  if (listening) {
    percent = 10;
  } else if (total > 0) {
    percent = Math.round((current / total) * 100);
    statusText = isDe ? `${current} von ${total} Nodes gespeichert (in 3er Batches)` : `${current} of ${total} nodes saved (in batches of 3)`;
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
              {listening ? (isDe ? 'Node-Daten werden empfangen…' : 'Receiving node data…') : (isDe ? 'Nodes werden verarbeitet…' : 'Processing nodes…')}
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