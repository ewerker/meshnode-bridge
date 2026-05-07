import { ArrowLeft, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/LanguageContext';
import AppFooter from '@/components/AppFooter';

export default function Imprint() {
  const { language } = useLanguage();
  const isDe = language === 'de';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-bold text-foreground tracking-tight">{isDe ? 'Impressum & Haftungsausschluss' : 'Imprint & Disclaimer'}</h1>
          <div className="ml-auto flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        {/* Impressum */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">{isDe ? 'Impressum' : 'Imprint'}</h2>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-muted-foreground">
            <p className="text-primary font-semibold text-lg">DoubleU2 (we-zwei)</p>
            <p><span className="text-muted-foreground">{isDe ? 'Inhaber:' : 'Owner:'}</span> Frank Richter</p>
            <div>
              <p className="text-muted-foreground text-sm mb-1">{isDe ? 'Anschrift' : 'Address'}</p>
              <p>Kräuterweg 9</p>
              <p>04683 Naunhof</p>
              <p>{isDe ? 'Deutschland' : 'Germany'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Kontakt</p>
              <p>
                <a href="tel:+4934293470571" className="text-primary hover:underline">+49 (0) 34293 470571</a>
              </p>
              <p>+49 (0) 34293 470572 (Fax)</p>
              <p>
                <a href="mailto:richter@w-2.de" className="text-primary hover:underline">richter@w-2.de</a>
              </p>
              <p>
                🌐 <a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://w-2.de</a>
              </p>
            </div>
          </div>
        </section>

        {/* Haftungsausschluss */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Haftungsausschluss</h2>
          <div className="space-y-6">
            <DisclaimerSection
              title="Haftung für Inhalte"
              text="Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen."
            />
            <DisclaimerSection
              title="Haftung für Links"
              text="Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar."
            />
            <DisclaimerSection
              title="Urheberrecht"
              text="Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers."
            />
            <DisclaimerSection
              title="Datenschutz"
              text="Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Alle erhobenen Daten werden ausschließlich für die Erbringung unserer Dienstleistungen verarbeitet und nicht an Dritte weitergegeben. Die Verarbeitung erfolgt nur für eigene Verwendungszwecke im Rahmen unserer IT-Dienstleistungen. In den einzelnen Apps können abweichende Datenschutzbedingungen gelten, die jeweils in der entsprechenden Anwendung einsehbar sind."
            />
            <DisclaimerSection
              title="Gewährleistung und Haftung"
              text="Wir übernehmen die Gewährleistung im Rahmen der gesetzlichen Bestimmungen. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit nicht Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit oder Garantien betroffen sind oder Ansprüche nach dem Produkthaftungsgesetz berührt sind."
            />
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

function DisclaimerSection({ title, text }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}