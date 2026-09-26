// Feriados de Argentina, vía la API pública y gratuita de ArgentinaDatos.
// No requiere API key. Se actualiza sola cada vez que cambian las resoluciones oficiales;
// Next.js cachea la respuesta y la revalida una vez por mes.
export async function getHolidays(year) {
  try {
    const res = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (data || []).forEach((h) => {
      if (h?.fecha) map[h.fecha] = h.nombre || h.motivo || 'Feriado';
    });
    return map;
  } catch (err) {
    console.error('No se pudieron obtener los feriados', err);
    return {};
  }
}
