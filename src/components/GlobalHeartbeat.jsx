import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function GlobalHeartbeat() {
  useEffect(() => {
    let mounted = true;

    const sendHeartbeat = () => {
      if (!mounted) return;
      base44.auth.isAuthenticated().then(isAuth => {
        if (isAuth) {
          base44.functions.invoke('heartbeat').catch(() => {});
        }
      });
    };

    // Send immediately on mount, then on every interval
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000); // 60 seconds

    const onFocus = () => sendHeartbeat();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}