import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONTACT_EMAIL = 'richter@w-2.de';

function clean(value) {
  return String(value || '').trim().slice(0, 2000);
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const name = clean(payload.name);
    const phone = clean(payload.phone);
    const message = clean(payload.message);

    if (!name || !phone || !message) {
      return Response.json({ error: 'Name, Telefon und Anliegen sind erforderlich.' }, { status: 400 });
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px; margin: 0 auto;">
        <h2 style="margin: 0 0 16px; color: #0f766e;">Neue Kontaktanfrage vom Meshtastic Portal</h2>
        <p>Über die Startseite wurde eine neue Kontaktanfrage gesendet.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Anliegen:</strong></p>
          <div style="white-space: pre-wrap; background: #ffffff; border-left: 4px solid #0f766e; padding: 12px 14px;">${escapeHtml(message)}</div>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Zeitpunkt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: CONTACT_EMAIL,
      subject: `Kontaktanfrage Meshtastic Portal: ${name}`,
      body: emailBody,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});