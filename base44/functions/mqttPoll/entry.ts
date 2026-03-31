import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listenSeconds, region, channel, sinceMinutes } = body;
    const listenTime = Math.min(listenSeconds || 5, 30) * 1000;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const regionStr = region || 'EU_868';
    const channelNum = channel !== undefined ? channel : 2;
    const topic = `msh/${regionStr}/${channelNum}/json/#`;

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
        console.log('[mqttPoll] Connected, subscribing to:', topic);
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            console.log('[mqttPoll] Subscribed successfully, listening for', listenTime, 'ms');
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('message', (t, msgBuf) => {
        const raw = msgBuf.toString();
        console.log('[mqttPoll] RAW message on topic:', t, '| payload:', raw.substring(0, 300));
        try {
          const parsed = JSON.parse(raw);
          if (parsed.from !== undefined && parsed.payload?.text) {
            collected.push({
              topic: t,
              payload: parsed,
              receivedAt: new Date().toISOString(),
            });
          } else {
            console.log('[mqttPoll] Skipped - from:', parsed.from, 'payload.text:', parsed.payload?.text);
          }
        } catch (_) {
          console.log('[mqttPoll] JSON parse error for:', raw.substring(0, 100));
        }
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Deduplicate: filter by sinceMinutes time window and known mesh IDs
    const windowMs = (sinceMinutes || 60) * 60 * 1000;
    const since = new Date(Date.now() - windowMs).toISOString();
    const recentRecords = await base44.entities.MeshMessage.filter({ direction: 'inbound' }, '-created_date', 500);
    const knownIds = new Set(recentRecords.filter(r => r.mesh_id).map(r => r.mesh_id));

    // Save received messages to DB
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;
      const topicParts = msg.topic.split('/');
      const channelNum = topicParts[2] || 'unknown';
      const meshId = p.id ? String(p.id) : null;

      // Skip if already stored (dedup by mesh_id)
      if (meshId && knownIds.has(meshId)) continue;

      // Skip if message timestamp is older than sinceMinutes window
      if (p.timestamp) {
        const msgTime = new Date(p.timestamp * 1000);
        if (msgTime < new Date(Date.now() - windowMs)) continue;
      }

      const record = await base44.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.payload.text,
        channel: channelNum,
        from_node: String(p.from),
        to_node: p.to === -1 ? '^all' : String(p.to),
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
        mesh_id: meshId,
      });
      saved.push(record);
    }

    return Response.json({ received: messages.length, saved: saved.length, messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});