import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Use service role to bypass RLS — every authenticated user may see portal recipients
    const users = await base44.asServiceRole.entities.User.list();
    const portalUsers = users
      .filter(u => u.node_id && u.id !== user.id)
      .map(u => ({
        id: u.id,
        node_id: u.node_id,
        long_name: u.full_name || u.email,
      }));

    return Response.json({ users: portalUsers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});