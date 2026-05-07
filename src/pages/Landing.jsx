import { Link } from 'react-router-dom';
import { Radio, MessageSquare, Cpu, ShieldCheck, LogIn, Wifi, Mail, Network, Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';


const topics = [
  {
    icon: Network,
    title: 'MQTT als Nervensystem',
    text: 'Das Portal kann ganze Regionen bridgen und über MQTT-Wildcard-Abonnements relevante Nachrichten aus Topics wie msh/<region>/proxy/+/+/# erfassen.'
  },
  {
    icon: Radio,
    title: 'Webuser ohne Funkgerät',
    text: 'Jeder Browser kann als virtueller Meshtastic-Node genutzt werden. Nutzer ohne eigenes Gerät erhalten Pseudo-Node-IDs wie ?abc123.',
  },
  {
    icon: MessageSquare,
    title: 'Nachrichten & Deduplizierung',
    text: 'Portal-Mirror, Radio-Relay und packet_id werden intelligent abgeglichen, damit Nachrichten trotz mehrerer Empfangswege nur einmal sichtbar bleiben.',
  },
  {
    icon: Zap,
    title: 'ACK & Zustellstatus',
    text: 'Mit want_ack und eindeutigen client_ref-IDs verfolgt das Portal ACK, NAK und Implicit ACK über dedizierte MQTT-Topics transparent nach.',
  },
  {
    icon: Cpu,
    title: 'Node-Entdeckung',
    text: 'Node-Daten wie last_heard, SNR, battery_level, GPS, Hardware und Uptime werden per MQTT-Polling gesammelt und übersichtlich visualisiert.',
  },
  {
    icon: Mail,
    title: 'Omni-Channel-Erweiterung',
    text: 'E-Mail-Weiterleitung ist bereits möglich; Versand per E-Mail sowie SMS, RCS, Push, Telegram, WhatsApp, iMessage, KI-Bots und Autoresponder sind vorbereitet oder machbar.'
  },
];

const screenshotCards = [
  {
    title: 'Nachrichtenübersicht',
    subtitle: 'Eingehende Nachrichten, Gruppen und DM via Radio oder Portal — dedupliziert, wenn sie über mehrere Wege geleitet werden.',
    lightImage: 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/259106849_image.png',
    darkImage: 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/d66f4c810_image.png',
  },
  {
    title: 'Nachrichten versenden',
    subtitle: 'Bequem senden mit oder ohne ACK-Anforderung, mehr Hops, gleichzeitiger Portal-Zustellung oder Weiterleitung an Accounts mit E-Mail-, SMS- und RCS-Anbindung.',
    lightImage: 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/bf16da12b_image.png',
    darkImage: 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/704eb2f97_image.png',
  },
  { title: 'Dashboard', subtitle: 'Nachrichten senden, empfangen und Polling überwachen' },
  { title: 'MQTT Broker', subtitle: 'Broker, ewerker/mqtt-proxy, Topics und Gateway-Fluss darstellen' },
  { title: 'Node-Übersicht', subtitle: 'Mesh-Nodes mit Signal, Batterie, GPS und Hardwaredaten' },
  { title: 'ACK & Deduplizierung', subtitle: 'Zustellstatus und intelligente Nachrichtenverarbeitung visualisieren' },
  { title: 'Benachrichtigungen', subtitle: 'E-Mail und zukünftige Kanäle wie SMS, RCS und Push zeigen' },
];

export default function Landing() {
  const { navigateToLogin } = useAuth();
  const { resolved, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-6">
            <Radio className="w-4 h-4" />
            Meshtastic MQTT Web Portal
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Meshtastic Web Portal — Meshtastic direkt im Browser.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Das Meshtastic Web Portal macht jeden Webbrowser zum virtuellen Meshtastic-Node. Über MQTT verbindet es sich in Echtzeit mit Ihrem Meshtastic-Netzwerk — auch ohne eigenes Funkgerät.
          </p>

          <p className="mt-4 text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            In Kombination mit dem <a href="https://github.com/ewerker/mqtt-proxy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">W-2 MQTT-Proxy</a> können Nachrichten gesendet, empfangen, geroutet, an Personen weitergeleitet, in Gruppen umgeleitet, dedupliziert und Zustellbestätigungen verfolgt werden.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => navigateToLogin()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <LogIn className="w-5 h-5" />
              Login
            </button>
            <button
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-sm text-foreground transition-colors"
            >
              {resolved === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
              {resolved === 'dark' ? 'Tag einschalten' : 'Nacht einschalten'}
            </button>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Leistungsbereiche</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Von MQTT-Integration über virtuelle Web-Nodes bis zu ACK-Tracking, Deduplizierung und Benachrichtigungen.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Feature key={topic.title} icon={topic.icon} title={topic.title} text={topic.text} />
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-2xl font-bold mb-3">Technisch robust, intuitiv bedienbar</h2>
            <p className="text-muted-foreground leading-relaxed">
              Eine moderne, webbasierte Brücke zwischen Meshtastic — prinzipiell auch Meshcore — MQTT und alltäglicher Kommunikation: skalierbar, flexibel und ohne Gerätezwang. Nodes, Kanäle, Direktnachrichten, GPS/Karte, Akku, SNR und Zustellstatus werden zentral sichtbar.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {screenshotCards.map((shot, idx) => (
              <div key={shot.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="h-44 bg-gradient-to-br from-secondary via-card to-primary/20 overflow-hidden">
                  {shot.lightImage ? (
                    <img
                      src={resolved === 'dark' ? shot.darkImage : shot.lightImage}
                      alt={shot.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="h-full p-4 flex flex-col justify-between">
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
                  )}
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