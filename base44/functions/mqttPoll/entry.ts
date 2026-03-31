import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listenSeconds, region, channel } = body;
    const listenTime = (listenSeconds || 298) * 1000;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const regionStr = region || 'EU_868';
    const channelNum = channel !== undefined ? channel : 2;
    const topic = `msh/${regionStr}/${channelNum}/json`;
    console.log('[MQTT] params:', { region, channel, listenSeconds });
    console.log('[MQTT] subscribing to topic:', topic);

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = { clientId: `mesh_poll_${Date.now()}` };
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
          console.log('[MQTT] msg:', t, raw.substring(0, 300));
          const parsed = JSON.parse(raw);
          const text = parsed.payload?.text;
          if (text) {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
          }
        } catch (e) {
          console.log('[MQTT] parse error:', e.message);
        }
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Save received messages to DB (skip duplicates by message_id)
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;
      const topicParts = msg.topic.split('/');
      const channelNum = topicParts[2] || 'unknown';

      // Build a unique ID from the Meshtastic packet id field if available
      const msgId = p.id !== undefined ? String(p.id) : null;

      if (msgId) {
        const existing = await base44.entities.MeshMessage.filter({ message_id: msgId });
        if (existing.length > 0) continue; // already saved
      }

      const record = await base44.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.payload?.text || '',
        channel: channelNum,
        from_node: String(p.from),
        to_node: p.to === -1 ? '^all' : String(p.to),
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
        message_id: msgId || undefined,
        meshtastic_timestamp: p.timestamp || undefined,
      });
      saved.push(record);
    }

    return Response.json({ received: messages.length, saved: saved.length, messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});