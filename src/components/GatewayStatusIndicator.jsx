import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  online: {
    dot: 'bg-emerald-400',
    ring: 'bg-emerald-400/40',
    text: 'text-emerald-400',
    label: 'online',
    pulse: true,
  },
  broken: {
    dot: 'bg-yellow-400',
    ring: 'bg-yellow-400/40',
    text: 'text-yellow-400',
    label: 'broken',
    pulse: true,
  },
  offline: {
    dot: 'bg-red-500',
    ring: 'bg-red-500/30',
    text: 'text-red-500',
    label: 'offline',
    pulse: false,
  },
  unknown: {
    dot: 'bg-muted-foreground',
    ring: 'bg-muted-foreground/30',
    text: 'text-muted-foreground',
    label: 'unknown',
    pulse: false,
  },
};

export default function GatewayStatusIndicator({ nodeName, nodeId }) {
  const [status, setStatus] = useState('unknown');
  const [detail, setDetail] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!nodeId) return;
    try {
      const res = await base44.functions.invoke('mqttGatewayStatus', {});
      setStatus(res.data?.status || 'unknown');
      setDetail(res.data?.detail || null);
    } catch (_) {
      setStatus('unknown');
    }
  }, [nodeId]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const reasons = Array.isArray(detail?.reasons) && detail.reasons.length > 0
    ? detail.reasons.join(', ')
    : null;
  const tooltip = `Gateway ${cfg.label}${reasons ? ` — ${reasons}` : ''}`;

  return (
    <span
      className="inline-flex items-center gap-2 cursor-help"
      title={tooltip}
      onClick={fetchStatus}
    >
      <span className="relative inline-flex items-center justify-center w-2.5 h-2.5">
        {cfg.pulse && (
          <span className={`absolute inline-flex w-full h-full rounded-full ${cfg.ring} animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${cfg.dot}`} />
      </span>
      <span className={`font-bold tracking-tight ${cfg.text}`}>
        {nodeName || 'Meshtastic MQTT Bridge'}
      </span>
    </span>
  );
}