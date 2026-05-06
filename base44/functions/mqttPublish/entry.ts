import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, channel, toNode, mode, hop_limit, want_ack } = body;
    // Dummy nodes (?...) exist only in the portal — never publish to MQTT for them,
    // neither when the recipient is a dummy nor when the sender's own node is a dummy.
    const senderIsDummy = (user.node_id || '').startsWith('?');
    const recipientIsDummy = mode === 'dm' && (toNode || '').startsWith('?');
    const recipientUsers = mode === 'dm' && toNode
      ? await base44.asServiceRole.entities.User.filter({ node_id: toNode })
      : [];
    const recipientHasPortal = recipientUsers.length > 0;
    const forcePortalOnly = senderIsDummy || recipientIsDummy;
    const sendViaMqtt = forcePortalOnly ? false : (user.send_via_mqtt !== false); // default true
    const sendViaPortal = user.send_via_portal !== false; // default true

    if (senderIsDummy && mode === 'dm' && toNode && !recipientHasPortal) {
      return Response.json({ error: 'Portal-only Accounts können nur an Portal-Nutzer senden.' }, { status: 400 });
    }

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
    const channelConfig = (user.channels || []).find(c => c.number === channelNum);
    const channelName = (channelConfig?.name || '').trim();
    if (senderIsDummy && mode === 'channel' && channelName.toLowerCase() === 'longfast') {
      return Response.json({ error: 'LongFast ist für Portal-only Accounts gesperrt.' }, { status: 400 });
    }
    const regionStr = user.region || 'EU_868';
    const prefix = user.topic_prefix || `msh/${regionStr}/proxy`;
    const gatewayNodeId = user.node_id || '!gateway';

    // Group messages from a ?-portal sender always carry a "FROM Name (?xxxx) VIA PORTAL:"
    // prefix so all recipients (MQTT-forwarded, internal mirrors, sender's own log)
    // see who sent the message — and so the cross-channel content dedup matches.
    const dummyGroupForward = senderIsDummy && mode === 'channel';
    const portalSenderLabel = `${user.full_name || user.email || 'Portal User'} (${gatewayNodeId})`;
    const effectiveText = dummyGroupForward ? `FROM ${portalSenderLabel} VIA PORTAL: ${text}` : text;

    console.log('[PUB-V3] gatewayNodeId:', gatewayNodeId, '| mode:', mode, '| toNode:', toNode, '| dummyGroupForward:', dummyGroupForward);

    let topic;
    let recipientGatewayId = null;

    if (mode === 'dm' && toNode) {
      topic = `${prefix}/send/${gatewayNodeId}/direct/${toNode}`;
      // Find recipient user to get their gateway node_id for the duplicate
      if (recipientUsers.length > 0 && recipientUsers[0].node_id) {
        recipientGatewayId = recipientUsers[0].node_id;
      }

      // Auto-create rudimentary MeshNode for the recipient if not yet present
      // in this user's gateway scope. Allows the sender to manage/favorite the
      // recipient even if no MQTT data has been received yet.
      try {
        const existingRcpt = await base44.asServiceRole.entities.MeshNode.filter({
          node_id: toNode,
          gateway_node_id: gatewayNodeId,
        });
        if (existingRcpt.length === 0) {
          const knownMatches = await base44.asServiceRole.entities.MeshNode.filter({ node_id: toNode }, '-last_heard', 20);
          const knownNamed = knownMatches.find(n => n.long_name || n.short_name) || {};
          const isDummyGateway = (gatewayNodeId || '').startsWith('?');
          await base44.asServiceRole.entities.MeshNode.create({
            node_id: toNode,
            gateway_node_id: gatewayNodeId,
            owner_email: isDummyGateway ? user.email : '',
            short_name: knownNamed.short_name || '',
            long_name: knownNamed.long_name || '',
            is_manual: isDummyGateway,
          });
          console.log('[PUB-V3] auto-created recipient node:', toNode, 'gw:', gatewayNodeId);
        }
      } catch (e) {
        console.log('[PUB-V3] auto-create recipient node failed:', e.message);
      }
    } else {
      topic = `${prefix}/send/${gatewayNodeId}/group/${channelNum}`;
    }
    console.log('[PUB-V3] FINAL topic:', topic);

    const payload = {
      text: effectiveText,
      channel: channelNum,
      hop_limit: hop_limit !== undefined ? hop_limit : 3,
      want_ack: wantAckFlag,
    };
    if (client_ref) payload.client_ref = client_ref;
    const payloadStr = JSON.stringify(payload);

    // Diagnostic: log byte codes of last 4 chars of text to verify BEL (0x07) is present
    const lastChars = effectiveText.slice(-4).split('').map(c => `${c}=0x${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join(' ');
    console.log('[PUB-V3] text bytes (last 4):', lastChars);
    console.log('[PUB-V3] payloadStr:', payloadStr);

    const publishPortalGroupViaGateways = async () => {
      if (!senderIsDummy || mode !== 'channel' || !channelName || channelName.toLowerCase() === 'longfast') return;
      const users = await base44.asServiceRole.entities.User.list();
      const gateways = users.filter(u => {
        if (!u.node_id || !u.node_id.startsWith('!')) return false;
        return (u.channels || []).some(c => c.number === channelNum && (c.name || '').trim() === channelName);
      });
      for (const gateway of gateways) {
        const gatewayRegion = gateway.region || regionStr;
        const gatewayPrefix = gateway.topic_prefix || `msh/${gatewayRegion}/proxy`;
        const gatewayTopic = `${gatewayPrefix}/send/${gateway.node_id}/group/${channelNum}`;
        const gatewayPayload = JSON.stringify({
          text: effectiveText,
          channel: channelNum,
          hop_limit: hop_limit !== undefined ? hop_limit : 3,
          want_ack: false,
        });
        await publishOnly(brokerUrl, username, password, gatewayTopic, gatewayPayload);
      }
      console.log('[PUB-V3] portal group forwarded via MQTT gateways:', gateways.length, 'channel:', channelNum, channelName);
    };

    // Helper: create the duplicate inbound message for the recipient.
    // We tag the mirror with the same client_ref as the outbound so we can later
    // dedupe it once the real MQTT-delivered copy arrives via mqttPoll.
    const createDuplicate = async () => {
      if (mode === 'dm') {
        if (!toNode || !recipientGatewayId) return;
        const since = Math.floor(Date.now() / 1000) - 600;

        // If an exact mirror (same VIA PORTAL text) already exists, skip (avoid double mirror).
        const mirrorText = `VIA PORTAL: ${text}`;
        try {
          const existingMirror = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: gatewayNodeId,
            to_node: toNode,
            text: mirrorText,
          }, '-created_date', 5);
          if (existingMirror.some(e => (e.meshtastic_timestamp || 0) >= since)) {
            console.log('[PUB-V3] DM mirror skipped: mirror already exists');
            return;
          }
        } catch (e) {
          console.log('[PUB-V3] DM pre-mirror check failed:', e.message);
        }

        // If a radio-relayed copy (without "VIA PORTAL:" prefix) was already saved
        // by an earlier poll run, replace it with the portal mirror so the recipient
        // sees a single, properly attributed message — same dedup model as channel mode.
        let dedupRadioCount = 0;
        try {
          const existingRadio = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: gatewayNodeId,
            to_node: toNode,
            text,
          }, '-created_date', 5);
          for (const r of existingRadio) {
            if ((r.meshtastic_timestamp || 0) >= since) {
              try { await base44.asServiceRole.entities.MeshMessage.delete(r.id); dedupRadioCount++; } catch (_) { /* ignore */ }
            }
          }
        } catch (e) {
          console.log('[PUB-V3] DM radio dedup check failed:', e.message);
        }

        const mirrorRaw = { ...payload, text: mirrorText, mirror_of_client_ref: client_ref || null };
        if (dedupRadioCount > 0) {
          mirrorRaw.dedup_radio_count = dedupRadioCount;
          mirrorRaw.dedup_last_at = Math.floor(Date.now() / 1000);
        }

        await base44.asServiceRole.entities.MeshMessage.create({
          direction: 'inbound',
          text: mirrorText,
          // DMs have no named channel — store empty string so the content-dedup
          // search in mqttPoll{,Auto,Offline} (which reads channel from the radio
          // payload, typically "" or "0") matches consistently.
          channel: '',
          channel_name: '',
          from_node: gatewayNodeId,
          to_node: toNode,
          gateway_node_id: recipientGatewayId,
          mqtt_topic: `${prefix}/rx/${recipientGatewayId}/direct/${gatewayNodeId}`,
          status: 'received',
          raw_payload: JSON.stringify(mirrorRaw),
          meshtastic_timestamp: Math.floor(Date.now() / 1000),
          client_ref: client_ref || undefined,
        });
        console.log('[PUB-V3] DM mirror created for recipient:', recipientGatewayId, '· dedup_radio_count:', dedupRadioCount);
        return;
      }

      if (mode === 'channel' && channelName && channelName.toLowerCase() !== 'longfast') {
        const users = await base44.asServiceRole.entities.User.list();
        const recipients = users.filter(u => {
          if (!u.node_id || u.node_id === gatewayNodeId) return false;
          return (u.channels || []).some(c => c.number === channelNum && (c.name || '').trim() === channelName);
        });
        console.log('[PUB-V3] mirror lookup channel:', channelNum, 'name:', channelName, '· users total:', users.length, '· matching recipients:', recipients.length, '· recipient ids:', recipients.map(r => r.node_id).join(','));
        // For ?-portal senders the effectiveText already starts with
        // "FROM <name> (?xxxx) VIA PORTAL:" so we mirror it as-is. For !-gateway
        // senders we prepend "VIA PORTAL:" as before.
        const mirrorText = dummyGroupForward ? effectiveText : `VIA PORTAL: ${text}`;
        for (const recipient of recipients) {
          const since = Math.floor(Date.now() / 1000) - 600;
          // Check if an exact mirror already exists (avoid duplicate mirrors).
          const existingMirror = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: gatewayNodeId,
            gateway_node_id: recipient.node_id,
            channel: String(channelNum),
            text: mirrorText,
          }, '-created_date', 5);
          if (existingMirror.some(e => (e.meshtastic_timestamp || 0) >= since)) continue;

          // Check if a radio-relayed copy (without "VIA PORTAL:" prefix) was already
          // saved by an earlier poll run. If so, replace it with the portal mirror so
          // recipients see the message attributed correctly to the original sender.
          const existingRadio = await base44.asServiceRole.entities.MeshMessage.filter({
            direction: 'inbound',
            from_node: gatewayNodeId,
            gateway_node_id: recipient.node_id,
            channel: String(channelNum),
            text,
          }, '-created_date', 5);
          let dedupRadioCount = 0;
          for (const r of existingRadio) {
            if ((r.meshtastic_timestamp || 0) >= since) {
              try { await base44.asServiceRole.entities.MeshMessage.delete(r.id); dedupRadioCount++; } catch (_) { /* ignore */ }
            }
          }

          const mirrorRaw = { ...payload, text: mirrorText, portal_group: true, channel_name: channelName };
          if (dedupRadioCount > 0) {
            mirrorRaw.dedup_radio_count = dedupRadioCount;
            mirrorRaw.dedup_last_at = Math.floor(Date.now() / 1000);
          }

          await base44.asServiceRole.entities.MeshMessage.create({
            direction: 'inbound',
            text: mirrorText,
            channel: String(channelNum),
            channel_name: channelName,
            from_node: gatewayNodeId,
            to_node: '^all',
            gateway_node_id: recipient.node_id,
            mqtt_topic: `${prefix}/portal/${recipient.node_id}/group/${channelNum}`,
            status: 'received',
            raw_payload: JSON.stringify(mirrorRaw),
            meshtastic_timestamp: Math.floor(Date.now() / 1000),
          });
        }
        console.log('[PUB-V3] portal group delivered:', recipients.length, 'channel:', channelNum, channelName);
      }
    };

    if (!wantAckFlag) {
      // Mirror FIRST (before MQTT publish) so other portal users see the message
      // immediately and the later radio-relayed copy is properly deduped.
      // Errors in the mirror path must NEVER block the MQTT publish.
      if (sendViaPortal) {
        try { await createDuplicate(); } catch (e) { console.log('[PUB-V3] createDuplicate failed (non-fatal):', e.message); }
      }
      if (sendViaMqtt) await publishOnly(brokerUrl, username, password, topic, payloadStr);
      await publishPortalGroupViaGateways();
      await base44.entities.MeshMessage.create({
        direction: 'outbound',
        text,
        channel: String(channelNum),
        from_node: gatewayNodeId,
        to_node: toNode || '^all',
        gateway_node_id: gatewayNodeId,
        mqtt_topic: topic,
        status: 'sent',
        raw_payload: payloadStr,
      });
      return Response.json({ success: true, topic, client_ref: null });
    }

    if (!sendViaMqtt) {
      // Portal-only: skip MQTT, just save + mirror
      await base44.entities.MeshMessage.create({
        direction: 'outbound',
        text,
        channel: String(channelNum),
        from_node: gatewayNodeId,
        to_node: toNode || '^all',
        gateway_node_id: gatewayNodeId,
        mqtt_topic: topic,
        status: 'sent',
        raw_payload: payloadStr,
        client_ref,
      });
      await publishPortalGroupViaGateways();
      if (sendViaPortal) await createDuplicate();
      return Response.json({ success: true, topic, client_ref, final_status: 'sent' });
    }

    // Mirror FIRST (before MQTT publish + ACK wait) so other portal users see the
    // message immediately and the later radio-relayed copy is properly deduped.
    // Errors in the mirror path must NEVER block the MQTT publish/ACK flow.
    if (sendViaPortal) {
      try { await createDuplicate(); } catch (e) { console.log('[PUB+ACK] createDuplicate failed (non-fatal):', e.message); }
    }

    const ackTopic = `${prefix}/ack/${gatewayNodeId}/${client_ref}`;
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
        client.subscribe(ackTopic, { qos: 1 }, (err) => {
          if (err) {
            console.log('[PUB+ACK] subscribe error:', err.message);
            clearTimeout(timer);
            try { client.end(true); } catch (_) { /* ignore */ }
            reject(err);
            return;
          }
          console.log('[PUB+ACK] subscribed to ACK, now publishing...');
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

    await base44.entities.MeshMessage.create({
      direction: 'outbound',
      text,
      channel: String(channelNum),
      from_node: gatewayNodeId,
      to_node: toNode || '^all',
      gateway_node_id: gatewayNodeId,
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