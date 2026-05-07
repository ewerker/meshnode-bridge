import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, SkipForward, ScrollText } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function PollLog({ onCountChange }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const { language } = useLanguage();
  const isDe = language === 'de';

  const load = async () => {
    const data = await base44.entities.PollStatus.list('-created_date', 1000);
    setLogs(data);
    onCountChange?.(data.length);
    setLoading(false);
  };

  useEffect(() => {
    load();
    let timer = null;
    const unsub = base44.entities.PollStatus.subscribe(() => {
      // Debounce subscription updates so bursts of poll-status changes
      // collapse into a single list reload (avoids rate-limit errors).
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; load(); }, 1500);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub?.();
    };
  }, []);

  useEffect(() => { setPage(1); }, [pageSize]);

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
        <p className="text-xs">{isDe ? 'Noch keine Poll-Läufe' : 'No poll runs yet'}</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const visibleLogs = logs.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-1.5">
      {visibleLogs.map((log) => {
        const labels = {
          auto_poll: 'Auto 5m',
          offline_poll: 'Offline 1h',
          manual_poll: isDe ? 'Manuell' : 'Manual',
          initial_poll: isDe ? 'Initial' : 'Initial',
          manual_nodes_poll: 'Nodes',
          daily_nodes_poll: isDe ? 'Nodes täglich' : 'Nodes daily',
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
            {log.gateway_node_id && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-primary border border-border whitespace-nowrap" title="Aktive Gateway-Node-ID">
                {log.gateway_node_id}
              </span>
            )}
            <span className="flex-1 text-foreground truncate">
              {log.skipped ? (
                <span className="text-muted-foreground">{isDe ? 'Übersprungen' : 'Skipped'} · {log.skip_reason}</span>
              ) : (
                <>
                  <span className="text-primary font-medium">{log.last_received ?? 0} {isDe ? 'empfangen' : 'received'}</span>
                  <span className="text-muted-foreground"> · {log.last_saved ?? 0} {isDe ? 'gespeichert' : 'saved'}</span>
                  {log.gateway_status && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                        log.gateway_status === 'online' ? 'bg-emerald-400' :
                        log.gateway_status === 'broken' ? 'bg-yellow-400' :
                        log.gateway_status === 'offline' ? 'bg-red-500' :
                        'bg-muted-foreground'
                      }`} />
                      <span className="text-muted-foreground">
                        {isDe ? 'gw' : 'gw'} {log.gateway_status}
                        {log.gateway_reasons ? ` (${log.gateway_reasons})` : ''}
                      </span>
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-border flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isDe ? 'Pro Seite:' : 'Per page:'}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-2">
            {startIdx + 1}–{Math.min(startIdx + pageSize, logs.length)} {isDe ? 'von' : 'of'} {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
          >
            ← {isDe ? 'Zurück' : 'Prev'}
          </button>
          <span className="text-xs text-muted-foreground">
            {isDe ? 'Seite' : 'Page'} {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
          >
            {isDe ? 'Weiter' : 'Next'} →
          </button>
        </div>
      </div>
    </div>
  );
}