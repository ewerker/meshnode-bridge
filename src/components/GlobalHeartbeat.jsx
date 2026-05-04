import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function GlobalHeartbeat() {
  useEffect(() => {
    let mounted = true;
    let lastActivityTime = Date.now();

    const updateActivity = () => {
      lastActivityTime = Date.now();
    };

    // Track actual user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    const sendHeartbeat = () => {
      if (!mounted) return;
      
      const isVisible = document.visibilityState === 'visible';
      const isRecentlyActive = (Date.now() - lastActivityTime) < 5 * 60 * 1000; // 5 minutes max idle time
      
      if (isVisible && isRecentlyActive) {
        base44.auth.isAuthenticated().then(isAuth => {
          if (isAuth) {
            base44.functions.invoke('heartbeat').catch(() => {});
          }
        });
      }
    };

    // Send immediately on mount, then on every interval
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000); // 60 seconds

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);

  return null;
}