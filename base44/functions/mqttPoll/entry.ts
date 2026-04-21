import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listenSeconds, region } = body;
    const listenTime = (listenSeconds || 298) * 1000;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    // Get user's node_id for the proxy rx topic
    const nodeId = user.node_id;
    if (!nodeId) {
      return Response.json({ error: 'Node-ID nicht in Einstellungen gesetzt' }, { status: 400 });
    }

    const regionStr = region || 'EU_868';
    // Subscribe to both group and direct messages
    const groupTopic = `msh/${regionStr}/proxy/rx/${nodeId}/scope/group`;
    const directTopic = `msh/${regionStr}/proxy/rx/${nodeId}/scope/direct`;
    console.log('[MQTT] params:', { region, listenSeconds, nodeId });
    console.log('[MQTT] subscribing to topics:', groupTopic, directTopic);

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
        console.log('[MQTT] connected, subscribing...');
        client.subscribe([groupTopic, directTopic], { qos: 1 }, (err) => {
          if (err) {
            console.log('[MQTT] subscribe error:', err.message);
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            console.log('[MQTT] subscribed, listening...');
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('message', (t, msgBuf) => {
        console.log('[MQTT] message event fired');
        try {
          const raw = msgBuf.toString();
          console.log('[MQTT] msg:', t, raw.substring(0, 500));
          const parsed = JSON.parse(raw);
          // Proxy format: flat object with text, from_id, scope, packet_id, etc.
          const text = parsed.text || '';
          console.log('[MQTT] parsed text:', text, '| from:', parsed.from_id, '| scope:', parsed.scope);
          if (text && parsed.portnum === 'TEXT_MESSAGE_APP') {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
            console.log('[MQTT] added to collected, total:', collected.length);
          }
        } catch (e) {
          console.log('[MQTT] parse error:', e.message);
        }
      });

      client.on('error', (err) => {
        console.log('[MQTT] client error:', err.message);
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });

      client.on('offline', () => {
        console.log('[MQTT] client offline');
      });
    });

    // Save received messages to DB (skip duplicates by packet_id)
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;

      // Use packet_id as unique message ID
      const msgId = p.packet_id !== undefined ? String(p.packet_id) : null;

      if (msgId) {
        const existing = await base44.entities.MeshMessage.filter({ message_id: msgId });
        if (existing.length > 0) continue; // already saved
      }

      const isDM = p.scope === 'direct';
      const channelStr = p.channel !== null && p.channel !== undefined ? String(p.channel) : '';

      const record = await base44.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.text || '',
        channel: channelStr,
        from_node: p.from_id || '',
        to_node: isDM ? (nodeId || '') : (p.to_id || '^all'),
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
        message_id: msgId || undefined,
        meshtastic_timestamp: p.mirrored_at || undefined,
      });
      saved.push(record);
    }

    return Response.json({ received: messages.length, saved: saved.length, messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});