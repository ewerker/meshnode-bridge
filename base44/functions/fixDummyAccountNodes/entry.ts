import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const dummyUsers = users.filter(u => (u.node_id || '').startsWith('?'));
    const ownerByGateway = new Map(dummyUsers.map(u => [u.node_id, u.email]));

    const allNodes = await base44.asServiceRole.entities.MeshNode.list('-updated_date', 3000);
    const namesByNodeId = new Map();
    for (const node of allNodes) {
      if (!node.node_id) continue;
      if ((node.long_name || node.short_name) && !namesByNodeId.has(node.node_id)) {
        namesByNodeId.set(node.node_id, {
          long_name: node.long_name || '',
          short_name: node.short_name || '',
        });
      }
    }

    let updated = 0;
    for (const node of allNodes) {
      if (!ownerByGateway.has(node.gateway_node_id)) continue;
      const known = namesByNodeId.get(node.node_id) || {};
      const patch = {
        is_manual: true,
        owner_email: ownerByGateway.get(node.gateway_node_id),
      };
      if (!node.long_name && known.long_name) patch.long_name = known.long_name;
      if (!node.short_name && known.short_name) patch.short_name = known.short_name;

      await base44.asServiceRole.entities.MeshNode.update(node.id, patch);
      updated++;
    }

    return Response.json({ success: true, dummy_users: dummyUsers.length, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});