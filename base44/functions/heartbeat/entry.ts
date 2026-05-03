import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user) {
      // Set the timestamp using the server's clock to avoid client clock skew issues
      await base44.asServiceRole.entities.User.update(user.id, { 
        last_active: Math.floor(Date.now() / 1000) 
      });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});