// El servidor (Vercel) corre en UTC, pero la app es para uso en Argentina.
// Sin esto, "hoy" del lado del servidor se adelanta un día entre las 21:00 y las 00:00
// hora Argentina (cuando en UTC ya es el día siguiente). Estas funciones devuelven
// siempre la fecha/hora de Argentina, sin importar en qué huso corra el servidor.

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

// Devuelve un Date cuyos getFullYear()/getMonth()/getDate()/getDay() etc. reflejan
// el reloj de pared de Argentina "ahora mismo", útil para sumar/restar días con setDate().
export function nowInTz(tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // algunos motores devuelven "24" para la medianoche
  return new Date(
    parseInt(get('year'), 10),
    parseInt(get('month'), 10) - 1,
    parseInt(get('day'), 10),
    hour,
    parseInt(get('minute'), 10),
    parseInt(get('second'), 10)
  );
}

function pad(n) { return String(n).padStart(2, '0'); }

// "YYYY-MM-DD" de hoy en Argentina.
export function todayISO(tz = DEFAULT_TZ) {
  const d = nowInTz(tz);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
