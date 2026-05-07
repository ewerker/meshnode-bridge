import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === 'de' ? 'en' : 'de';

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
      title={t.common.language}
      aria-label={t.common.language}
    >
      <Languages className="w-4 h-4 text-primary" />
      <span className="font-mono uppercase">{language}</span>
    </button>
  );
}