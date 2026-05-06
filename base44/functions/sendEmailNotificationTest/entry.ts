import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Automatische Benachrichtigung vom Mesh Portal',
      body: `Hallo ${user.full_name || user.email},\n\nDies ist eine automatisch erzeugte E-Mail vom Mesh Portal.\n\nWarum bekommst du diese E-Mail?\nDiese Nachricht prüft, ob der automatische E-Mail-Versand für spätere Meshtastic-Benachrichtigungen funktioniert.\n\nDetails:\n- Empfänger: ${user.email}\n- Nutzer: ${user.full_name || 'Unbekannt'}\n- Node-ID: ${user.node_id || 'Nicht gesetzt'}\n- Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}\n\nDiese E-Mail wurde automatisch vom System versendet. Bitte antworte nicht direkt auf diese Nachricht.\n\nViele Grüße\nMesh Portal`
    });

    return Response.json({ success: true, sent_to: user.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});