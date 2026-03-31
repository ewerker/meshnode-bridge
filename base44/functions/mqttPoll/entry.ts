import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { channel, listenSeconds } = body;
    const listenTime = Math.min(listenSeconds || 5, 15) * 1000;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const subscribeChannel = channel || '#';
    const topic = `msh/2/json/${subscribeChannel}`;

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
          const parsed = JSON.parse(raw);
          if (parsed.type === 'text' && parsed.payload?.text) {
            collected.push({
              topic: t,
              payload: parsed,
              receivedAt: new Date().toISOString(),
            });
          }
        } catch (_) {
          // skip malformed
        }
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Save received messages to DB
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;
      const topicParts = msg.topic.split('/');
      const channelName = topicParts[3] || 'unknown';

      const record = await base44.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.payload?.text || '',
        channel: channelName,
        from_node: p.sender || String(p.from) || 'unknown',
        to_node: p.to === -1 ? '^all' : String(p.to),
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
      });
      saved.push(record);
    }

    return Response.json({ received: messages.length, saved: saved.length, messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});