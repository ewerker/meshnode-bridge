import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, channel, toNode, mode } = body;

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

    let topic;
    if (mode === 'dm' && toNode) {
      // DM: msh/EU_868/proxy/send/direct/{nodeId}
      topic = `msh/EU_868/proxy/send/direct/${toNode}`;
    } else {
      // Channel: msh/EU_868/proxy/send/group/{channel}
      topic = `msh/EU_868/proxy/send/group/${channelNum}`;
    }

    // Payload is plain text, no JSON wrapping
    const payloadStr = text;

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

    // Save to DB
    await base44.entities.MeshMessage.create({
      direction: 'outbound',
      text,
      channel: String(channelNum),
      from_node: '!gateway',
      to_node: toNode || '^all',
      mqtt_topic: topic,
      status: 'sent',
      raw_payload: payloadStr,
    });

    return Response.json({ success: true, topic, payload: payloadStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});