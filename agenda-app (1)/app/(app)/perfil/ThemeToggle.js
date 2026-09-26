'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { getStoredTheme, applyTheme } from '@/lib/theme';

const OPTIONS = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Oscuro', icon: Moon },
  { key: 'auto', label: 'Automático', icon: MonitorSmartphone },
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
    <div className="segmented" style={{ width: '100%', opacity: mounted ? 1 : 0 }}>
      {OPTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => choose(key)}
          className={`segmented-item pressable ${theme === key ? 'active' : ''}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', cursor: 'pointer' }}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
