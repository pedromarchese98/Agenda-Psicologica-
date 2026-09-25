// Identidad de marca centralizada: nombre y logo (ícono "Calendario + Ψ").
// Cambiarlos acá los actualiza en toda la app (header, login, landing, manifest, etc).

export const APP_NAME = 'PsicoCalendar';
export const APP_TAGLINE = 'Hecha por y para psicólogos';

export function LogoIcon({ size = 18, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M12 10v8" />
      <path d="M8.5 10.5v1a3.5 3.5 0 0 0 7 0v-1" />
    </svg>
  );
}
