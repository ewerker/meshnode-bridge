import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load settings from first UserSettings record (service role, no user auth needed for scheduled call)
    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const settings = allSettings[0];

    // If background polling is disabled, exit early
    if (!settings || settings.bg_enabled === false) {
      return Response.json({ skipped: true, reason: 'Background polling disabled' });
    }

    // Check interval: skip if last poll was too recent
    const intervalMinutes = settings.bg_poll_interval ?? 5;
    if (settings.bg_last_poll) {
      const lastPoll = new Date(settings.bg_last_poll);
      const minutesSince = (Date.now() - lastPoll.getTime()) / 60000;
      if (minutesSince < intervalMinutes - 0.5) {
        return Response.json({ skipped: true, reason: `Next poll in ${Math.ceil(intervalMinutes - minutesSince)} min` });
      }
    }

    // Update last poll timestamp
    await base44.asServiceRole.entities.UserSettings.update(settings.id, { bg_last_poll: new Date().toISOString() });

    const regionStr = settings.bg_region || settings.region || 'EU_868';
    const channelNum = settings.bg_channel !== undefined ? settings.bg_channel : (settings.default_channel !== undefined ? settings.default_channel : 2);
    const listenTime = (settings.bg_listen_seconds || 298) * 1000;
    const topic = `msh/${regionStr}/${channelNum}/json/#`;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = { clientId: `mesh_bg_${Date.now()}` };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;
      clientOpts.connectTimeout = 10000;

      const client = mqtt.connect(brokerUrl, clientOpts);

      const done = () => {
        client.end(true);
        resolve(collected);
      };

      const timer = setTimeout(done, listenTime + 10000);

      client.on('connect', () => {
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('message', (t, msgBuf) => {
        try {
          const raw = msgBuf.toString();
          const parsed = JSON.parse(raw);
          if (parsed.from !== undefined && parsed.payload?.text) {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
          }
        } catch (_) {}
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Save new messages (skip duplicates)
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;
      const topicParts = msg.topic.split('/');
      const ch = topicParts[2] || 'unknown';
      const msgId = p.id !== undefined ? String(p.id) : null;

      if (msgId) {
        const existing = await base44.asServiceRole.entities.MeshMessage.filter({ message_id: msgId });
        if (existing.length > 0) continue;
      }

      const record = await base44.asServiceRole.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.payload.text,
        channel: ch,
        from_node: String(p.from),
        to_node: p.to === -1 ? '^all' : String(p.to),
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
        message_id: msgId || undefined,
      });
      saved.push(record);
    }

    return Response.json({ received: messages.length, saved: saved.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});