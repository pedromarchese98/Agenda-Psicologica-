import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import PatientDetail from './PatientDetail';
import PatientsFilterBar from './PatientsFilterBar';

const STATUS_DOT = {
  active: '🟢', paused: '🟡', suspended: '🟠', abandoned: '🔴', discharged: '🟣', referred: '🔵',
};
const STATUS_LABEL = {
  active: 'Activo', paused: 'Pausado', suspended: 'Suspendido',
  abandoned: 'Abandonó', discharged: 'Alta', referred: 'Derivado',
};

export default async function PacientesPage({ searchParams }) {
  const supabase = createClient();
  const selectedId = searchParams?.id;
  const status = searchParams?.status || 'active';
  const q = searchParams?.q || '';

  let query = supabase.from('patients').select('*').order('first_name', { ascending: true });
  if (status !== 'all') query = query.eq('status', status);
  if (q.trim()) query = query.ilike('first_name', `%${q.trim()}%`);
  const { data: patients } = await query;

  let detail = null;
  if (selectedId) {
    const [{ data: patient }, { data: notes }, { data: upcoming }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', selectedId).single(),
      supabase.from('notes').select('*').eq('patient_id', selectedId).order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', selectedId)
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date', { ascending: true }),
    ]);
    detail = { patient, notes: notes || [], upcoming: upcoming || [] };
  }

  const backHref = `/pacientes?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100dvh - 130px)' }}>
      <div
        style={{
          width: detail ? 0 : '100%',
          maxWidth: detail ? 0 : 'none',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
        }}
        className="patients-list-col"
      >
        <PatientsFilterBar status={status} q={q} />

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px 12px', padding: '4px 18px 12px',
            borderBottom: '1px solid var(--border)', marginBottom: 6,
          }}
        >
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {STATUS_DOT[key]} {label}
            </span>
          ))}
        </div>

        <div style={{ padding: '0 14px' }}>
          {(patients || []).map((p) => (
            <Link
              key={p.id}
              href={`/pacientes?id=${p.id}&status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              style={{ display: 'block', padding: '12px 8px', borderBottom: '1px solid var(--border)' }}
              className="pressable"
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {STATUS_DOT[p.status] || '🟢'} {p.first_name} {p.last_name || ''}
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
        <div style={{ flex: 1, background: 'var(--surface)' }}>
          <div style={{ padding: '10px 16px 0' }}>
            <Link href={backHref} style={{ fontSize: 13, color: 'var(--teal-dk)', fontWeight: 700 }}>
              ‹ Todos los pacientes
            </Link>
          </div>
          <PatientDetail patient={detail.patient} notes={detail.notes} upcoming={detail.upcoming} />
        </div>
      )}
    </div>
  );
}
