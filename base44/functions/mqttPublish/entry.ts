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
    const forcePortalOnly = senderIsDummy || recipientIsDummy;
    const sendViaMqtt = forcePortalOnly ? false : (user.send_via_mqtt !== false); // default true
    const sendViaPortal = user.send_via_portal !== false; // default true

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
    const gatewayNodeId = user.node_id || '!gateway';

    console.log('[PUB-V3] gatewayNodeId:', gatewayNodeId, '| mode:', mode, '| toNode:', toNode);

    let topic;
    let recipientGatewayId = null;

    if (mode === 'dm' && toNode) {
      topic = `${prefix}/send/${gatewayNodeId}/direct/${toNode}`;
      // Find recipient user to get their gateway node_id for the duplicate
      const recipientUsers = await base44.asServiceRole.entities.User.filter({ node_id: toNode });
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
      text,
      channel: channelNum,
      hop_limit: hop_limit !== undefined ? hop_limit : 3,
      want_ack: wantAckFlag,
    };
    if (client_ref) payload.client_ref = client_ref;
    const payloadStr = JSON.stringify(payload);

    // Diagnostic: log byte codes of last 4 chars of text to verify BEL (0x07) is present
    const lastChars = text.slice(-4).split('').map(c => `${c}=0x${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join(' ');
    console.log('[PUB-V3] text bytes (last 4):', lastChars);
    console.log('[PUB-V3] payloadStr:', payloadStr);

    // Helper: create the duplicate inbound message for the recipient.
    // We tag the mirror with the same client_ref as the outbound so we can later
    // dedupe it once the real MQTT-delivered copy arrives via mqttPoll.
    const createDuplicate = async () => {
      if (mode !== 'dm' || !toNode || !recipientGatewayId) return;
      // Skip mirror if the real MQTT-delivered DM has already been saved for this
      // recipient within the last 10 minutes (avoids creating a duplicate that would
      // need to be deduped later).
      try {
        const since = Math.floor(Date.now() / 1000) - 600;
        const existing = await base44.asServiceRole.entities.MeshMessage.filter({
          direction: 'inbound',
          from_node: gatewayNodeId,
          to_node: toNode,
          text,
        }, '-created_date', 5);
        if (existing.some(e => (e.meshtastic_timestamp || 0) >= since)) {
          console.log('[PUB-V3] mirror skipped: real MQTT inbound already exists');
          return;
        }
      } catch (e) {
        console.log('[PUB-V3] pre-mirror check failed:', e.message);
      }
      await base44.asServiceRole.entities.MeshMessage.create({
        direction: 'inbound',
        text: `via Portal gespiegelt: ${text}`,
        channel: String(channelNum),
        channel_name: '',
        from_node: gatewayNodeId,
        to_node: toNode,
        gateway_node_id: recipientGatewayId,
        mqtt_topic: `${prefix}/rx/${recipientGatewayId}/direct/${gatewayNodeId}`,
        status: 'received',
        raw_payload: JSON.stringify({ ...payload, text: `via Portal gespiegelt: ${text}`, mirror_of_client_ref: client_ref || null }),
        meshtastic_timestamp: Math.floor(Date.now() / 1000),
        client_ref: client_ref || undefined,
      });
      console.log('[PUB-V3] duplicate inbound created for recipient:', recipientGatewayId, 'client_ref:', client_ref);
    };

    if (!wantAckFlag) {
      if (sendViaMqtt) await publishOnly(brokerUrl, username, password, topic, payloadStr);
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
      if (sendViaPortal) await createDuplicate();
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
      if (sendViaPortal) await createDuplicate();
      return Response.json({ success: true, topic, client_ref, final_status: 'sent' });
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

    if (sendViaPortal) await createDuplicate();

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