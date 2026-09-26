'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Smartphone } from 'lucide-react';
import { getStoredTheme, applyTheme } from '@/lib/theme';

const OPTIONS = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Oscuro', icon: Moon },
  { key: 'auto', label: 'Sistema', icon: Smartphone },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

  function choose(key) {
    setTheme(key);
    applyTheme(key);
  }

  return (
    <div className="segmented" role="group" aria-label="Tema de la aplicación" style={{ width: '100%', padding: 4, gap: 4, opacity: mounted ? 1 : 0 }}>
      {OPTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => choose(key)}
          aria-pressed={theme === key}
          className={`segmented-item pressable ${theme === key ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px 6px' }}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}
