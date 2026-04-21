import { ArrowLeft, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Imprint() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-600/40 flex items-center justify-center">
            <Scale className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="font-bold text-white tracking-tight">Imprint & Disclaimer</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Impressum */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Imprint</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-slate-400">
            <p className="text-cyan-400 font-semibold text-lg">DoubleU2 (we-zwei)</p>
            <p><span className="text-slate-500">Owner:</span> Frank Richter</p>
            <div>
              <p className="text-slate-500 text-sm mb-1">Address</p>
              <p>Kräuterweg 9</p>
              <p>04683 Naunhof</p>
              <p>Germany</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm mb-1">Contact</p>
              <p>
                <a href="tel:+4934293470571" className="text-cyan-400 hover:underline">+49 (0) 34293 470571</a>
              </p>
              <p>+49 (0) 34293 470572 (Fax)</p>
              <p>
                <a href="mailto:richter@w-2.de" className="text-cyan-400 hover:underline">richter@w-2.de</a>
              </p>
              <p>
                <a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">https://w-2.de</a>
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Disclaimer</h2>
          <div className="space-y-6">
            <DisclaimerSection
              title="Liability for Content"
              text="The contents of our pages were created with the greatest care. However, we cannot guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content on these pages in accordance with § 7 para. 1 TMG (German Telemedia Act). According to §§ 8 to 10 TMG, however, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity."
            />
            <DisclaimerSection
              title="Liability for Links"
              text="Our website contains links to external third-party websites over whose content we have no influence. Therefore, we cannot assume any liability for this third-party content. The respective provider or operator of the pages is always responsible for the content of the linked pages. The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking."
            />
            <DisclaimerSection
              title="Copyright"
              text="The content and works created by the site operators on these pages are subject to German copyright law. Reproduction, editing, distribution, and any kind of exploitation beyond the limits of copyright law require the written consent of the respective author or creator."
            />
            <DisclaimerSection
              title="Data Privacy"
              text="We take the protection of your personal data very seriously. All collected data is processed exclusively for the provision of our services and is not shared with third parties. Processing is carried out only for our own purposes within the scope of our IT services. Different privacy terms may apply within individual apps, which are viewable within the respective application."
            />
            <DisclaimerSection
              title="Warranty and Liability"
              text="We provide warranty within the scope of statutory provisions. Liability for slight negligence is excluded, unless damages resulting from injury to life, body, or health, or guarantees are affected, or claims under the Product Liability Act are involved."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function DisclaimerSection({ title, text }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}