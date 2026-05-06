import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const nodes = await base44.asServiceRole.entities.MeshNode.list('-updated_date', 5000);
    const toDelete = nodes.filter(node => {
      const hasLastSeen = node.last_heard !== null && node.last_heard !== undefined;
      const isQuestionNode = (node.node_id || '').startsWith('?');
      const isQuestionGateway = (node.gateway_node_id || '').startsWith('?');
      return !hasLastSeen && !isQuestionNode && !isQuestionGateway;
    });

    for (const node of toDelete) {
      await base44.asServiceRole.entities.MeshNode.delete(node.id);
    }

    return Response.json({ success: true, checked: nodes.length, deleted: toDelete.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});