import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fromNode } = body;

    if (!fromNode) {
      return Response.json({ error: 'fromNode is required' }, { status: 400 });
    }

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const topic = `msh/EU_868/proxy/nodes/${fromNode}/all`;
    console.log('[NODES] subscribing to topic:', topic);

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = {
        clientId: `mesh_nodes_${Date.now()}`,
        connectTimeout: 10000,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      const client = mqtt.connect(brokerUrl, clientOpts);

      const timer = setTimeout(() => {
        client.end(true);
        resolve(collected);
      }, 30000);

      client.on('connect', () => {
        console.log('[NODES] connected, subscribing to', topic);
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timer);
            client.end(true);
            reject(err);
          }
        });
      });

      client.on('message', (t, msgBuf) => {
        try {
          const raw = msgBuf.toString();
          console.log('[NODES] received message, length:', raw.length);
          const parsed = JSON.parse(raw);
          collected.push(parsed);
          // Once we get the node list, we can disconnect
          clearTimeout(timer);
          client.end(true);
          resolve(collected);
        } catch (e) {
          console.log('[NODES] parse error:', e.message);
        }
      });

      client.on('error', (err) => {
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    if (messages.length === 0) {
      return Response.json({ success: true, updated: 0, created: 0, total: 0 });
    }

    const data = messages[0];
    const nodes = data.nodes || [];
    console.log('[NODES] received', nodes.length, 'nodes');

    let created = 0;
    let updated = 0;

    for (const node of nodes) {
      const record = {
        node_id: node.node_id,
        node_num: node.node_num,
        long_name: node.long_name || '',
        short_name: node.short_name || '',
        hw_model: node.hw_model || '',
        is_gateway: node.is_gateway || false,
        last_heard: node.last_heard || null,
        snr: node.snr || null,
        battery_level: node.battery_level || null,
        voltage: node.raw?.deviceMetrics?.voltage || null,
        latitude: node.latitude || null,
        longitude: node.longitude || null,
        altitude: node.altitude || null,
        channel_utilization: node.raw?.deviceMetrics?.channelUtilization || null,
        air_util_tx: node.raw?.deviceMetrics?.airUtilTx || null,
        uptime_seconds: node.raw?.deviceMetrics?.uptimeSeconds || null,
      };

      // Check if node already exists
      const existing = await base44.entities.MeshNode.filter({ node_id: node.node_id });
      if (existing.length > 0) {
        await base44.entities.MeshNode.update(existing[0].id, record);
        updated++;
      } else {
        await base44.entities.MeshNode.create(record);
        created++;
      }
    }

    return Response.json({ success: true, updated, created, total: nodes.length });
  } catch (error) {
    console.log('[NODES] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});