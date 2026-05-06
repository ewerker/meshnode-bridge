import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// CRUD for user-created mesh nodes (is_manual=true).
// Owner (created_by === user.email) or admin may update/delete.
// Anyone authenticated may create. The active gateway is taken from the caller's user.node_id.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, id, node_id, short_name, long_name } = body;

    if (action === 'create') {
      const cleanId = (node_id || '').trim();
      if (!cleanId) return Response.json({ error: 'node_id required' }, { status: 400 });
      if (!/^[!?][0-9a-fA-F]+$/.test(cleanId)) {
        return Response.json({ error: 'Format: ! oder ? gefolgt von Hex-Ziffern' }, { status: 400 });
      }
      if (!user.node_id) return Response.json({ error: 'Eigene Node-ID nicht in Settings gesetzt' }, { status: 400 });

      // Dummy nodes (?…) only exist as actual portal users — refuse creation
      // of non-existing ?-IDs to prevent the system from accumulating garbage.
      if (cleanId.startsWith('?')) {
        const portalMatches = await base44.asServiceRole.entities.User.filter({ node_id: cleanId });
        if (portalMatches.length === 0) {
          return Response.json({
            error: 'Kein Portal-Nutzer mit dieser ?-ID gefunden. Dummy-Nodes müssen einem registrierten Portal-Nutzer entsprechen.'
          }, { status: 404 });
        }
      }

      // Prevent duplicates within the same gateway scope
      const existing = await base44.asServiceRole.entities.MeshNode.filter({
        node_id: cleanId,
        gateway_node_id: user.node_id,
      });
      if (existing.length > 0) {
        return Response.json({ error: 'Node mit dieser ID existiert bereits' }, { status: 409 });
      }

      const created = await base44.asServiceRole.entities.MeshNode.create({
        node_id: cleanId,
        gateway_node_id: user.node_id,
        owner_email: user.email,
        short_name: (short_name || '').trim(),
        long_name: (long_name || '').trim(),
        is_manual: true,
      });
      return Response.json({ success: true, node: created });
    }

    if (action === 'update' || action === 'delete') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const records = await base44.asServiceRole.entities.MeshNode.filter({ id });
      const node = records[0];
      if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });
      if (!node.is_manual) return Response.json({ error: 'Nur manuell angelegte Nodes können bearbeitet werden' }, { status: 403 });

      const isOwner = node.owner_email === user.email || (!node.owner_email && node.gateway_node_id === user.node_id);
      const isAdmin = user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return Response.json({ error: 'Forbidden: nicht der Eigentümer' }, { status: 403 });
      }

      if (action === 'update') {
        const updated = await base44.asServiceRole.entities.MeshNode.update(id, {
          short_name: (short_name ?? node.short_name ?? '').trim(),
          long_name: (long_name ?? node.long_name ?? '').trim(),
        });
        return Response.json({ success: true, node: updated });
      }

      await base44.asServiceRole.entities.MeshNode.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});