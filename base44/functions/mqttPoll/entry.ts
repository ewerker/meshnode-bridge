import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { listenSeconds, region, pollType } = body;
    const pollKey = pollType === 'initial_poll' ? 'initial_poll' : 'manual_poll';
    const runStartedAt = Math.floor(Date.now() / 1000);
    const listenTime = (listenSeconds || 30) * 1000;

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    // User's own node_id is still used for gateway-status display and DM routing,
    // but the message subscription now spans ALL gateways via wildcard.
    const nodeId = user.node_id;

    const regionStr = region || user.region || 'EU_868';
    // Subscribe with a fully wildcarded gateway segment so we receive messages
    // from every gateway publishing under this prefix. The actual gateway id is
    // extracted from the topic path per message.
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;
    const wildcardTopic = `${prefix}/+/+/#`;
    console.log('[MQTT] params:', { region, listenSeconds, nodeId });
    console.log('[MQTT] subscribing to wildcard topic:', wildcardTopic);

    // Read gateway presence (retained) so Initial/Manual logs show the same status indicator as Auto
    let gatewayStatus = 'unknown';
    let gatewayReasons = '';
    try {
      const root = `msh/${regionStr}`;
      const presenceTopic = `${root}/2/stat/${nodeId}`;
      const detailTopic = `${root}/proxy/status/${nodeId}`;
      const presenceResult = await new Promise((resolve, reject) => {
        let presence = null;
        let detail = null;
        const opts = { clientId: `mesh_status_poll_${Date.now()}`, connectTimeout: 8000, clean: true, protocolVersion: 4 };
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
    } catch (e) {
      console.log('[MQTT] gateway status read failed:', e.message);
    }

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = {
        clientId: `mesh_poll_${Date.now()}`,
        connectTimeout: 10000,
        clean: true,
        protocolVersion: 4,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      console.log('[MQTT] connecting to:', brokerUrl);
      const client = mqtt.connect(brokerUrl, clientOpts);

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        console.log('[MQTT] done, collected:', collected.length, 'messages');
        client.end(true);
        resolve(collected);
      };

      const timer = setTimeout(done, listenTime + 10000);

      // Register message handler BEFORE connect to not miss any messages
      client.on('message', (t, msgBuf) => {
        console.log('[MQTT] >>> message event on topic:', t);
        try {
          const raw = msgBuf.toString();
          console.log('[MQTT] raw payload:', raw.substring(0, 500));
          const parsed = JSON.parse(raw);
          const text = parsed.text || '';
          console.log('[MQTT] text:', text, '| from:', parsed.from_id, '| scope:', parsed.scope, '| portnum:', parsed.portnum);
          if (text && parsed.portnum === 'TEXT_MESSAGE_APP') {
            collected.push({ topic: t, payload: parsed, receivedAt: new Date().toISOString() });
            console.log('[MQTT] collected total:', collected.length);
          }
        } catch (e) {
          console.log('[MQTT] parse error:', e.message, '| raw:', msgBuf.toString().substring(0, 200));
        }
      });

      client.on('connect', (connack) => {
        console.log('[MQTT] connected, connack:', JSON.stringify(connack));
        console.log('[MQTT] subscribing to:', wildcardTopic);
        client.subscribe(wildcardTopic, { qos: 1 }, (err, granted) => {
          if (err) {
            console.log('[MQTT] subscribe error:', err.message);
            clearTimeout(timer);
            client.end(true);
            reject(err);
          } else {
            console.log('[MQTT] subscribe granted:', JSON.stringify(granted));
            setTimeout(() => {
              clearTimeout(timer);
              done();
            }, listenTime);
          }
        });
      });

      client.on('error', (err) => {
        console.log('[MQTT] client error:', err.message);
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });

      client.on('offline', () => console.log('[MQTT] client offline'));
      client.on('reconnect', () => console.log('[MQTT] reconnecting...'));
      client.on('close', () => console.log('[MQTT] connection closed'));
      client.on('disconnect', () => console.log('[MQTT] disconnected by broker'));
    });

    // Save received messages to DB (skip duplicates by packet_id)
    const saved = [];
    for (const msg of messages) {
      const p = msg.payload;

      // Use packet_id as unique message ID
      let msgId = p.packet_id !== undefined ? String(p.packet_id) : null;
      
      // Fallback for deduplication if no packet_id is provided
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

      // Determine DM also from topic path /direct/<id> as a fallback
      const isDM = p.scope === 'dm' || /\/direct\//.test(msg.topic || '');

      // Extract the gateway node id from the topic path. Topic shape is
      // `<prefix>/<rxOrSend>/<gatewayNodeId>/<...>` — the gateway id is
      // the segment immediately after the prefix's rx/send token.
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

      // Content-based dedup: a portal-mirror is always created synchronously when
      // the message is sent, so it always exists before the radio-relayed copy
      // arrives later. We compare ONLY the cleaned text within the same
      // gateway+channel+target and skip the new (radio) copy if a match exists.
      const cleaned = extractOriginalContent(p.text || '', p.from_id || '');
      if (cleaned.cleanText) {
        const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;
        const candidates = await base44.asServiceRole.entities.MeshMessage.filter({
          gateway_node_id: messageGatewayId,
          channel: channelStr,
          to_node: isDM ? (messageGatewayId || '') : (p.to_id || '^all'),
        }, '-created_date', 30);
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
          console.log('[MQTT] content-dedup skip:', cleaned.cleanText.substring(0, 40));
          continue;
        }
      }

      const record = await base44.entities.MeshMessage.create({
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
      saved.push(record);

      // Auto-create rudimentary MeshNode for the sender if not yet present
      // in this gateway's scope. Allows users to favorite/manage senders that
      // appear via received messages.
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
            console.log('[MQTT] auto-created node for sender:', p.from_id, 'gw:', messageGatewayId);
          }
        } catch (e) {
          console.log('[MQTT] auto-create sender node failed:', e.message);
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
          console.log('[MQTT] radio group delivered internally:', recipients.length, 'channel:', channelStr, channelName);
        } catch (e) {
          console.log('[MQTT] radio group internal delivery failed:', e.message);
        }
      }

      // Dedup portal mirror: if this message was also delivered internally via
      // the portal within the last 10 minutes, delete the portal copy — the real
      // MQTT-delivered copy now wins. Skip when this message itself already is a
      // portal-forwarded copy (loop protection).
      if (!alreadyPortalForwarded && p.text && p.from_id) {
        try {
          const mirrorText = `VIA PORTAL: ${p.text}`;
          const since = Math.floor(Date.now() / 1000) - 600; // 10 minutes
          const candidates = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: p.from_id,
            to_node: isDM ? (p.to_id || messageGatewayId) : '^all',
            text: mirrorText,
            gateway_node_id: messageGatewayId,
          }, '-created_date', 10);
          for (const c of candidates) {
            if (c.id === record.id) continue;
            if ((c.meshtastic_timestamp || 0) >= since) {
              await base44.asServiceRole.entities.MeshMessage.delete(c.id);
              console.log('[MQTT] deduped portal mirror:', c.id);
            }
          }
        } catch (e) {
          console.log('[MQTT] mirror dedup failed:', e.message);
        }
      }
    }

    await base44.entities.PollStatus.create({
      key: pollKey,
      last_run_at: runStartedAt,
      last_polled_at: Math.floor(Date.now() / 1000),
      last_received: messages.length,
      last_saved: saved.length,
      skipped: false,
      skip_reason: '',
      gateway_node_id: nodeId,
      gateway_status: gatewayStatus,
      gateway_reasons: gatewayReasons,
    });

    return Response.json({ received: messages.length, saved: saved.length, messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Strip portal/radio prefixes and recover the original sender if it is encoded
// inside the text (e.g. "FROM Alice (?9999) VIA PORTAL: hi" or "FROM ?9999 VIA PORTAL: hi").
// Returns { cleanText, originalSender }.
function extractOriginalContent(text, fromNode) {
  let t = (text || '').trim();
  if (t.endsWith('\u0007')) t = t.slice(0, -1).trim();
  let originalSender = fromNode || '';
  // "FROM <name> (<id>) VIA PORTAL: ..." or "FROM <id> VIA PORTAL: ..."
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