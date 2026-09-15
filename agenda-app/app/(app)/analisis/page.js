import { createClient } from '@/lib/supabase/server';

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default async function AnalisisPage() {
  const supabase = createClient();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().slice(0, 10);

  const { data: appts } = await supabase
    .from('appointments')
    .select('*, patients(first_name, last_name)')
    .eq('type', 'patient')
    .gte('date', monthStart)
    .lte('date', today);

  const list = appts || [];
  const total = list.length;
  const attended = list.filter((a) => a.attendance === 'yes').length;
  const cancelled = list.filter((a) => a.attendance === 'no' || a.attendance === 'no-free').length;
  const collected = list.filter((a) => a.payment === 'paid').reduce((s, a) => s + Number(a.price || 0), 0);
  const debt = list.filter((a) => a.payment === 'unpaid').reduce((s, a) => s + Number(a.price || 0), 0);
  const attendanceRate = total ? Math.round((attended / total) * 100) : 0;

  const byPatient = {};
  list.forEach((a) => {
    const key = a.patients ? `${a.patients.first_name} ${a.patients.last_name || ''}`.trim() : 'Sin nombre';
    if (!byPatient[key]) byPatient[key] = { total: 0, debt: 0 };
    byPatient[key].total++;
    if (a.payment === 'unpaid') byPatient[key].debt += Number(a.price || 0);
  });
  const debtors = Object.entries(byPatient)
    .filter(([, v]) => v.debt > 0)
    .sort((a, b) => b[1].debt - a[1].debt);

  const kpis = [
    { label: 'Sesiones (mes)', value: total, color: 'var(--teal)' },
    { label: 'Asistencia', value: `${attendanceRate}%`, color: 'var(--sage)' },
    { label: 'Cancelaciones', value: cancelled, color: 'var(--rose)' },
    { label: 'Recaudado', value: fmt$(collected), color: 'var(--teal)' },
    { label: 'Pendiente de cobro', value: fmt$(debt), color: 'var(--amber)' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>Análisis — mes en curso</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card" style={{ padding: 14, borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase' }}>
              {k.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 12 }}>
          Deudores del mes
        </div>
        {debtors.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin deudores este mes 🙌</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {debtors.map(([name, v]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{name}</span>
                <strong style={{ color: 'var(--amber)' }}>{fmt$(v.debt)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-lt)', marginTop: 20, textAlign: 'center' }}>
        Próximamente: gráficos de evolución, comparativas por período y tasa de abandono por paciente.
      </p>
    </div>
  );
}
