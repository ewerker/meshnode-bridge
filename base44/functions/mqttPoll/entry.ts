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

    const regionStr = region || user.region || 'EU_868';
    // Build topics from user's configured prefix
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;
    const groupTopic = `${prefix}/rx/${nodeId}/scope/group`;
    const directTopic = `${prefix}/rx/${nodeId}/scope/dm`;
    console.log('[MQTT] params:', { region, listenSeconds, nodeId });
    console.log('[MQTT] subscribing to topics:', groupTopic, directTopic);

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = {
        clientId: `mesh_poll_${Date.now()}`,
        connectTimeout: 10000,
        clean: true,
        protocolVersion: 4,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      console.log('[MQTT] connecting to:', brokerUrl);
      const client = mqtt.connect(brokerUrl, clientOpts);

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        console.log('[MQTT] done, collected:', collected.length, 'messages');
        client.end(true);
        resolve(collected);
      };

      const timer = setTimeout(done, listenTime + 10000);

      // Register message handler BEFORE connect to not miss any messages
      client.on('message', (t, msgBuf) => {
        console.log('[MQTT] >>> message event on topic:', t);
        try {
          const raw = msgBuf.toString();
          console.log('[MQTT] raw payload:', raw.substring(0, 500));
          const parsed = JSON.parse(raw);
          const text = parsed.text || '';
          console.log('[MQTT] text:', text, '| from:', parsed.from_id, '| scope:', parsed.scope, '| portnum:', parsed.portnum);
          if (text && parsed.portnum === 'TEXT_MESSAGE_APP') {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
            console.log('[MQTT] collected total:', collected.length);
          }
        } catch (e) {
          console.log('[MQTT] parse error:', e.message, '| raw:', msgBuf.toString().substring(0, 200));
        }
      });

      client.on('connect', (connack) => {
        console.log('[MQTT] connected, connack:', JSON.stringify(connack));
        const topics = [groupTopic, directTopic];
        console.log('[MQTT] subscribing to:', topics);
        client.subscribe(topics, { qos: 1 }, (err, granted) => {
          if (err) {
            console.log('[MQTT] subscribe error:', err.message);
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            console.log('[MQTT] subscribe granted:', JSON.stringify(granted));
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('error', (err) => {
        console.log('[MQTT] client error:', err.message);
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });

      client.on('offline', () => console.log('[MQTT] client offline'));
      client.on('reconnect', () => console.log('[MQTT] reconnecting...'));
      client.on('close', () => console.log('[MQTT] connection closed'));
      client.on('disconnect', () => console.log('[MQTT] disconnected by broker'));
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

      const isDM = p.scope === 'dm';
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