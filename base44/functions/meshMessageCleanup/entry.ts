import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 1 week
const MAX_ENTRIES = 250;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const cutoff = Math.floor(Date.now() / 1000) - MAX_AGE_SECONDS;

    // Newest first; anything beyond MAX_ENTRIES or older than cutoff gets removed.
    const all = await base44.asServiceRole.entities.MeshMessage.list('-created_date', 2000);

    const toDelete = [];
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      const tsSec = r.meshtastic_timestamp
        || (r.created_date ? Math.floor(new Date(r.created_date.endsWith('Z') ? r.created_date : r.created_date + 'Z').getTime() / 1000) : 0);
      const ageOk = tsSec >= cutoff;
      const indexOk = i < MAX_ENTRIES;
      if (!ageOk || !indexOk) toDelete.push(r);
    }

    let deleted = 0;
    for (const r of toDelete) {
      try {
        await base44.asServiceRole.entities.MeshMessage.delete(r.id);
        deleted++;
      } catch (_) { /* skip */ }
    }

    console.log('[MSG-CLEANUP] deleted', deleted, 'of', all.length, 'messages');
    return Response.json({ deleted, kept: all.length - deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});