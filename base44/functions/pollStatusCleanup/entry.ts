import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24h
const MAX_ENTRIES = 250;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAutomation = req.headers.get('x-base44-automation-id') !== null;

    if (!isAutomation) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const cutoff = Math.floor(Date.now() / 1000) - MAX_AGE_SECONDS;

    // Fetch newest first; anything beyond MAX_ENTRIES or older than cutoff gets removed.
    const all = await base44.asServiceRole.entities.PollStatus.list('-created_date', 1000);

    const toDelete = [];
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      const ageOk = (r.last_run_at || 0) >= cutoff;
      const indexOk = i < MAX_ENTRIES;
      if (!ageOk || !indexOk) toDelete.push(r);
    }

    let deleted = 0;
    for (const r of toDelete) {
      try {
        await base44.asServiceRole.entities.PollStatus.delete(r.id);
        deleted++;
      } catch (_) { /* skip */ }
    }

    console.log('[CLEANUP] deleted', deleted, 'of', all.length, 'poll log entries');
    return Response.json({ deleted, kept: all.length - deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});