import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Persist a small batch of mesh nodes for the requesting user's gateway scope.
// Uses service role to bypass MeshNode RLS (update is admin-only) so any authenticated
// user can refresh their own gateway's node list.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fromNode, nodes, action, id, is_favorite } = body;
    const gateway = (fromNode || user.node_id || '').trim();
    if (!gateway) return Response.json({ error: 'Node-ID fehlt' }, { status: 400 });
    // Allow only own gateway scope (admins may target any).
    if (user.role !== 'admin' && gateway !== user.node_id) {
      return Response.json({ error: 'Forbidden: foreign gateway scope' }, { status: 403 });
    }

    // Lightweight favorite-toggle path — RLS-safe via service role for any authenticated user.
    if (action === 'toggle_favorite') {
      if (!id) return Response.json({ error: 'id fehlt' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.MeshNode.filter({ id });
      const target = existing[0];
      if (!target) return Response.json({ error: 'Node nicht gefunden' }, { status: 404 });
      if (user.role !== 'admin' && target.gateway_node_id !== user.node_id) {
        return Response.json({ error: 'Forbidden: foreign node' }, { status: 403 });
      }
      await base44.asServiceRole.entities.MeshNode.update(id, { is_favorite: !!is_favorite });
      return Response.json({ ok: true, is_favorite: !!is_favorite });
    }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return Response.json({ created: 0, updated: 0, errors: 0 });
    }

    const ids = nodes.map(n => n.node_id).filter(Boolean);
    const existing = ids.length
      ? await base44.asServiceRole.entities.MeshNode.filter({ gateway_node_id: gateway, node_id: { $in: ids } }, '-last_heard', 200)
      : [];
    const existingMap = {};
    for (const n of existing) existingMap[n.node_id] = n;

    let created = 0;
    let updated = 0;
    let errors = 0;
    const toCreate = [];

    for (const node of nodes) {
      if (!node?.node_id) continue;
      const isSelf = node.node_id === gateway;
      const record = {
        node_id: node.node_id,
        node_num: node.node_num,
        gateway_node_id: gateway,
        long_name: node.long_name || '',
        short_name: node.short_name || '',
        hw_model: node.hw_model || '',
        is_gateway: node.is_gateway || isSelf || false,
        last_heard: node.last_heard || null,
        snr: node.snr || null,
        battery_level: node.battery_level || null,
        voltage: node.raw?.deviceMetrics?.voltage || null,
        latitude: node.latitude || null,
        longitude: node.longitude || null,
        altitude: node.altitude || null,
        channel_utilization: node.raw?.deviceMetrics?.channelUtilization || null,
        air_util_tx: node.raw?.deviceMetrics?.airUtilTx || null,
        uptime_seconds: node.raw?.deviceMetrics?.uptimeSeconds || null,
      };
      const prev = existingMap[node.node_id];
      if (prev) {
        record.is_favorite = prev.is_favorite;
        record.is_manual = false;
        try {
          await base44.asServiceRole.entities.MeshNode.update(prev.id, record);
          updated++;
        } catch (e) {
          console.log('[NODES-UPSERT] update failed:', node.node_id, e.message);
          errors++;
        }
      } else {
        toCreate.push(record);
      }
    }

    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.MeshNode.bulkCreate(toCreate);
        created = toCreate.length;
      } catch (e) {
        console.log('[NODES-UPSERT] bulkCreate failed:', e.message);
        errors += toCreate.length;
      }
    }

    return Response.json({ created, updated, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});