// Duración fija asumida por turno, en minutos.
export const SESSION_MINUTES = 45;

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ¿Se superponen dos turnos de 45' que empiezan en aStart / bStart (en minutos desde 00:00)?
export function rangesOverlap(aStart, bStart, duration = SESSION_MINUTES) {
  return aStart < bStart + duration && bStart < aStart + duration;
}

// Dado un turno y la lista completa del día, ¿con cuáles otros se superpone?
export function findConflicts(appt, allAppts) {
  const start = timeToMinutes(appt.time);
  return allAppts.filter(
    (other) => other.id !== appt.id && rangesOverlap(start, timeToMinutes(other.time))
  );
}
