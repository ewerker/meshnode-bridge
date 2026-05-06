import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

const POLL_STATUS_KEY = 'auto_poll';
const SESSION_TIMEOUT_SECONDS = 120; // 2 minutes — heartbeat runs every 60s, so 2x interval

async function logPollRun(base44, data) {
  // Append a new PollStatus entry per run so the history is preserved
  await base44.asServiceRole.entities.PollStatus.create({ key: POLL_STATUS_KEY, ...data });
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
      const reason = lastActive === 0
        ? 'Kein aktiver Admin (noch nie eingeloggt)'
        : `Admin inaktiv seit ${Math.round(secondsSinceActive / 60)} Minuten`;
      console.log(`[MQTT-AUTO] skipped — ${reason}`);
      
      const lastPolls = await base44.asServiceRole.entities.PollStatus.filter({ key: POLL_STATUS_KEY }, '-created_date', 1);
      const isAlreadySkipping = lastPolls.length > 0 && lastPolls[0].skipped;
      
      if (!isAlreadySkipping) {
        await logPollRun(base44, {
          last_run_at: nowTs,
          skipped: true,
          skip_reason: 'Admin ist offline (Browser geschlossen)',
          gateway_node_id: admin.node_id || '',
        });
      }
      return Response.json({ skipped: true, reason: 'No active admin session' });
    }

    const nodeId = admin.node_id;
    if (!nodeId) {
      return Response.json({ error: 'Admin has no node_id configured' }, { status: 400 });
    }

    const regionStr = admin.region || 'EU_868';
    const prefix = admin.topic_prefix || `msh/${regionStr}/proxy`;
    // Subscribe with a fully wildcarded gateway segment so we collect messages
    // from every gateway publishing under this prefix. The gateway id is
    // extracted from the topic path on a per-message basis.
    const wildcardTopic = `${prefix}/+/+/#`;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    const listenTime = 110000; // ~1.8 min, leaves buffer for save phase within isolate timeout
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

      const timer = setTimeout(done, listenTime + 5000);

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
      let msgId = p.packet_id !== undefined ? String(p.packet_id) : null;

      if (!msgId) {
         const textHash = (p.text || '').substring(0, 20).replace(/\s+/g, '_');
         msgId = `fallback_${p.from_id || 'unknown'}_${p.mirrored_at || 'no_ts'}_${textHash}`;
      }

      // Resolve channel index: prefer payload channel_index, then legacy `channel`,
      // then derive from topic path .../group/<idx> as a last resort.
      let channelIdx = (p.channel_index !== null && p.channel_index !== undefined) ? p.channel_index
                     : (p.channel !== null && p.channel !== undefined) ? p.channel
                     : null;
      if (channelIdx === null) {
        const m = /\/group\/(\d+)(?:\/|$)/.exec(msg.topic || '');
        if (m) channelIdx = parseInt(m[1]);
      }
      const channelStr = channelIdx !== null && channelIdx !== undefined && !isNaN(channelIdx) ? String(channelIdx) : '';
      const channelName = (p.channel_name && String(p.channel_name).trim()) ? String(p.channel_name) : '';

      const isDM = p.scope === 'dm' || /\/direct\//.test(msg.topic || '');

      // Extract gateway node id from the topic path (segment after the
      // rx/send token within the prefix).
      const topicSegments = (msg.topic || '').split('/');
      const gwFromTopic = topicSegments[4] || '';
      const messageGatewayId = gwFromTopic || nodeId || '';

      // Dedup is per (message_id, gateway_node_id): the same packet can legitimately
      // be received via multiple gateways and we want one record per gateway.
      if (msgId) {
        const existing = await base44.asServiceRole.entities.MeshMessage.filter({
          message_id: msgId,
          gateway_node_id: messageGatewayId,
        });
        if (existing.length > 0) continue;
      }

      // Content-based dedup: keep the variant that contains the original sender
      // (VIA PORTAL with "FROM <name> (?xxxx)"), drop the radio-relayed variant
      // that lost it.
      // For DMs the channel value is ignored — DMs are not channel-scoped, and the
      // mirror & radio copies may carry different channel values from sender/payload.
      const cleaned = extractOriginalContent(p.text || '', p.from_id || '');
      const newHasOriginalSender = /VIA\s+PORTAL:/i.test(p.text || '') && cleaned.originalSender.startsWith('?');
      if (cleaned.cleanText) {
        const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;
        const dedupFilter = {
          gateway_node_id: messageGatewayId,
          to_node: isDM ? (messageGatewayId || '') : (p.to_id || '^all'),
        };
        if (!isDM) dedupFilter.channel = channelStr;
        const candidates = await base44.asServiceRole.entities.MeshMessage.filter(dedupFilter, '-created_date', 30);
        const dupMatch = candidates.find(c => {
          if ((c.meshtastic_timestamp || 0) < since) return false;
          const cc = extractOriginalContent(c.text || '', c.from_node || '');
          return cc.cleanText === cleaned.cleanText;
        });
        if (dupMatch) {
          try {
            const prevRaw = dupMatch.raw_payload ? JSON.parse(dupMatch.raw_payload) : {};
            const newRaw = { ...prevRaw, dedup_radio_count: (prevRaw.dedup_radio_count || 0) + 1, dedup_last_at: Math.floor(Date.now() / 1000) };
            await base44.asServiceRole.entities.MeshMessage.update(dupMatch.id, { raw_payload: JSON.stringify(newRaw) });
          } catch (_) { /* ignore */ }
          console.log('[MQTT-AUTO] content-dedup skip:', cleaned.cleanText.substring(0, 40));
          continue;
        }
      }

      const created = await base44.asServiceRole.entities.MeshMessage.create({
        direction: 'inbound',
        text: p.text || '',
        channel: channelStr,
        channel_name: channelName,
        from_node: p.from_id || '',
        to_node: isDM ? (messageGatewayId || '') : (p.to_id || '^all'),
        gateway_node_id: messageGatewayId,
        mqtt_topic: msg.topic,
        status: 'received',
        raw_payload: JSON.stringify(p),
        message_id: msgId || undefined,
        meshtastic_timestamp: p.mirrored_at || undefined,
      });
      savedCount++;

      // Auto-create rudimentary MeshNode for the sender if not yet present
      // in this gateway's scope.
      if (p.from_id && messageGatewayId) {
        try {
          const existingNode = await base44.asServiceRole.entities.MeshNode.filter({
            node_id: p.from_id,
            gateway_node_id: messageGatewayId,
          });
          if (existingNode.length === 0) {
            await base44.asServiceRole.entities.MeshNode.create({
              node_id: p.from_id,
              gateway_node_id: messageGatewayId,
              short_name: p.from_label || '',
              long_name: '',
              is_manual: false,
              last_heard: p.mirrored_at || Math.floor(Date.now() / 1000),
            });
            console.log('[MQTT-AUTO] auto-created node for sender:', p.from_id, 'gw:', messageGatewayId);
          }
        } catch (e) {
          console.log('[MQTT-AUTO] auto-create sender node failed:', e.message);
        }
      }

      // Loop-Schutz: Nachrichten, die bereits "VIA PORTAL:" enthalten, niemals
      // erneut intern weiterleiten — sie wurden schon einmal portalseitig verteilt.
      const alreadyPortalForwarded = /VIA\s+PORTAL:/i.test(p.text || '');

      if (!alreadyPortalForwarded && !isDM && messageGatewayId.startsWith('!') && channelName && channelName.toLowerCase() !== 'longfast' && p.text) {
        try {
          const users = await base44.asServiceRole.entities.User.list();
          const recipients = users.filter(u => {
            if (!u.node_id || u.node_id === messageGatewayId) return false;
            return (u.channels || []).some(c => c.number === parseInt(channelStr) && (c.name || '').trim() === channelName);
          });
          for (const recipient of recipients) {
            const radioText = `VIA RADIO: ${p.text}`;
            const since = Math.floor(Date.now() / 1000) - 600;
            const existingRadio = await base44.asServiceRole.entities.MeshMessage.filter({
              direction: 'inbound',
              from_node: p.from_id || '',
              gateway_node_id: recipient.node_id,
              channel: channelStr,
              text: radioText,
            }, '-created_date', 5);
            if (existingRadio.some(e => (e.meshtastic_timestamp || 0) >= since)) continue;

            await base44.asServiceRole.entities.MeshMessage.create({
              direction: 'inbound',
              text: radioText,
              channel: channelStr,
              channel_name: channelName,
              from_node: p.from_id || '',
              to_node: '^all',
              gateway_node_id: recipient.node_id,
              mqtt_topic: `${prefix}/radio/${recipient.node_id}/group/${channelStr}`,
              status: 'received',
              raw_payload: JSON.stringify({ ...p, text: radioText, radio_group: true, original_gateway: messageGatewayId }),
              message_id: msgId ? `radio_${msgId}_${recipient.node_id}` : undefined,
              meshtastic_timestamp: p.mirrored_at || Math.floor(Date.now() / 1000),
            });
          }
          console.log('[MQTT-AUTO] radio group delivered internally:', recipients.length, 'channel:', channelStr, channelName);
        } catch (e) {
          console.log('[MQTT-AUTO] radio group internal delivery failed:', e.message);
        }
      }

      // Dedup portal mirror: if this message was also delivered internally via
      // the portal within the last 10 minutes, delete the portal copy — the real
      // MQTT-delivered copy now wins. Skip when this message itself already is a
      // portal-forwarded copy (loop protection).
      if (!alreadyPortalForwarded && p.text && p.from_id) {
        try {
          const mirrorText = `VIA PORTAL: ${p.text}`;
          const since = Math.floor(Date.now() / 1000) - 600;
          const candidates = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: p.from_id,
            to_node: isDM ? (p.to_id || messageGatewayId) : '^all',
            text: mirrorText,
            gateway_node_id: messageGatewayId,
          }, '-created_date', 10);
          for (const c of candidates) {
            if (c.id === created.id) continue;
            if ((c.meshtastic_timestamp || 0) >= since) {
              await base44.asServiceRole.entities.MeshMessage.delete(c.id);
              console.log('[MQTT-AUTO] deduped portal mirror:', c.id);
            }
          }
        } catch (e) {
          console.log('[MQTT-AUTO] mirror dedup failed:', e.message);
        }
      }
    }

    console.log('[MQTT-AUTO] saved:', savedCount, 'of', messages.length);

    // Read gateway presence (retained) for status logging
    let gatewayStatus = 'unknown';
    let gatewayReasons = '';
    try {
      const root = `msh/${regionStr}`;
      const presenceTopic = `${root}/2/stat/${nodeId}`;
      const detailTopic = `${root}/proxy/status/${nodeId}`;
      const presenceResult = await new Promise((resolve, reject) => {
        let presence = null;
        let detail = null;
        const opts = { clientId: `mesh_status_auto_${Date.now()}`, connectTimeout: 8000, clean: true, protocolVersion: 4 };
        if (username) opts.username = username;
        if (password) opts.password = password;
        const c = mqtt.connect(brokerUrl, opts);
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          try { c.end(true); } catch (_) { /* ignore */ }
          resolve({ presence, detail });
        };
        const t = setTimeout(finish, 4000);
        c.on('message', (topic, buf) => {
          const raw = buf.toString();
          if (topic === presenceTopic) presence = raw.trim();
          else if (topic === detailTopic) {
            try { detail = JSON.parse(raw); } catch { detail = null; }
          }
          if (presence !== null && detail !== null) finish();
        });
        c.on('connect', () => {
          c.subscribe([presenceTopic, detailTopic], { qos: 0 }, (err) => {
            if (err) { clearTimeout(t); try { c.end(true); } catch (_) { /* ignore */ } reject(err); }
          });
        });
        c.on('error', (err) => { if (!done) { done = true; clearTimeout(t); try { c.end(true); } catch (_) { /* ignore */ } reject(err); } });
      });
      if (presenceResult.presence === 'online') gatewayStatus = 'online';
      else if (presenceResult.presence === 'broken') gatewayStatus = 'broken';
      else if (presenceResult.presence === 'offline') gatewayStatus = 'offline';
      if (Array.isArray(presenceResult.detail?.reasons) && presenceResult.detail.reasons.length > 0) {
        gatewayReasons = presenceResult.detail.reasons.join(', ');
      }
      console.log('[MQTT-AUTO] gateway status:', gatewayStatus, gatewayReasons ? `(${gatewayReasons})` : '');
    } catch (e) {
      console.log('[MQTT-AUTO] gateway status read failed:', e.message);
    }

    await logPollRun(base44, {
      last_run_at: nowTs,
      last_polled_at: nowTs,
      last_received: messages.length,
      last_saved: savedCount,
      skipped: false,
      skip_reason: '',
      gateway_status: gatewayStatus,
      gateway_reasons: gatewayReasons,
      gateway_node_id: nodeId,
    });

    return Response.json({ received: messages.length, saved: savedCount, gateway_status: gatewayStatus });
  } catch (error) {
    console.log('[MQTT-AUTO] fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractOriginalContent(text, fromNode) {
  let t = (text || '').trim();
  if (t.endsWith('\u0007')) t = t.slice(0, -1).trim();
  let originalSender = fromNode || '';
  const m1 = t.match(/^FROM\s+.*?\(([^)]+)\)\s+VIA\s+PORTAL:\s*/i);
  const m2 = t.match(/^FROM\s+(\S+)\s+VIA\s+PORTAL:\s*/i);
  if (m1) {
    originalSender = m1[1].trim();
    t = t.replace(m1[0], '');
  } else if (m2) {
    originalSender = m2[1].trim();
    t = t.replace(m2[0], '');
  } else {
    t = t.replace(/^VIA\s+PORTAL:\s*/i, '').replace(/^VIA\s+RADIO:\s*/i, '');
  }
  return { cleanText: t.trim(), originalSender };
}