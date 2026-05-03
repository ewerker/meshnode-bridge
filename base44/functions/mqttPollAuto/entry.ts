import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

const POLL_STATUS_KEY = 'auto_poll';
const SESSION_TIMEOUT_SECONDS = 600; // 10 minutes — user must have been active within this window

async function upsertPollStatus(base44, data) {
  const existing = await base44.asServiceRole.entities.PollStatus.filter({ key: POLL_STATUS_KEY });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.PollStatus.update(existing[0].id, data);
  } else {
    await base44.asServiceRole.entities.PollStatus.create({ key: POLL_STATUS_KEY, ...data });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const nowTs = Math.floor(Date.now() / 1000);

    // Find the admin user
    const users = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (!users || users.length === 0) {
      return Response.json({ error: 'No admin user found' }, { status: 500 });
    }
    const admin = users[0];

    // Check if admin has an active session (heartbeat within SESSION_TIMEOUT_SECONDS)
    const lastActive = admin.last_active || 0;
    const secondsSinceActive = nowTs - lastActive;

    if (secondsSinceActive > SESSION_TIMEOUT_SECONDS) {
      console.log(`[MQTT-AUTO] skipped — admin last active ${secondsSinceActive}s ago (threshold: ${SESSION_TIMEOUT_SECONDS}s)`);
      await upsertPollStatus(base44, {
        last_run_at: nowTs,
        skipped: true,
        skip_reason: `Admin inaktiv seit ${Math.round(secondsSinceActive / 60)} Minuten`,
      });
      return Response.json({ skipped: true, reason: 'No active admin session' });
    }

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

    const listenTime = 150000; // 2.5 minutes
    console.log('[MQTT-AUTO] active session confirmed, subscribing to:', wildcardTopic);

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

    // Save received messages (skip duplicates)
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

    await upsertPollStatus(base44, {
      last_run_at: nowTs,
      last_polled_at: nowTs,
      last_received: messages.length,
      last_saved: savedCount,
      skipped: false,
      skip_reason: '',
    });

    return Response.json({ received: messages.length, saved: savedCount });
  } catch (error) {
    console.log('[MQTT-AUTO] fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});