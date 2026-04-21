import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as mqtt from 'npm:mqtt@5.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { client_ref } = body;

    if (!client_ref) {
      return Response.json({ error: 'client_ref is required' }, { status: 400 });
    }

    const brokerUrl = Deno.env.get('MQTT_BROKER_URL');
    const username = Deno.env.get('MQTT_USERNAME');
    const password = Deno.env.get('MQTT_PASSWORD');

    if (!brokerUrl) {
      return Response.json({ error: 'MQTT_BROKER_URL not configured' }, { status: 500 });
    }

    // Subscribe to ACK topic: msh/EU_868/proxy/ack/{client_ref}
    const ackTopic = `msh/EU_868/proxy/ack/${client_ref}`;
    console.log('[ACK] subscribing to:', ackTopic);

    const LISTEN_MS = 70000; // 70 seconds to allow for ~60s of ack window
    const statusUpdates = [];

    const messages = await new Promise((resolve, reject) => {
      const collected = [];
      const clientOpts = {
        clientId: `mesh_ack_${Date.now()}`,
        connectTimeout: 10000,
      };
      if (username) clientOpts.username = username;
      if (password) clientOpts.password = password;

      const client = mqtt.connect(brokerUrl, clientOpts);

      const timer = setTimeout(() => {
        console.log('[ACK] listen time expired, closing');
        client.end(true);
        resolve(collected);
      }, LISTEN_MS);

      client.on('connect', () => {
        console.log('[ACK] connected, subscribing to', ackTopic);
        client.subscribe(ackTopic, { qos: 1 }, (err) => {
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
          console.log('[ACK] received:', raw.substring(0, 500));
          const parsed = JSON.parse(raw);
          collected.push(parsed);

          // If we get a final status (ack or nak), we can stop early
          if (parsed.status === 'ack' || parsed.status === 'nak') {
            console.log('[ACK] final status received:', parsed.status);
            clearTimeout(timer);
            client.end(true);
            resolve(collected);
          }
        } catch (e) {
          console.log('[ACK] parse error:', e.message);
        }
      });

      client.on('error', (err) => {
        console.log('[ACK] error:', err.message);
        clearTimeout(timer);
        client.end(true);
        reject(err);
      });
    });

    // Determine final status from collected messages
    // Priority: nak > ack > sent
    let finalStatus = 'sent';
    for (const msg of messages) {
      if (msg.status === 'nak') {
        finalStatus = 'failed';
        break;
      }
      if (msg.status === 'ack') {
        finalStatus = 'acked';
      }
    }

    console.log('[ACK] final status for', client_ref, ':', finalStatus, '(', messages.length, 'messages)');

    // Update the MeshMessage in DB
    const existing = await base44.entities.MeshMessage.filter({ client_ref });
    if (existing.length > 0) {
      await base44.entities.MeshMessage.update(existing[0].id, { status: finalStatus });
      console.log('[ACK] updated message', existing[0].id, 'to status', finalStatus);
    } else {
      console.log('[ACK] no message found for client_ref:', client_ref);
    }

    return Response.json({
      success: true,
      client_ref,
      final_status: finalStatus,
      ack_messages: messages,
    });
  } catch (error) {
    console.log('[ACK] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});