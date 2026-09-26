'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign, Laptop, Home } from 'lucide-react';
import AddPatientButton from './AddPatientButton';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';

const STATUS_ORDER = ['active', 'paused', 'suspended', 'discharged', 'abandoned', 'referred'];
const STATUS_BADGE = {
  active: 'badge-teal', paused: 'badge-amber', suspended: 'badge-amber',
  abandoned: 'badge-rose', discharged: 'badge-violet', referred: 'badge-blue',
};
const STATUS_LABEL = {
  active: 'Activos', paused: 'Pausados', suspended: 'Suspendidos',
  abandoned: 'Abandonaron', discharged: 'De alta', referred: 'Derivados',
};

function initials(p) {
  return (p.first_name?.[0] || '?') + (p.last_name?.[0] || '');
}

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');

export default function PatientsBoard({
  counts, statuses, q, patients, allPatientsForBulk, infoByPatient,
  debtByPatient = {}, debtorsCount = 0, debtorsOnly = false,
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q || '');

  function pushParams(next) {
    const params = new URLSearchParams();
    if (next.debtors ?? debtorsOnly) {
      params.set('debtors', '1');
    } else {
      params.set('statuses', (next.statuses ?? statuses).join(','));
      const query = next.q ?? search;
      if (query.trim()) params.set('q', query);
    }
    router.push(`/pacientes?${params.toString()}`);
  }

  function toggleStatus(key) {
    const isOnly = statuses.length === 1 && statuses[0] === key;
    if (statuses.includes(key)) {
      if (isOnly) return; // que quede siempre al menos una categoría elegida
      pushParams({ statuses: statuses.filter((s) => s !== key), debtors: false });
    } else {
      pushParams({ statuses: [...statuses, key], debtors: false });
    }
  }

  function toggleDebtors() {
    pushParams({ debtors: !debtorsOnly });
  }

  return (
    <div style={{ width: '100%', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 0' }}>
        <h2 style={{ fontSize: 17, margin: '0 0 12px' }}>Pacientes</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pushParams({ debtors: false })}
          onBlur={() => pushParams({ debtors: false })}
          placeholder="Buscar por nombre…"
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 12 }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {STATUS_ORDER.map((key) => {
            const active = !debtorsOnly && statuses.includes(key);
            const count = counts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => toggleStatus(key)}
                className={`pressable badge ${active ? STATUS_BADGE[key] : 'badge-neutral'}`}
                style={{ border: 'none', cursor: 'pointer', opacity: count === 0 ? 0.4 : 1, fontSize: 12, padding: '6px 11px' }}
              >
                {STATUS_LABEL[key]} · {count}
              </button>
            );
          })}
          <button
            onClick={toggleDebtors}
            className={`pressable badge ${debtorsOnly ? 'badge-amber' : 'badge-neutral'}`}
            style={{ border: 'none', cursor: 'pointer', opacity: debtorsCount === 0 ? 0.4 : 1, fontSize: 12, padding: '6px 11px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            <DollarSign size={11} /> Deudores · {debtorsCount}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <AddPatientButton compact />
          <BulkPriceUpdateModal patients={allPatientsForBulk} infoByPatient={infoByPatient} compact />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
        {debtorsOnly && patients.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-lt)', padding: '6px 6px 2px' }}>
            Pacientes con pagos pendientes. Tocá uno para ver el detalle y registrar el pago.
          </p>
        )}
        {patients.map((p) => {
          const info = infoByPatient[p.id];
          const debt = debtByPatient[p.id] || 0;
          return (
            <Link
              key={p.id}
              href={`/pacientes?id=${p.id}&statuses=${statuses.join(',')}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className="pressable"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal-tint)', color: 'var(--teal-dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {initials(p)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.first_name} {p.last_name || ''}
                  <span className={`badge ${STATUS_BADGE[p.status] || 'badge-teal'}`}>{STATUS_LABEL[p.status]?.replace(/s$/, '') || 'Activo'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {debtorsOnly && debt > 0 ? (
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Debe {fmt$(debt)}</span>
                  ) : (
                    <>
                      {info?.modality && (info.modality === 'virtual' ? <Laptop size={11} /> : <Home size={11} />)}
                      {info ? `${fmt$(info.price)} · Última: ${info.lastVisit}` : 'Sin turnos registrados'}
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {patients.length === 0 && (
          <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 20, textAlign: 'center' }}>
            {debtorsOnly ? 'Sin deudores 🙌' : 'No hay pacientes en las categorías elegidas.'}
          </p>
        )}
      </div>
    </div>
  );
}
