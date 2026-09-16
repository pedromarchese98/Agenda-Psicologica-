import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import PatientDetail from './PatientDetail';
import PatientDetailModal from './PatientDetailModal';
import PatientsFilterBar from './PatientsFilterBar';

const STATUS_BADGE = {
  active: 'badge-teal', paused: 'badge-amber', suspended: 'badge-amber',
  abandoned: 'badge-rose', discharged: 'badge-violet', referred: 'badge-blue',
};
const STATUS_LABEL = {
  active: 'Activo', paused: 'Pausado', suspended: 'Suspendido',
  abandoned: 'Abandonó', discharged: 'Alta', referred: 'Derivado',
};

function initials(p) {
  return (p.first_name?.[0] || '?') + (p.last_name?.[0] || '');
}

export default async function PacientesPage({ searchParams }) {
  const supabase = createClient();
  const selectedId = searchParams?.id;
  const status = searchParams?.status || 'active';
  const q = searchParams?.q || '';

  let query = supabase.from('patients').select('*').order('first_name', { ascending: true });
  if (status !== 'all') query = query.eq('status', status);
  if (q.trim()) query = query.ilike('first_name', `%${q.trim()}%`);
  const { data: patients } = await query;

  // Última sesión de cada paciente en la lista (para mostrar debajo del nombre)
  let lastVisitByPatient = {};
  if (patients && patients.length > 0) {
    const { data: lastAppts } = await supabase
      .from('appointments')
      .select('patient_id, date')
      .eq('type', 'patient')
      .in('patient_id', patients.map((p) => p.id))
      .order('date', { ascending: false });
    (lastAppts || []).forEach((a) => {
      if (!lastVisitByPatient[a.patient_id]) lastVisitByPatient[a.patient_id] = a.date;
    });
  }

  let detail = null;
  if (selectedId) {
    const [{ data: patient }, { data: notes }, { data: allAppts }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', selectedId).single(),
      supabase.from('notes').select('*').eq('patient_id', selectedId).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', selectedId).order('date', { ascending: true }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (allAppts || []).filter((a) => a.date >= today);
    const past = (allAppts || []).filter((a) => a.date < today);

    // Las estadísticas "históricas" se calculan solo sobre turnos que ya pasaron,
    // así el % de asistencia/cancelación no se diluye con turnos futuros aún pendientes.
    const total = past.length;
    const attended = past.filter((a) => a.attendance === 'yes').length;
    const cancelled = past.filter((a) => a.attendance === 'no' || a.attendance === 'no-free').length;
    const paid = (allAppts || []).reduce((s, a) => s + (a.payment === 'paid' ? Number(a.price) || 0 : 0), 0);
    const debt = (allAppts || []).reduce((s, a) => s + (a.payment === 'unpaid' ? (Number(a.price) || 0) - (Number(a.amount_paid) || 0) : 0), 0);
    const attendanceRate = total ? Math.round((attended / total) * 100) : 0;

    detail = {
      patient, notes: notes || [], upcoming,
      stats: { total, attended, cancelled, paid, debt, attendanceRate },
    };
  }

  const backHref = `/pacientes?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100dvh - 130px)' }}>
      <div style={{ width: '100%', background: 'var(--card)' }}>
        <PatientsFilterBar status={status} q={q} />

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px 12px', padding: '4px 18px 12px',
            borderBottom: '1px solid var(--border)', marginBottom: 6,
          }}
        >
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <span key={key} className={`badge ${STATUS_BADGE[key]}`}>{label}</span>
          ))}
        </div>

        <div style={{ padding: '0 12px' }}>
          {(patients || []).map((p) => (
            <Link
              key={p.id}
              href={`/pacientes?id=${p.id}&status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className="pressable"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#E6F8F3', color: 'var(--teal-dk)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}
              >
                {initials(p)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.first_name} {p.last_name || ''}
                  <span className={`badge ${STATUS_BADGE[p.status] || 'badge-teal'}`}>{STATUS_LABEL[p.status] || 'Activo'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)', marginTop: 2 }}>
                  {lastVisitByPatient[p.id] ? `Última sesión: ${lastVisitByPatient[p.id]}` : 'Sin turnos registrados'}
                </div>
              </div>
            </Link>
          ))}
          {(!patients || patients.length === 0) && (
            <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 16 }}>
              No hay pacientes que coincidan con este filtro.
            </p>
          )}
        </div>
      </div>

      {detail && (
        <PatientDetailModal backHref={backHref}>
          <PatientDetail patient={detail.patient} notes={detail.notes} upcoming={detail.upcoming} stats={detail.stats} />
        </PatientDetailModal>
      )}
    </div>
  );
}
