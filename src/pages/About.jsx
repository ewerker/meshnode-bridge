import { Radio, ArrowLeft, Wifi, Send, Download, Cpu, Settings, MessageSquare, Moon, RefreshCw, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import AppFooter from '@/components/AppFooter';
import { useLanguage } from '@/lib/LanguageContext';

const featureIcons = [Send, Download, Zap, MessageSquare, Cpu, Wifi, Settings, Moon, RefreshCw];
const featureColors = ['text-primary', 'text-emerald-400', 'text-yellow-400', 'text-orange-400', 'text-purple-400', 'text-primary', 'text-muted-foreground', 'text-indigo-400', 'text-emerald-400'];

export default function About() {
  const { t } = useLanguage();

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
          <h1 className="font-bold text-foreground tracking-tight">{t.about.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.introTitle}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.about.intro}</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.howTitle}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{t.about.how}</p>
          <div className="bg-card border border-border rounded-xl p-4 font-mono text-sm text-center text-muted-foreground">
            <span className="text-primary">Browser</span><span className="mx-2">↔</span>
            <span className="text-foreground">Backend</span><span className="mx-2">↔</span>
            <span className="text-emerald-400">MQTT Broker</span><span className="mx-2">↔</span>
            <span className="text-yellow-400">JSON Proxy</span><span className="mx-2">↔</span>
            <span className="text-purple-400">Mesh Network</span>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">{t.about.featuresTitle}</h2>
          <div className="grid gap-3">
            {t.about.features.map(([title, description], index) => (
              <Feature key={title} icon={featureIcons[index]} color={featureColors[index]} title={title} description={description} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.setupTitle}</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            {t.about.setup.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.proxyTitle}</h2>
          <div className="bg-card border border-yellow-500/30 rounded-xl p-4">
            <p className="text-muted-foreground leading-relaxed mb-3">
              <span className="text-yellow-500 font-semibold">{t.about.important}</span> {t.about.proxyImportant}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <span className="text-primary font-semibold">{t.about.recommended}</span>{' '}
              <a href="https://github.com/ewerker/mqtt-proxy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">ewerker/mqtt-proxy</a> — {t.about.proxyRecommended}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              {t.about.defaultTopic} <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono text-primary">msh/&lt;region&gt;/proxy/...</code>
            </p>
            <a href="https://github.com/ewerker/mqtt-proxy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-sm text-primary font-medium transition-colors">
              → GitHub: ewerker/mqtt-proxy
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.requirementsTitle}</h2>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            {t.about.requirements.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">{t.about.dashboardTitle}</h2>
          <div className="space-y-2 text-muted-foreground text-sm">
            {t.about.dashboard.map(([title, description]) => (
              <p key={title}><span className="text-primary font-medium">{title}</span> — {description}</p>
            ))}
          </div>
        </section>
      </main>
      <AppFooter />
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