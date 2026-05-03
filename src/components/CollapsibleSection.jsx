import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ id, icon: Icon, title, defaultOpen = true, headerColorClass = 'text-muted-foreground', children }) {
  const storageKey = `section_open_${id}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return defaultOpen;
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(open));
  }, [open, storageKey]);

  return (
    <section className="bg-card rounded-2xl border border-border">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors rounded-2xl"
      >
        <h2 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${headerColorClass}`}>
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h2>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          {children}
        </div>
      )}
    </section>
  );
}