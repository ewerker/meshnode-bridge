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

    const regionStr = user.region || 'EU_868';
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;
    const topic = `${prefix}/nodes/${fromNode}/all`;
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
      return Response.json({ success: true, updated: 0, created: 0, total: 0, log: ['Keine Daten vom Broker erhalten.'] });
    }

    const data = messages[0];
    const nodes = data.nodes || [];
    console.log('[NODES] received', nodes.length, 'nodes');

    // Load all existing nodes in one call
    const existingNodes = await base44.asServiceRole.entities.MeshNode.list('-last_heard', 1000);
    const existingMap = {};
    for (const n of existingNodes) {
      existingMap[n.node_id] = n;
    }
    console.log('[NODES] existing nodes in DB:', existingNodes.length);

    const toCreate = [];
    const toUpdate = [];
    const log = [`${nodes.length} Nodes vom Broker empfangen.`];

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

      const existing = existingMap[node.node_id];
      if (existing) {
        // Preserve is_favorite when updating
        record.is_favorite = existing.is_favorite;
        toUpdate.push({ id: existing.id, record });
      } else {
        toCreate.push(record);
      }
    }

    // Bulk create new nodes in batches of 25
    let created = 0;
    for (let i = 0; i < toCreate.length; i += 25) {
      const batch = toCreate.slice(i, i + 25);
      await base44.asServiceRole.entities.MeshNode.bulkCreate(batch);
      created += batch.length;
      console.log('[NODES] created batch:', batch.length, 'total:', created);
    }

    // Update existing nodes in batches with delay and retry
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 1000;
    const MAX_RETRIES = 3;
    let updated = 0;
    let errors = 0;

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(item => base44.asServiceRole.entities.MeshNode.update(item.id, item.record))
      );

      // Collect failed items for retry
      const failed = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          updated++;
        } else {
          failed.push(batch[idx]);
        }
      });

      // Retry failed items with individual delay
      for (let retry = 0; retry < MAX_RETRIES && failed.length > 0; retry++) {
        await delay(1000 * (retry + 1));
        const retryBatch = [...failed];
        failed.length = 0;
        for (const item of retryBatch) {
          try {
            await base44.asServiceRole.entities.MeshNode.update(item.id, item.record);
            updated++;
          } catch (err) {
            failed.push(item);
          }
        }
      }

      // Remaining failures after retries
      errors += failed.length;
      for (const item of failed) {
        console.log('[NODES] update failed after retries:', item.record.node_id);
      }

      // Pause between batches to avoid rate limits
      if (i + BATCH_SIZE < toUpdate.length) {
        await delay(BATCH_DELAY_MS);
      }

      console.log('[NODES] update progress:', updated, '/', toUpdate.length);
    }

    log.push(`Fertig: ${created} neu, ${updated} aktualisiert${errors > 0 ? `, ${errors} Fehler` : ''}.`);
    console.log('[NODES] done:', created, 'created,', updated, 'updated,', errors, 'errors');

    return Response.json({ success: true, updated, created, errors, total: nodes.length, log });
  } catch (error) {
    console.log('[NODES] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});