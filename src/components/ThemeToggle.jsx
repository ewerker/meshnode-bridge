import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

const MODES = ['light', 'dark', 'auto'];
const ICONS = { light: Sun, dark: Moon, auto: Monitor };
const LABELS = { light: 'Light', dark: 'Dark', auto: 'Auto' };

export default function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  const next = () => {
    const idx = MODES.indexOf(preference);
    setTheme(MODES[(idx + 1) % MODES.length]);
  };

  const Icon = ICONS[preference];

  return (
    <button
      onClick={next}
      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      title={`Theme: ${LABELS[preference]}`}
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}