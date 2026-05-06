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

      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px; margin: 0 auto;">
          <h2 style="margin: 0 0 16px; color: #0f766e;">Neue ${isDm ? 'Direktnachricht' : 'Gruppennachricht'} im Mesh Portal</h2>

          <p>Hallo ${user.full_name || user.email},</p>

          <p>
            du erhältst diese automatische E-Mail, weil in deinen Portal-Einstellungen
            E-Mail-Benachrichtigungen für <strong>${isDm ? 'Direktnachrichten' : 'Gruppennachrichten'}</strong> aktiviert sind.
          </p>

          <div style="background: #f9fafb; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 20px 0; white-space: pre-wrap;">
            ${message.text || ''}
          </div>

          <h3 style="margin: 24px 0 8px; color: #374151;">Details</h3>
          <ul style="padding-left: 20px; margin-top: 0;">
            <li><strong>Typ:</strong> ${isDm ? 'Direktnachricht' : 'Gruppennachricht'}</li>
            <li><strong>Von Node:</strong> ${message.from_node || 'Unbekannt'}</li>
            <li><strong>An Node / Gateway:</strong> ${message.gateway_node_id || 'Unbekannt'}</li>
            <li><strong>Channel:</strong> ${channelLabel}</li>
            <li><strong>Status:</strong> ${message.status || 'received'}</li>
            <li><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</li>
          </ul>

          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 16px; margin: 22px 0; color: #9a3412;">
            <strong>Wichtiger Hinweis:</strong><br>
            Bitte nutze nicht den automatisch angehängten Abmelde-Link am Ende dieser E-Mail, wenn du nur Mesh-Benachrichtigungen ändern möchtest.
            Stelle E-Mails stattdessen direkt im Portal unter <strong>Einstellungen → Nachrichten per E-Mail empfangen</strong> ein.
          </div>

          <p style="margin-top: 24px;">
            Warum bekommst du diese E-Mail?<br>
            Diese Nachricht wurde im Mesh Portal empfangen und automatisch an dein Postfach weitergeleitet, weil deine Benachrichtigungseinstellung dies erlaubt.
          </p>

          <p style="margin-top: 24px;">
            Viele Grüße<br>
            <strong>Mesh Portal</strong>
          </p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: isDm ? 'Neue Direktnachricht im Mesh Portal' : 'Neue Gruppennachricht im Mesh Portal',
        body: emailBody
      });
      sent++;
    }

    return Response.json({ success: true, sent, recipient_count: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});