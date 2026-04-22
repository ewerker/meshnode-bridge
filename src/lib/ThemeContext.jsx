import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const LS_KEY = 'mesh_theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference) {
  if (preference === 'auto') return getSystemTheme();
  return preference;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => localStorage.getItem(LS_KEY) || 'auto');
  const [resolved, setResolved] = useState(() => resolveTheme(localStorage.getItem(LS_KEY) || 'auto'));

  useEffect(() => {
    const apply = () => setResolved(resolveTheme(preference));
    apply();

    if (preference === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [preference]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  const setTheme = (t) => {
    setPreference(t);
    localStorage.setItem(LS_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ preference, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}