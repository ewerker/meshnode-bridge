import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, channel, toNode, mode, hop_limit, want_ack } = body;

    // Generate unique client_ref only if ACK is wanted
    const wantAckFlag = want_ack !== undefined ? want_ack : true;
    const client_ref = wantAckFlag ? `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}` : null;

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const channelNum = typeof channel === 'string' ? parseInt(channel) : (channel !== undefined ? channel : 0);

    // Build topic from user's configured prefix
    const regionStr = user.region || 'EU_868';
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;

    let topic;
    if (mode === 'dm' && toNode) {
      topic = `${prefix}/send/direct/${toNode}`;
    } else {
      topic = `${prefix}/send/group/${channelNum}`;
    }

    // JSON payload with text, channel, hop_limit, want_ack, and optionally client_ref
    const payload = {
      text,
      channel: channelNum,
      hop_limit: hop_limit !== undefined ? hop_limit : 3,
      want_ack: wantAckFlag,
    };
    if (client_ref) payload.client_ref = client_ref;
    const payloadStr = JSON.stringify(payload);

    await new Promise((resolve, reject) => {
      const clientOpts = { clientId: `mesh_bridge_${Date.now()}` };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;
      clientOpts.connectTimeout = 10000;

      const client = mqtt.connect(brokerUrl, clientOpts);

      const timer = setTimeout(() => {
        client.end(true);
        reject(new Error('MQTT connection timeout'));
      }, 12000);

      client.on('connect', () => {
        client.publish(topic, payloadStr, { qos: 1 }, (err) => {
          clearTimeout(timer);
          client.end();
          if (err) reject(err);
          else resolve();
        });
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Save to DB with client_ref
    await base44.entities.MeshMessage.create({
      direction: 'outbound',
      text,
      channel: String(channelNum),
      from_node: '!gateway',
      to_node: toNode || '^all',
      mqtt_topic: topic,
      status: 'sent',
      raw_payload: payloadStr,
      ...(client_ref ? { client_ref } : {}),
    });

    return Response.json({ success: true, topic, payload: payloadStr, client_ref });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});