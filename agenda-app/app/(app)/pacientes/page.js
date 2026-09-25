import { createClient } from '@/lib/supabase/server';
import PatientDetail from './PatientDetail';
import PatientDetailModal from './PatientDetailModal';
import PatientsBoard from './PatientsBoard';

export default async function PacientesPage({ searchParams }) {
  const supabase = createClient();
  const selectedId = searchParams?.id;
  const statuses = (searchParams?.statuses || 'active').split(',').filter(Boolean);
  const q = searchParams?.q || '';
  const debtorsOnly = searchParams?.debtors === '1';

  const { data: allPatients } = await supabase.from('patients').select('*').order('first_name', { ascending: true });

  // Última sesión + modalidad + precio actuales, para mostrar en la lista y en el checklist de precios.
  let infoByPatient = {};
  // Deuda total por paciente (turnos con payment='unpaid'), para el filtro "Deudores".
  let debtByPatient = {};
  if (allPatients && allPatients.length > 0) {
    const [{ data: appts }, { data: unpaid }] = await Promise.all([
      supabase
        .from('appointments')
        .select('patient_id, date, modality, price')
        .eq('type', 'patient')
        .in('patient_id', allPatients.map((p) => p.id))
        .order('date', { ascending: false }),
      supabase
        .from('appointments')
        .select('patient_id, price, amount_paid')
        .eq('type', 'patient')
        .eq('payment', 'unpaid')
        .in('patient_id', allPatients.map((p) => p.id)),
    ]);
    (appts || []).forEach((a) => {
      if (!infoByPatient[a.patient_id]) {
        infoByPatient[a.patient_id] = { lastVisit: a.date, modality: a.modality, price: a.price };
      }
    });
    (unpaid || []).forEach((a) => {
      debtByPatient[a.patient_id] = (debtByPatient[a.patient_id] || 0) + ((Number(a.price) || 0) - (Number(a.amount_paid) || 0));
    });
  }

  const counts = {};
  (allPatients || []).forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
  const debtorsCount = Object.values(debtByPatient).filter((d) => d > 0).length;

  const filtered = (allPatients || []).filter((p) => {
    if (debtorsOnly) return (debtByPatient[p.id] || 0) > 0;
    if (!statuses.includes(p.status)) return false;
    if (q.trim() && !`${p.first_name} ${p.last_name || ''}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  let detail = null;
  if (selectedId) {
    const [{ data: patient }, { data: notes }, { data: allAppts }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', selectedId).single(),
      supabase.from('notes').select('*').eq('patient_id', selectedId).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', selectedId).eq('type', 'patient').order('date', { ascending: true }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (allAppts || []).filter((a) => a.date >= today);
    const past = (allAppts || []).filter((a) => a.date < today);

    const total = past.length;
    const attended = past.filter((a) => a.attendance === 'yes').length;
    const cancelled = past.filter((a) => a.attendance === 'no' || a.attendance === 'no-free').length;
    const paid = (allAppts || []).reduce((s, a) => s + (a.payment === 'paid' ? Number(a.price) || 0 : 0), 0);
    const debt = (allAppts || []).reduce((s, a) => s + (a.payment === 'unpaid' ? (Number(a.price) || 0) - (Number(a.amount_paid) || 0) : 0), 0);
    const attendanceRate = total ? Math.round((attended / total) * 100) : 0;

    const nextVirtual = [...upcoming].find((a) => a.modality === 'virtual') || [...past].reverse().find((a) => a.modality === 'virtual');
    const nextPresencial = [...upcoming].find((a) => a.modality === 'presencial') || [...past].reverse().find((a) => a.modality === 'presencial');
    const pendingPayments = (allAppts || [])
      .filter((a) => a.payment === 'unpaid')
      .sort((a, b) => a.date.localeCompare(b.date));

    detail = {
      patient, notes: notes || [], upcoming, pendingPayments,
      stats: { total, attended, cancelled, paid, debt, attendanceRate },
      priceVirtual: nextVirtual?.price ?? null,
      pricePresencial: nextPresencial?.price ?? null,
    };
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100dvh - 130px)' }}>
      <PatientsBoard
        allCount={(allPatients || []).length}
        counts={counts}
        statuses={statuses}
        q={q}
        patients={filtered}
        allPatientsForBulk={allPatients || []}
        infoByPatient={infoByPatient}
        debtByPatient={debtByPatient}
        debtorsCount={debtorsCount}
        debtorsOnly={debtorsOnly}
      />

      {detail && (
        <PatientDetailModal backHref={`/pacientes?statuses=${statuses.join(',')}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>
          <PatientDetail
            patient={detail.patient} notes={detail.notes} upcoming={detail.upcoming} stats={detail.stats}
            priceVirtual={detail.priceVirtual} pricePresencial={detail.pricePresencial}
            pendingPayments={detail.pendingPayments}
          />
        </PatientDetailModal>
      )}
    </div>
  );
}
