import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

// Subscribe to a gateway's nodes topic and resolve once the first valid payload arrives
// (or after 30s timeout). Returns the parsed proxy payload or null.
async function fetchNodesFromGateway(brokerUrl, username, password, topic) {
  return await new Promise((resolve, reject) => {
    const collected = [];
    const clientOpts = { clientId: `mesh_nodes_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, connectTimeout: 10000 };
    if (username) clientOpts.username = username;
    if (password) clientOpts.password = password;

    const client = mqtt.connect(brokerUrl, clientOpts);
    const timer = setTimeout(() => {
      client.end(true);
      resolve(collected[0] || null);
    }, 30000);

    client.on('connect', () => {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) { clearTimeout(timer); client.end(true); reject(err); }
      });
    });

    client.on('message', (_t, msgBuf) => {
      try {
        const parsed = JSON.parse(msgBuf.toString());
        collected.push(parsed);
        clearTimeout(timer);
        client.end(true);
        resolve(parsed);
      } catch (e) {
        console.log('[NODES] parse error:', e.message);
      }
    });

    client.on('error', (err) => { clearTimeout(timer); client.end(true); reject(err); });
  });
}

// Persist the proxy node list for one gateway. Returns { created, updated, errors, total }.
async function persistNodes(base44, resolvedFromNode, nodes) {
  const existingNodes = await base44.asServiceRole.entities.MeshNode.filter({ gateway_node_id: resolvedFromNode }, '-last_heard', 1000);
  const existingMap = {};
  for (const n of existingNodes) existingMap[n.node_id] = n;

  const toCreate = [];
  const toUpdate = [];
  for (const node of nodes) {
    const isSelfGateway = node.node_id === resolvedFromNode;
    const record = {
      node_id: node.node_id,
      node_num: node.node_num,
      gateway_node_id: resolvedFromNode,
      long_name: node.long_name || '',
      short_name: node.short_name || '',
      hw_model: node.hw_model || '',
      is_gateway: node.is_gateway || isSelfGateway || false,
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
      record.is_favorite = existing.is_favorite;
      record.is_manual = false;
      toUpdate.push({ id: existing.id, record });
    } else {
      toCreate.push(record);
    }
  }

  let created = 0;
  for (let i = 0; i < toCreate.length; i += 25) {
    const batch = toCreate.slice(i, i + 25);
    await base44.asServiceRole.entities.MeshNode.bulkCreate(batch);
    created += batch.length;
  }

  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 1000;
  const MAX_RETRIES = 1;
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(item => base44.asServiceRole.entities.MeshNode.update(item.id, item.record))
    );
    const failed = [];
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') updated++;
      else failed.push(batch[idx]);
    });
    for (let retry = 0; retry < MAX_RETRIES && failed.length > 0; retry++) {
      await delay(1000 * (retry + 1));
      const retryBatch = [...failed];
      failed.length = 0;
      for (const item of retryBatch) {
        try {
          await base44.asServiceRole.entities.MeshNode.update(item.id, item.record);
          updated++;
        } catch (_) {
          failed.push(item);
        }
      }
    }
    errors += failed.length;
    if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < toUpdate.length) await delay(BATCH_DELAY_MS);
  }

  return { created, updated, errors, total: nodes.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const { fromNode, pollType } = body;
    const runStartedAt = Math.floor(Date.now() / 1000);
    const pollKey = pollType === 'daily_nodes_poll' || !user ? 'daily_nodes_poll' : 'manual_nodes_poll';

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');
    if (!brokerUrl) return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });

    // Build the list of gateways to poll.
    //   - manual_nodes_poll: requires user + their own node_id (or explicit fromNode)
    //   - daily_nodes_poll (no user): iterate over ALL configured gateway node_ids of all users,
    //     skipping dummies (?...). Each gateway gets its own subscription + persistence pass.
    let gateways = [];
    if (user) {
      const targetNode = fromNode || user.node_id;
      if (!targetNode) return Response.json({ error: 'Node-ID nicht in Einstellungen gesetzt' }, { status: 400 });
      gateways = [{ user, node_id: targetNode }];
    } else {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const seen = new Set();
      for (const u of allUsers) {
        const nid = (u.node_id || '').trim();
        if (!nid || nid.startsWith('?') || seen.has(nid)) continue;
        seen.add(nid);
        gateways.push({ user: u, node_id: nid });
      }
      if (gateways.length === 0) {
        return Response.json({ error: 'Keine Gateway-Node-IDs konfiguriert' }, { status: 400 });
      }
    }

    const persist = pollType !== 'manual_nodes_poll';
    const allLog = [];
    let totalNodes = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let lastNodes = [];
    let lastGateway = null;

    for (const gw of gateways) {
      const regionStr = gw.user.region || 'EU_868';
      const prefix = gw.user.topic_prefix || `msh/${regionStr}/proxy`;
      const topic = `${prefix}/nodes/${gw.node_id}/all`;
      console.log('[NODES] gateway:', gw.node_id, '· topic:', topic);

      let payload = null;
      try {
        payload = await fetchNodesFromGateway(brokerUrl, username, password, topic);
      } catch (e) {
        console.log('[NODES] mqtt error for', gw.node_id, ':', e.message);
      }

      const nodes = payload?.nodes || [];
      console.log('[NODES] gateway', gw.node_id, '→', nodes.length, 'nodes');
      lastNodes = nodes;
      lastGateway = gw.node_id;

      if (persist) {
        if (nodes.length === 0) {
          await base44.asServiceRole.entities.PollStatus.create({
            key: pollKey,
            last_run_at: runStartedAt,
            last_polled_at: Math.floor(Date.now() / 1000),
            last_received: 0,
            last_saved: 0,
            skipped: false,
            skip_reason: 'Keine Node-Daten vom Broker erhalten',
            gateway_node_id: gw.node_id,
          });
          allLog.push(`[${gw.node_id}] keine Daten vom Broker erhalten`);
          continue;
        }

        const r = await persistNodes(base44, gw.node_id, nodes);
        totalNodes += r.total;
        totalCreated += r.created;
        totalUpdated += r.updated;
        totalErrors += r.errors;
        allLog.push(`[${gw.node_id}] ${r.total} Nodes empfangen — ${r.created} neu, ${r.updated} aktualisiert${r.errors ? `, ${r.errors} Fehler` : ''}`);

        await base44.asServiceRole.entities.PollStatus.create({
          key: pollKey,
          last_run_at: runStartedAt,
          last_polled_at: Math.floor(Date.now() / 1000),
          last_received: r.total,
          last_saved: r.created + r.updated,
          skipped: false,
          skip_reason: r.errors > 0 ? `${r.errors} Node-Update-Fehler` : '',
          gateway_node_id: gw.node_id,
        });
      }
    }

    // Manual mode: return raw node list for the single requested gateway (frontend persists nothing now,
    // but kept compatible with previous contract).
    if (!persist) {
      return Response.json({ success: true, nodes: lastNodes, gateway_node_id: lastGateway });
    }

    return Response.json({
      success: true,
      gateways: gateways.length,
      total: totalNodes,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      log: allLog,
    });
  } catch (error) {
    console.log('[NODES] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});