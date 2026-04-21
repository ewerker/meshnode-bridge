import { Radio, ArrowLeft, Wifi, Send, Download, Cpu, Settings, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-600/40 flex items-center justify-center">
            <Radio className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="font-bold text-white tracking-tight">About</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">What is this?</h2>
          <p className="text-slate-400 leading-relaxed">
            This is a <span className="text-cyan-400 font-medium">web-based MQTT bridge</span> for the 
            <a href="https://meshtastic.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">Meshtastic</a> mesh network. 
            It allows you to send and receive text messages to and from the Meshtastic radio mesh — directly from your browser, 
            without needing a physical Meshtastic device connected to your computer.
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">How does it work?</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            Meshtastic nodes with MQTT uplink enabled publish messages to an MQTT broker. 
            This app connects to that same broker to read and write messages — acting as a virtual node on the mesh.
          </p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-sm text-center text-slate-400">
            <span className="text-cyan-400">Browser</span>
            <span className="mx-2">↔</span>
            <span className="text-emerald-400">MQTT Broker</span>
            <span className="mx-2">↔</span>
            <span className="text-yellow-400">Gateway Node</span>
            <span className="mx-2">↔</span>
            <span className="text-purple-400">Mesh Network</span>
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Features</h2>
          <div className="grid gap-3">
            <Feature icon={Send} color="text-cyan-400" title="Send Messages" description="Send text messages to channels or directly to specific nodes (DM)." />
            <Feature icon={Download} color="text-emerald-400" title="Receive Messages" description="Poll the MQTT broker for incoming messages. Auto-polls on page load and every 2 minutes." />
            <Feature icon={MessageSquare} color="text-yellow-400" title="ACK Tracking" description="Optionally request delivery acknowledgements and track their status in real-time." />
            <Feature icon={Cpu} color="text-purple-400" title="Node Directory" description="Fetch and browse all known nodes in your mesh — with battery, signal, position, and uptime data." />
            <Feature icon={Wifi} color="text-cyan-400" title="Configurable Topics" description="Set your own MQTT topic prefix, region, and channel names in the settings." />
            <Feature icon={Settings} color="text-slate-400" title="Per-User Settings" description="Each user configures their own Node ID, region, channels, and topic prefix." />
          </div>
        </section>

        {/* Setup */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">Quick Setup</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-400">
            <li>Open <span className="text-cyan-400">Settings</span> (gear icon in the header).</li>
            <li>Enter your <span className="text-cyan-400">Node ID</span> (e.g. <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded font-mono">!49b65bc8</code>).</li>
            <li>Set the correct <span className="text-cyan-400">Region</span> matching your Meshtastic config.</li>
            <li>Optionally customize the <span className="text-cyan-400">Topic Prefix</span> if your broker uses a non-standard path.</li>
            <li>Save — you're ready to send and receive messages.</li>
          </ol>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">Requirements</h2>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400">
            <li>At least one Meshtastic node with <span className="text-cyan-400">MQTT uplink</span> enabled (acting as gateway).</li>
            <li>Access to the MQTT broker that gateway publishes to.</li>
            <li>The broker credentials are configured by the app administrator.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, color, title, description }) {
  return (
    <div className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5">
      <div className="p-2 rounded-lg bg-slate-800 mt-0.5">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}