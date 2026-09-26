import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/date';
import PatientDetail from './PatientDetail';
import PacientesClient from './PacientesClient';

export default async function PacientesPage({ searchParams }) {
  const supabase = createClient();
  const selectedId = searchParams?.id;
  const statuses = (searchParams?.statuses || 'active').split(',').filter(Boolean);
  const q = searchParams?.q || '';
  const debtorsParam = searchParams?.debtors === '1';

  const { data: allPatients } = await supabase.from('patients').select('*').order('first_name', { ascending: true });

  // Última sesión + modalidad + precio actuales, para mostrar en la lista y en el checklist de precios.
  let infoByPatient = {};
  // Turnos impagos por paciente, para armar la pestaña "Deudores" (detalle sesión por sesión).
  let debtItemsByPatient = {};
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
        .select('id, patient_id, date, time, price, amount_paid')
        .eq('type', 'patient')
        .eq('payment', 'unpaid')
        .in('patient_id', allPatients.map((p) => p.id))
        .order('date', { ascending: true }),
    ]);
    (appts || []).forEach((a) => {
      if (!infoByPatient[a.patient_id]) {
        infoByPatient[a.patient_id] = { lastVisit: a.date, modality: a.modality, price: a.price };
      }
    });
    (unpaid || []).forEach((a) => {
      if (!debtItemsByPatient[a.patient_id]) debtItemsByPatient[a.patient_id] = [];
      debtItemsByPatient[a.patient_id].push(a);
    });
  }

  const counts = {};
  (allPatients || []).forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });

  const debtByPatient = {};
  Object.entries(debtItemsByPatient).forEach(([pid, items]) => {
    debtByPatient[pid] = items.reduce((s, a) => s + ((Number(a.price) || 0) - (Number(a.amount_paid) || 0)), 0);
  });
  const debtorsCount = Object.values(debtByPatient).filter((d) => d > 0.01).length;

  // Lista de deudores con el detalle de cada sesión adeudada, para la pestaña "Deudores".
  const patientById = {};
  (allPatients || []).forEach((p) => { patientById[p.id] = p; });
  const debtorsList = Object.entries(debtItemsByPatient)
    .map(([pid, items]) => {
      const p = patientById[pid];
      if (!p) return null;
      const total = items.reduce((s, a) => s + ((Number(a.price) || 0) - (Number(a.amount_paid) || 0)), 0);
      if (total <= 0.01) return null;
      return {
        patientId: pid,
        name: `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`,
        items: items.map((a) => ({ id: a.id, date: a.date, time: a.time, price: a.price, amount_paid: a.amount_paid })),
        total,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  // El filtro por texto de búsqueda se aplica en el cliente (instantáneo, a medida que se escribe).
  const filtered = (allPatients || []).filter((p) => statuses.includes(p.status));

  let detail = null;
  if (selectedId) {
    const [{ data: patient }, { data: notes }, { data: allAppts }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', selectedId).single(),
      supabase.from('notes').select('*').eq('patient_id', selectedId).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', selectedId).eq('type', 'patient').order('date', { ascending: true }),
    ]);

    const today = todayISO();
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
    const firstDate = (allAppts || []).length ? allAppts[0].date : null;

    detail = {
      patient, notes: notes || [], upcoming,
      stats: { total, attended, cancelled, paid, debt, attendanceRate, firstDate },
      priceVirtual: nextVirtual?.price ?? null,
      pricePresencial: nextPresencial?.price ?? null,
    };
  }

  return (
    <PacientesClient
      counts={counts}
      statuses={statuses}
      q={q}
      patients={filtered}
      allPatientsForBulk={allPatients || []}
      infoByPatient={infoByPatient}
      debtByPatient={debtByPatient}
      debtorsCount={debtorsCount}
      debtorsList={debtorsList}
      initialView={selectedId ? 'ficha' : (debtorsParam ? 'deudores' : 'lista')}
      detailView={detail && (
        <PatientDetail
          patient={detail.patient} notes={detail.notes} upcoming={detail.upcoming} stats={detail.stats}
          priceVirtual={detail.priceVirtual} pricePresencial={detail.pricePresencial}
        />
      )}
      detailId={detail?.patient?.id || null}
    />
  );
}
