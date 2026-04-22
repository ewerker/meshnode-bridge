import { Radio, ArrowLeft, Wifi, Send, Download, Cpu, Settings, MessageSquare, Moon, RefreshCw, User, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-bold text-foreground tracking-tight">About</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">What is this?</h2>
          <p className="text-muted-foreground leading-relaxed">
            This is a <span className="text-primary font-medium">web-based MQTT dashboard</span> for the 
            <a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Meshtastic</a> mesh network. 
            It allows you to send and receive text messages to and from the Meshtastic radio mesh — directly from your browser, 
            without needing a physical Meshtastic device connected to your computer.
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">How does it work?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Meshtastic nodes with MQTT uplink enabled publish messages to an MQTT broker. 
            A JSON proxy translates between Meshtastic's native Protobuf format and JSON. 
            This app connects to the broker to read and write those JSON messages — acting as a virtual node on the mesh.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 font-mono text-sm text-center text-muted-foreground">
            <span className="text-primary">Browser</span>
            <span className="mx-2">↔</span>
            <span className="text-foreground">Backend</span>
            <span className="mx-2">↔</span>
            <span className="text-emerald-400">MQTT Broker</span>
            <span className="mx-2">↔</span>
            <span className="text-yellow-400">JSON Proxy</span>
            <span className="mx-2">↔</span>
            <span className="text-purple-400">Mesh Network</span>
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Features</h2>
          <div className="grid gap-3">
            <Feature icon={Send} color="text-primary" title="Channel & DM Messages" description="Send text messages to group channels (0–7) or directly to specific nodes via DM mode." />
            <Feature icon={Download} color="text-emerald-400" title="Receive & Auto-Poll" description="Manually poll the broker or let auto-poll fetch new messages on page load, tab focus, and every 2 minutes." />
            <Feature icon={Zap} color="text-yellow-400" title="Real-time Updates" description="New incoming messages appear instantly via live subscriptions — no manual refresh needed." />
            <Feature icon={MessageSquare} color="text-orange-400" title="ACK Tracking" description="Request delivery acknowledgements (ACK/NAK/Implicit ACK) with configurable hop limits." />
            <Feature icon={Cpu} color="text-purple-400" title="Node Directory" description="Fetch and browse all known nodes — with battery, SNR, RSSI, GPS position, uptime, and hardware info." />
            <Feature icon={Wifi} color="text-primary" title="Flexible MQTT Topics" description="Configure custom topic prefixes, regions (EU_868, US, etc.), and per-channel names." />
            <Feature icon={Settings} color="text-muted-foreground" title="Per-User Settings" description="Each user has their own Node ID, region, default channel, channel names, and topic prefix." />
            <Feature icon={Moon} color="text-indigo-400" title="Dark / Light / Auto Theme" description="Switch between dark mode, light mode, or auto (follows your system preference). Choice is saved." />
            <Feature icon={RefreshCw} color="text-emerald-400" title="Manual Poll Control" description="Choose listen duration (10s to 20min) when manually polling — useful for longer monitoring sessions." />
          </div>
        </section>

        {/* Setup */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Quick Setup</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Open <span className="text-primary">Settings</span> (gear icon in the dashboard header).</li>
            <li>Enter your <span className="text-primary">Node ID</span> (e.g. <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">!49b65bc8</code>).</li>
            <li>Set the correct <span className="text-primary">Region</span> matching your Meshtastic firmware config.</li>
            <li>Optionally set a custom <span className="text-primary">Topic Prefix</span> if your proxy uses a non-standard path.</li>
            <li>Name your <span className="text-primary">Channels</span> (0–7) to match your Meshtastic channel configuration.</li>
            <li>Save — you're ready to send and receive messages.</li>
          </ol>
        </section>

        {/* MQTT Proxy */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">MQTT JSON Proxy</h2>
          <div className="bg-card border border-yellow-500/30 rounded-xl p-4">
            <p className="text-muted-foreground leading-relaxed mb-3">
              <span className="text-yellow-500 font-semibold">Important:</span> This app requires a JSON proxy that translates 
              Meshtastic's native Protobuf-encoded MQTT messages into JSON. The proxy runs alongside your MQTT broker and 
              provides the readable topics this dashboard subscribes to.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Compatible proxy: <a href="https://github.com/ewerker/mqtt-proxy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">ewerker/mqtt-proxy</a>. 
              Install and run it on the same server as your broker, or anywhere with network access to it.
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Default topic structure: <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono text-primary">msh/&lt;region&gt;/proxy/...</code>
            </p>
            <a
              href="https://github.com/ewerker/mqtt-proxy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-sm text-primary font-medium transition-colors"
            >
              → GitHub: ewerker/mqtt-proxy
            </a>
          </div>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Requirements</h2>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            <li>A running <a href="https://github.com/ewerker/mqtt-proxy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ewerker/mqtt-proxy</a> instance (local or remote).</li>
            <li>At least one Meshtastic node with <span className="text-primary">MQTT uplink</span> enabled (acting as gateway).</li>
            <li>Access to the MQTT broker your gateway node publishes to.</li>
            <li>Broker credentials (URL, username, password) configured by the app administrator.</li>
          </ul>
        </section>

        {/* Dashboard UI Guide */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">Dashboard Overview</h2>
          <div className="space-y-2 text-muted-foreground text-sm">
            <p><span className="text-primary font-medium">Send Message</span> — Choose between Channel mode (broadcast to a group) or DM mode (direct to a specific node). Set hop limit and ACK preference.</p>
            <p><span className="text-primary font-medium">Manual Receive</span> — Actively listen on the broker for a configurable duration. Useful for extended monitoring.</p>
            <p><span className="text-primary font-medium">Message History</span> — Shows all sent and received messages with direction indicators, channel info, SNR/RSSI data, gateway ID, and relative timestamps. Messages can be deleted individually.</p>
            <p><span className="text-primary font-medium">Nodes page</span> — Fetches the full node list from the broker and displays hardware, battery, signal quality, GPS coordinates, and uptime in a sortable table.</p>
          </div>
        </section>
        {/* Footer link */}
        <div className="pt-4 border-t border-border text-center">
          <Link to="/imprint" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Imprint & Disclaimer
          </Link>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, color, title, description }) {
  return (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-3.5">
      <div className="p-2 rounded-lg bg-secondary mt-0.5">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}