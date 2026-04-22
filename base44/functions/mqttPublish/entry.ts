import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, channel, toNode, mode, hop_limit, want_ack } = body;

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }

    const wantAckFlag = want_ack !== undefined ? want_ack : true;
    const client_ref = wantAckFlag ? `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}` : null;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const channelNum = typeof channel === 'string' ? parseInt(channel) : (channel !== undefined ? channel : 0);
    const regionStr = user.region || 'EU_868';
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;

    let topic;
    if (mode === 'dm' && toNode) {
      topic = `${prefix}/send/direct/${toNode}`;
    } else {
      topic = `${prefix}/send/group/${channelNum}`;
    }

    const payload = {
      text,
      channel: channelNum,
      hop_limit: hop_limit !== undefined ? hop_limit : 3,
      want_ack: wantAckFlag,
    };
    if (client_ref) payload.client_ref = client_ref;
    const payloadStr = JSON.stringify(payload);

    // If no ACK wanted, just publish and return
    if (!wantAckFlag) {
      await publishOnly(brokerUrl, username, password, topic, payloadStr);
      await base44.entities.MeshMessage.create({
        direction: 'outbound',
        text,
        channel: String(channelNum),
        from_node: user.node_id || '!gateway',
        to_node: toNode || '^all',
        mqtt_topic: topic,
        status: 'sent',
        raw_payload: payloadStr,
      });
      return Response.json({ success: true, topic, client_ref: null });
    }

    // With ACK: subscribe to ACK topic FIRST, then publish, then wait for ACK
    const ackTopic = `${prefix}/ack/${client_ref}`;
    const ACK_TIMEOUT_MS = 70000;

    console.log('[PUB+ACK] publish topic:', topic);
    console.log('[PUB+ACK] ack topic:', ackTopic);

    const result = await new Promise((resolve, reject) => {
      const clientOpts = {
        clientId: `mesh_pub_ack_${Date.now()}`,
        connectTimeout: 10000,
        clean: true,
        protocolVersion: 4,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      const client = mqtt.connect(brokerUrl, clientOpts);
      let finished = false;

      const finish = (data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { client.end(true); } catch (_) { /* ignore */ }
        resolve(data);
      };

      const timer = setTimeout(() => {
        console.log('[PUB+ACK] timeout, no ACK received');
        finish({ published: true, final_status: 'sent', ack_messages: [] });
      }, ACK_TIMEOUT_MS);

      const ackMessages = [];

      client.on('message', (t, msgBuf) => {
        try {
          const raw = msgBuf.toString();
          console.log('[PUB+ACK] ACK message:', raw.substring(0, 500));
          const parsed = JSON.parse(raw);
          ackMessages.push(parsed);

          const finalStatuses = ['ack', 'implicit_ack', 'nak'];
          if (finalStatuses.includes(parsed.status)) {
            console.log('[PUB+ACK] final ACK status:', parsed.status);
            let status = 'sent';
            if (parsed.status === 'nak') status = 'failed';
            else if (parsed.status === 'ack') status = 'acked';
            else if (parsed.status === 'implicit_ack') status = 'implicit_ack';
            finish({ published: true, final_status: status, ack_messages: ackMessages });
          }
        } catch (e) {
          console.log('[PUB+ACK] parse error:', e.message);
        }
      });

      client.on('connect', () => {
        console.log('[PUB+ACK] connected');
        // Subscribe to ACK topic FIRST
        client.subscribe(ackTopic, { qos: 1 }, (err) => {
          if (err) {
            console.log('[PUB+ACK] subscribe error:', err.message);
            clearTimeout(timer);
            try { client.end(true); } catch (_) { /* ignore */ }
            reject(err);
            return;
          }
          console.log('[PUB+ACK] subscribed to ACK, now publishing...');
          // THEN publish the message
          client.publish(topic, payloadStr, { qos: 1 }, (pubErr) => {
            if (pubErr) {
              console.log('[PUB+ACK] publish error:', pubErr.message);
              clearTimeout(timer);
              try { client.end(true); } catch (_) { /* ignore */ }
              reject(pubErr);
            } else {
              console.log('[PUB+ACK] published, waiting for ACK...');
            }
          });
        });
      });

      client.on('error', (err) => {
        console.log('[PUB+ACK] client error:', err.message);
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          try { client.end(true); } catch (_) { /* ignore */ }
          reject(err);
        }
      });
    });

    // Save message to DB with final status
    await base44.entities.MeshMessage.create({
      direction: 'outbound',
      text,
      channel: String(channelNum),
      from_node: user.node_id || '!gateway',
      to_node: toNode || '^all',
      mqtt_topic: topic,
      status: result.final_status,
      raw_payload: payloadStr,
      client_ref,
    });

    return Response.json({
      success: true,
      topic,
      client_ref,
      final_status: result.final_status,
      ack_messages: result.ack_messages,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function publishOnly(brokerUrl, username, password, topic, payloadStr) {
  return new Promise((resolve, reject) => {
    const clientOpts = { clientId: `mesh_pub_${Date.now()}`, connectTimeout: 10000 };
    if (username) clientOpts.username = username;
    if (password) clientOpts.password = password;
    const client = mqtt.connect(brokerUrl, clientOpts);
    const timer = setTimeout(() => { client.end(true); reject(new Error('MQTT timeout')); }, 12000);
    client.on('connect', () => {
      client.publish(topic, payloadStr, { qos: 1 }, (err) => {
        clearTimeout(timer);
        client.end();
        if (err) reject(err); else resolve();
      });
    });
    client.on('error', (err) => { clearTimeout(timer); client.end(true); reject(err); });
  });
}