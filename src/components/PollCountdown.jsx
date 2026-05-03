import { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';

export default function PollCountdown({ active, seconds = 30 }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 250);
    return () => clearInterval(interval);
  }, [active, seconds]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary/10 border-primary/30 text-primary text-xs">
      <Wifi className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
      <span className="hidden sm:inline">Empfange…</span>
      <span className="font-mono font-semibold">{remaining}s</span>
    </div>
  );
}