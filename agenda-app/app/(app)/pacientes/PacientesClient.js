'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Laptop, Home, ChevronDown } from 'lucide-react';
import AddPatientButton from './AddPatientButton';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';
import { registerPayment } from '../analisis/actions';

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

const fmt$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

// Sin acentos y en minúscula, para que "jose" encuentre "José" y viceversa.
function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function PacientesClient({
  counts, statuses, q, patients, allPatientsForBulk, infoByPatient,
  debtByPatient = {}, debtorsCount = 0, debtorsList = [],
  initialView = 'lista', detailView = null, detailId = null,
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q || '');
  const [view, setView] = useState(initialView); // 'lista' | 'deudores' | 'ficha'

  // Cuando el detalle del paciente pedido llega desde el servidor, mostramos la ficha.
  useEffect(() => {
    if (detailId) setView('ficha');
  }, [detailId]);

  // Filtro por texto instantáneo: coincide si alguna parte del nombre contiene lo escrito (sin importar acentos).
  const visiblePatients = useMemo(() => {
    const needle = normalize(search).trim();
    if (!needle) return patients;
    return patients.filter((p) => normalize(`${p.first_name} ${p.last_name || ''}`).includes(needle));
  }, [patients, search]);

  // Mantiene el ?q= de la URL sincronizado (sin recargar ni pisar el historial) para que el link se pueda compartir.
  useEffect(() => {
    if (view !== 'lista') return;
    const t = setTimeout(() => {
      router.replace(`/pacientes?${baseParams().toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function baseParams(extra = {}) {
    const params = new URLSearchParams();
    params.set('statuses', (extra.statuses ?? statuses).join(','));
    const query = extra.q ?? search;
    if (query.trim()) params.set('q', query);
    return params;
  }

  function goList(extra = {}) {
    setView('lista');
    router.push(`/pacientes?${baseParams(extra).toString()}`);
  }

  function toggleStatus(key) {
    const isOnly = statuses.length === 1 && statuses[0] === key;
    if (statuses.includes(key)) {
      if (isOnly) return; // que quede siempre al menos una categoría elegida
      goList({ statuses: statuses.filter((s) => s !== key) });
    } else {
      goList({ statuses: [...statuses, key] });
    }
  }

  function openFicha(patientId) {
    setView('ficha');
    const params = baseParams();
    params.set('id', patientId);
    router.push(`/pacientes?${params.toString()}`);
  }

  function backToList() {
    setView('lista');
    router.push(`/pacientes?${baseParams().toString()}`);
  }

  const showTabs = view !== 'ficha';
  const loadingFicha = view === 'ficha' && !detailView;

  return (
    <div style={{ width: '100%', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
      {showTabs && (
        <div style={{ padding: '14px 16px 0' }}>
          <h2 style={{ fontSize: 17, margin: '0 0 12px' }}>Pacientes</h2>
          <div className="segmented" style={{ width: '100%', marginBottom: 14 }}>
            <button
              onClick={() => setView('lista')}
              className={`pressable segmented-item${view === 'lista' ? ' active' : ''}`}
              style={{ flex: 1, border: 'none', cursor: 'pointer' }}
            >
              Lista
            </button>
            <button
              onClick={() => setView('deudores')}
              className={`pressable segmented-item${view === 'deudores' ? ' active' : ''}`}
              style={{ flex: 1, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              Deudores
              {debtorsCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999,
                  background: 'var(--amber)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {debtorsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---- LISTA ---- */}
      {view === 'lista' && (
        <>
          <div style={{ padding: '0 16px' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 12 }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {STATUS_ORDER.map((key) => {
                const active = statuses.includes(key);
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
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <AddPatientButton compact />
              <BulkPriceUpdateModal patients={allPatientsForBulk} infoByPatient={infoByPatient} compact />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
            {visiblePatients.map((p) => {
              const info = infoByPatient[p.id];
              return (
                <div
                  key={p.id}
                  onClick={() => openFicha(p.id)}
                  className="pressable"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
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
                      {info?.modality && (info.modality === 'virtual' ? <Laptop size={11} /> : <Home size={11} />)}
                      {info ? `${fmt$(info.price)} · Última: ${info.lastVisit}` : 'Sin turnos registrados'}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-lt)', fontSize: 18, fontWeight: 600, flex: 'none' }}>›</span>
                </div>
              );
            })}
            {visiblePatients.length === 0 && (
              <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                {search.trim() ? 'Ningún paciente coincide con la búsqueda.' : 'No hay pacientes en las categorías elegidas.'}
              </p>
            )}
          </div>
        </>
      )}

      {/* ---- DEUDORES ---- */}
      {view === 'deudores' && (
        <DebtorsPanel debtorsList={debtorsList} onOpenFicha={openFicha} />
      )}

      {/* ---- FICHA ---- */}
      {view === 'ficha' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 0' }}>
            <span
              onClick={backToList}
              className="pressable"
              style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer' }}
            >
              ‹ Volver a la lista
            </span>
          </div>
          {loadingFicha ? (
            <p style={{ padding: 20, fontSize: 13, color: 'var(--text-lt)' }}>Cargando…</p>
          ) : detailView}
        </div>
      )}
    </div>
  );
}

function DebtorsPanel({ debtorsList, onOpenFicha }) {
  const [local, setLocal] = useState(debtorsList);
  const [openId, setOpenId] = useState(debtorsList.find((d) => d.items.length > 1)?.patientId || null);
  const [methodByPatient, setMethodByPatient] = useState({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => setLocal(debtorsList), [debtorsList]);

  function remaining(item) {
    return (Number(item.price) || 0) - (Number(item.amount_paid) || 0);
  }
  function methodFor(pid) {
    return methodByPatient[pid] || 'cash';
  }

  function payItem(pid, item) {
    const amount = remaining(item);
    if (amount <= 0) return;
    setLocal((prev) => prev.map((g) => (g.patientId !== pid ? g : { ...g, items: g.items.filter((i) => i.id !== item.id), total: g.total - amount })).filter((g) => g.items.length > 0));
    startTransition(() => registerPayment(item.id, amount, methodFor(pid)));
  }

  function payAll(group) {
    group.items.forEach((item) => {
      const amount = remaining(item);
      if (amount > 0) startTransition(() => registerPayment(item.id, amount, methodFor(group.patientId)));
    });
    setLocal((prev) => prev.filter((g) => g.patientId !== group.patientId));
  }

  const totAll = local.reduce((s, g) => s + g.total, 0);
  const nPat = local.length;

  return (
    <div style={{ padding: '14px 16px 90px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--amber-tint)',
        border: '1px solid var(--amber)', borderRadius: 'var(--radius-lg)', padding: 14,
      }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9A6100', textTransform: 'uppercase', letterSpacing: '.03em' }}>
            Total pendiente de cobro
          </div>
          <div style={{ fontSize: 12, color: '#8A5A00', marginTop: 2 }}>
            {nPat === 0 ? 'Nadie debe nada' : `${nPat} paciente${nPat > 1 ? 's' : ''} con deuda`}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#8A5A00' }}>{fmt$(totAll)}</div>
      </div>
      {nPat > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '2px 2px 4px' }}>
          Tocá un paciente para ver cada sesión adeudada y registrar el cobro.
        </p>
      )}

      {local.map((g) => {
        const open = openId === g.patientId;
        const sub = g.items.length > 1 ? `${g.items.length} sesiones sin cobrar` : `1 sesión sin cobrar · ${g.items[0]?.date}`;
        return (
          <div key={g.patientId} className="card" style={{ borderLeft: '4px solid var(--amber)', overflow: 'hidden' }}>
            <div
              onClick={() => setOpenId(open ? null : g.patientId)}
              className="pressable"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px 11px 14px', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)', marginTop: 1 }}>{sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#B87200' }}>{fmt$(g.total)}</span>
                <ChevronDown size={15} color="var(--text-lt)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </div>
            </div>
            {open && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '6px 12px 12px 14px' }}>
                {g.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, fontWeight: 600 }}>{item.date} · {item.time?.slice(0, 5)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>Sesión individual</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{fmt$(remaining(item))}</span>
                      <button
                        onClick={() => payItem(g.patientId, item)}
                        disabled={isPending}
                        className="pressable"
                        style={{ fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 999, padding: '6px 12px', background: 'var(--teal)', color: 'var(--navy)', cursor: 'pointer' }}
                      >
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-lt)', marginTop: 8 }}>
                  Medio:
                  {['cash', 'transfer'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethodByPatient((prev) => ({ ...prev, [g.patientId]: m }))}
                      className="pressable"
                      style={{
                        font: 'inherit', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '4px 10px', cursor: 'pointer',
                        border: methodFor(g.patientId) === m ? '1px solid var(--navy)' : '1px solid var(--border)',
                        background: methodFor(g.patientId) === m ? 'var(--navy)' : 'var(--card)',
                        color: methodFor(g.patientId) === m ? '#fff' : 'var(--text-md)',
                      }}
                    >
                      {m === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </button>
                  ))}
                </div>
                {g.items.length > 1 && (
                  <button
                    onClick={() => payAll(g)}
                    disabled={isPending}
                    className="pressable"
                    style={{ width: '100%', marginTop: 10, fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 999, padding: 10, background: 'var(--navy)', color: '#fff', cursor: 'pointer' }}
                  >
                    Cobrar todo · {fmt$(g.total)}
                  </button>
                )}
                <button
                  onClick={() => onOpenFicha(g.patientId)}
                  className="pressable"
                  style={{ width: '100%', marginTop: 8, fontSize: 11.5, fontWeight: 700, background: 'none', border: 'none', color: 'var(--teal-dk)', cursor: 'pointer' }}
                >
                  Ver ficha del paciente ›
                </button>
              </div>
            )}
          </div>
        );
      })}
      {nPat === 0 && (
        <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 20, textAlign: 'center' }}>Sin deudores 🙌</p>
      )}
    </div>
  );
}
