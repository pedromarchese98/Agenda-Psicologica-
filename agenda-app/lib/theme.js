'use client';

const KEY = 'theme';

/** 'light' | 'dark' | 'auto' */
export function getStoredTheme() {
  if (typeof window === 'undefined') return 'auto';
  try {
    const t = localStorage.getItem(KEY);
    return t === 'dark' || t === 'light' ? t : 'auto';
  } catch (e) {
    return 'auto';
  }
}

export function applyTheme(theme) {
  try {
    if (theme === 'dark' || theme === 'light') {
      localStorage.setItem(KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      localStorage.removeItem(KEY);
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {
    /* localStorage no disponible (modo privado, etc.) */
  }
}
