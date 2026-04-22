import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find the admin user to read their settings (node_id, region, topic_prefix)
    const users = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (!users || users.length === 0) {
      return Response.json({ error: 'No admin user found' }, { status: 500 });
    }
    const admin = users[0];

    const nodeId = admin.node_id;
    if (!nodeId) {
      return Response.json({ error: 'Admin has no node_id configured' }, { status: 400 });
    }

    const regionStr = admin.region || 'EU_868';
    const prefix = admin.topic_prefix || `msh/${regionStr}/proxy`;
    const wildcardTopic = `${prefix}/rx/${nodeId}/#`;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    // Listen for 4.5 minutes (to fit within 5-min schedule with margin)
    const listenTime = 270000;

    console.log('[MQTT-AUTO] subscribing to:', wildcardTopic);

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = {
        clientId: `mesh_auto_${Date.now()}`,
        connectTimeout: 10000,
        clean: true,
        protocolVersion: 4,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      const client = mqtt.connect(brokerUrl, clientOpts);

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        console.log('[MQTT-AUTO] done, collected:', collected.length, 'messages');
        client.end(true);
        resolve(collected);
      };

      const timer = setTimeout(done, listenTime + 10000);

      client.on('message', (t, msgBuf) => {
        try {
          const raw = msgBuf.toString();
          const parsed = JSON.parse(raw);
          const text = parsed.text || '';
          if (text && parsed.portnum === 'TEXT_MESSAGE_APP') {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
            console.log('[MQTT-AUTO] collected:', text, 'from:', parsed.from_id);
          }
        } catch (e) {
          console.log('[MQTT-AUTO] parse error:', e.message);
        }
      });

      client.on('connect', () => {
        console.log('[MQTT-AUTO] connected');
        client.subscribe(wildcardTopic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            console.log('[MQTT-AUTO] subscribed, listening for', listenTime / 1000, 'seconds');
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('error', (err) => {
        console.log('[MQTT-AUTO] error:', err.message);
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Save received messages (skip duplicates by packet_id) using service role
    let savedCount = 0;
    for (const msg of messages) {
      const p = msg.payload;
      const msgId = p.packet_id !== undefined ? String(p.packet_id) : null;

      if (msgId) {
        const existing = await base44.asServiceRole.entities.MeshMessage.filter({ message_id: msgId });
        if (existing.length > 0) continue;
      }

      const isDM = p.scope === 'dm';
      const channelStr = p.channel !== null && p.channel !== undefined ? String(p.channel) : '';

      await base44.asServiceRole.entities.MeshMessage.create({
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
      savedCount++;
    }

    console.log('[MQTT-AUTO] saved:', savedCount, 'of', messages.length);
    return Response.json({ received: messages.length, saved: savedCount });
  } catch (error) {
    console.log('[MQTT-AUTO] fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});