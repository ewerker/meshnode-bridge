import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const nodeId = user.node_id;
    if (!nodeId) {
      return Response.json({ status: 'unknown', reason: 'no_node_id' });
    }

    // Region root, NOT topic_prefix (which often includes /proxy)
    const region = user.region || 'EU_868';
    const root = `msh/${region}`;

    const presenceTopic = `${root}/2/stat/${nodeId}`;
    const detailTopic = `${root}/proxy/status/${nodeId}`;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');
    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const result = await new Promise((resolve, reject) => {
      let presence = null;
      let detail = null;
      const clientOpts = {
        clientId: `mesh_status_${Date.now()}`,
        connectTimeout: 8000,
        clean: true,
        protocolVersion: 4,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      const client = mqtt.connect(brokerUrl, clientOpts);
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { client.end(true); } catch (_) { /* ignore */ }
        resolve({ presence, detail });
      };

      // Retained messages arrive immediately on subscribe — short window is enough
      const timer = setTimeout(finish, 4000);

      client.on('message', (t, msgBuf) => {
        const raw = msgBuf.toString();
        if (t === presenceTopic) {
          presence = raw.trim();
        } else if (t === detailTopic) {
          try { detail = JSON.parse(raw); } catch { detail = { raw }; }
        }
        // Once both retained messages are in, return early
        if (presence !== null && detail !== null) finish();
      });

      client.on('connect', () => {
        client.subscribe([presenceTopic, detailTopic], { qos: 0 }, (err) => {
          if (err) {
            clearTimeout(timer);
            try { client.end(true); } catch (_) { /* ignore */ }
            reject(err);
          }
        });
      });

      client.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          try { client.end(true); } catch (_) { /* ignore */ }
          reject(err);
        }
      });
    });

    const presence = result.presence;
    let status = 'offline';
    if (presence === 'online') status = 'online';
    else if (presence === 'broken') status = 'broken';
    else if (presence === 'offline') status = 'offline';
    else if (presence === null) status = 'unknown'; // no retained message at all

    return Response.json({
      status,
      presence,
      detail: result.detail,
      gateway_node_id: nodeId,
      topics: { presence: presenceTopic, detail: detailTopic },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});