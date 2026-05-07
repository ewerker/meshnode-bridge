import { Link } from 'react-router-dom';
import { Radio, MessageSquare, Cpu, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const screenshotCards = [
  { title: 'Dashboard', subtitle: 'Nachrichten senden, empfangen und Polling überwachen' },
  { title: 'Node-Übersicht', subtitle: 'Mesh-Nodes mit Signal, Batterie, GPS und Hardwaredaten' },
  { title: 'Einstellungen', subtitle: 'Node-ID, Region, Channels und MQTT-Routing konfigurieren' },
];

export default function Landing() {
  const { navigateToLogin } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-6">
            <Radio className="w-4 h-4" />
            Meshtastic MQTT Web Portal
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Meshtastic Nachrichten direkt im Browser senden und empfangen.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Dieses Portal verbindet den Browser über ein Backend mit einem MQTT-Broker und einem JSON-Proxy für Meshtastic. So können berechtigte Nutzer Nachrichten schreiben, empfangen, Nodes auswerten und Gateway-Status überwachen — ohne lokal angeschlossenes Funkgerät.
          </p>

          <button
            onClick={() => navigateToLogin()}
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors shadow-lg shadow-primary/20"
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-4">
          <Feature icon={MessageSquare} title="Nachrichten & DMs" text="Channel-Nachrichten, Direktnachrichten, Hop-Limit und ACK-Status in einer Oberfläche." />
          <Feature icon={Cpu} title="Node-Verzeichnis" text="Bekannte Mesh-Nodes mit Signalwerten, Batterie, GPS, Uptime und Hardwaredaten anzeigen." />
          <Feature icon={ShieldCheck} title="Geschützter Zugriff" text="Unangemeldete Besucher sehen nur diese Startseite; App-Funktionen benötigen Login." />
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-5">
            {screenshotCards.map((shot, idx) => (
              <div key={shot.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="h-44 bg-gradient-to-br from-secondary via-card to-primary/20 p-4 flex flex-col justify-between">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-2/3 rounded bg-foreground/20" />
                    <div className="h-3 w-1/2 rounded bg-primary/40" />
                    <div className="grid grid-cols-3 gap-2 pt-3">
                      <div className="h-12 rounded-lg bg-background/40 border border-border" />
                      <div className="h-12 rounded-lg bg-background/40 border border-border" />
                      <div className="h-12 rounded-lg bg-background/40 border border-border" />
                    </div>
                  </div>
                </div>
                <div className="p-4 text-left">
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">Screenshot {idx + 1}</p>
                  <h3 className="font-semibold mt-1">{shot.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{shot.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-5 flex justify-center text-sm text-muted-foreground">
          <Link to="/imprint" className="hover:text-foreground transition-colors">Impressum</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 text-left">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{text}</p>
    </div>
  );
}