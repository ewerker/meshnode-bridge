import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, MessageSquare, Cpu, ShieldCheck, LogIn, Wifi, Mail, Network, Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';


const topicIcons = [Network, Radio, MessageSquare, Zap, Cpu, Mail];

const screenshotImages = [
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/259106849_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/d66f4c810_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/bf16da12b_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/704eb2f97_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/6248ea2d2_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/d3da7adf4_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/b7c4de2e5_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/4ac1df23b_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/8663c8022_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/19fcbce6d_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/174cda4c9_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/c4d8af1b0_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/6ee25039a_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/46fe7636a_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/26b5aebe5_Screenshot2026-05-07123008.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/25428cb24_image.png'],
  ['https://media.base44.com/images/public/69cb722a8da55dd42eb76464/688b804d5_image.png', 'https://media.base44.com/images/public/69cb722a8da55dd42eb76464/72b184d67_image.png'],
];

export default function Landing() {
  const { navigateToLogin } = useAuth();
  const { resolved, setTheme } = useTheme();
  const { t } = useLanguage();
  const [previewShot, setPreviewShot] = useState(null);
  const topics = t.landing.topics.map(([title, text], index) => ({ icon: topicIcons[index], title, text }));
  const screenshotCards = t.landing.screenshots.map(([title, subtitle], index) => ({
    title,
    subtitle,
    lightImage: screenshotImages[index][0],
    darkImage: screenshotImages[index][1],
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-6">
            <Radio className="w-4 h-4" />
            {t.landing.badge}
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            {t.landing.title}
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t.landing.intro}
          </p>

          <p className="mt-4 text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t.landing.proxyIntroPrefix} <a href="https://github.com/ewerker/mqtt-proxy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">W-2 MQTT-Proxy</a> {t.landing.proxyIntroSuffix}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => navigateToLogin()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <LogIn className="w-5 h-5" />
              {t.common.login}
            </button>
            <button
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-sm text-foreground transition-colors"
            >
              {resolved === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
              {resolved === 'dark' ? t.theme.dayOn : t.theme.nightOn}
            </button>
            <LanguageToggle />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">{t.landing.capabilitiesTitle}</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              {t.landing.capabilitiesText}
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
            <h2 className="text-2xl font-bold mb-3">{t.landing.robustTitle}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t.landing.robustText}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {screenshotCards.map((shot, idx) => (
              <div key={shot.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="h-44 bg-gradient-to-br from-secondary via-card to-primary/20 overflow-hidden">
                  {shot.lightImage ? (
                    <button
                      type="button"
                      onClick={() => setPreviewShot(shot)}
                      className="relative w-full h-full group cursor-zoom-in"
                      aria-label={`${shot.title} ${t.common.zoom}`}
                    >
                      <img
                        src={resolved === 'dark' ? shot.lightImage : shot.darkImage}
                        alt={shot.title}
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-3 bottom-3 rounded-lg bg-background/85 border border-border px-3 py-1.5 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.common.zoom}
                      </span>
                    </button>
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
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider">{t.common.screenshot} {idx + 1}</p>
                  <h3 className="font-semibold mt-1">{shot.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{shot.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {previewShot && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center"
          onClick={() => setPreviewShot(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewShot(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-foreground text-2xl leading-none"
            aria-label={t.common.close}
          >
            ×
          </button>
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-left">
              <h3 className="text-lg font-semibold">{previewShot.title}</h3>
              <p className="text-sm text-muted-foreground">{previewShot.subtitle}</p>
            </div>
            <img
              src={resolved === 'dark' ? previewShot.lightImage : previewShot.darkImage}
              alt={previewShot.title}
              className="w-full max-h-[78vh] object-contain rounded-2xl border border-border shadow-2xl shadow-black/40 bg-card"
            />
          </div>
        </div>
      )}

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-5 flex justify-center text-sm text-muted-foreground">
          <Link to="/imprint" className="hover:text-foreground transition-colors">{t.common.imprint}</Link>
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