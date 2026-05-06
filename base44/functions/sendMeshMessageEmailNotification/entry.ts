import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OFFLINE_AFTER_SECONDS = 120;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const message = payload.data;

    if (!message || message.direction !== 'inbound') {
      return Response.json({ skipped: true, reason: 'Keine eingehende Nachricht' });
    }

    const isDm = message.to_node && message.to_node !== '^all';
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(user => user.node_id && user.node_id === message.gateway_node_id);
    const nowTs = Math.floor(Date.now() / 1000);
    let sent = 0;

    for (const user of recipients) {
      const setting = isDm
        ? (user.email_dm_notifications || 'never')
        : (user.email_group_notifications || 'never');

      if (setting === 'never') continue;

      const isOffline = !user.last_active || (nowTs - user.last_active) > OFFLINE_AFTER_SECONDS;
      if (setting === 'when_offline' && !isOffline) continue;

      const channelLabel = message.channel_name
        ? `${message.channel_name}${message.channel ? ` (${message.channel})` : ''}`
        : message.channel
          ? `Channel ${message.channel}`
          : 'Unbekannter Channel';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: isDm ? 'Neue Direktnachricht im Mesh Portal' : 'Neue Gruppennachricht im Mesh Portal',
        body: `Hallo ${user.full_name || user.email},\n\nDu erhältst diese automatische E-Mail, weil in deinen Portal-Einstellungen E-Mail-Benachrichtigungen für ${isDm ? 'Direktnachrichten' : 'Gruppennachrichten'} aktiviert sind.\n\nNachricht:\n${message.text || ''}\n\nDetails:\n- Typ: ${isDm ? 'Direktnachricht' : 'Gruppennachricht'}\n- Von Node: ${message.from_node || 'Unbekannt'}\n- An Node / Gateway: ${message.gateway_node_id || 'Unbekannt'}\n- Channel: ${channelLabel}\n- Status: ${message.status || 'received'}\n- Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}\n\nWarum bekommst du diese E-Mail?\nDiese Nachricht wurde im Mesh Portal empfangen und automatisch an dein Postfach weitergeleitet, weil deine Benachrichtigungseinstellung dies erlaubt.\n\nDiese E-Mail wurde automatisiert vom Mesh Portal versendet. Die Steuerung erfolgt über deine Einstellungen im Portal.\n\nViele Grüße\nMesh Portal`
      });
      sent++;
    }

    return Response.json({ success: true, sent, recipient_count: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});