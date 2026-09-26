'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Laptop, Home, ChevronDown, ChevronRight } from 'lucide-react';
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
const STATUS_SINGULAR = {
  active: 'Activo', paused: 'Pausado', suspended: 'Suspendido',
  abandoned: 'Abandonó', discharged: 'De alta', referred: 'Derivado',
};
// Color del borde izquierdo de cada fila, según el estado del tratamiento.
const STATUS_EDGE = {
  active: 'var(--teal-dk)', paused: 'var(--warning)', suspended: 'var(--warning)',
  abandoned: 'var(--danger)', discharged: 'var(--violet)', referred: 'var(--info)',
};
const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// "2026-09-18" → "18/09"
function ddmm(dateStr) {
  if (!dateStr) return '';
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}
// "2026-09-18" → "Jue 18/09"
function dowDdmm(dateStr) {
  return `${DOW_SHORT[new Date(dateStr + 'T00:00:00').getDay()]} ${ddmm(dateStr)}`;
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
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
      {showTabs && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="segmented" style={{ width: '100%' }}>
            <button
              onClick={() => setView('lista')}
              className={`pressable segmented-item${view === 'lista' ? ' active' : ''}`}
              style={{ flex: 1 }}
            >
              Lista
            </button>
            <button
              onClick={() => setView('deudores')}
              className={`pressable segmented-item${view === 'deudores' ? ' active' : ''}`}
              style={{ flex: 1 }}
            >
              Deudores
              {debtorsCount > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999,
                  background: 'var(--warning)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
            <AddPatientButton compact />
            <BulkPriceUpdateModal patients={allPatientsForBulk} infoByPatient={infoByPatient} compact />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 16px 12px' }}>
            {STATUS_ORDER.map((key) => {
              const active = statuses.includes(key);
              const count = counts[key] || 0;
              const amber = active && (key === 'paused' || key === 'suspended');
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  aria-pressed={active}
                  className="pressable"
                  style={{
                    border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                    background: amber ? 'var(--warning-tint)' : active ? 'var(--btn)' : 'var(--muted)',
                    color: amber ? 'var(--warning-text)' : active ? 'var(--btn-fg)' : 'var(--text-md)',
                    opacity: count === 0 && !active ? 0.5 : 1,
                  }}
                >
                  {STATUS_LABEL[key]} · {count}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '0 16px 12px' }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              aria-label="Buscar paciente"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 12, background: 'var(--muted)', fontSize: 14 }}
            />
          </div>

          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visiblePatients.map((p) => {
              const info = infoByPatient[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => openFicha(p.id)}
                  className="card pressable"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', textAlign: 'left',
                    borderLeft: `4px solid ${STATUS_EDGE[p.status] || 'var(--teal-dk)'}`, color: 'var(--text)', font: 'inherit', width: '100%',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.first_name} {p.last_name || ''}</span>
                      <span className={`badge ${STATUS_BADGE[p.status] || 'badge-teal'}`} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px' }}>
                        {STATUS_SINGULAR[p.status] || 'Activo'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-lt)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {info?.modality && (info.modality === 'virtual'
                        ? <Laptop size={11} aria-label="Virtual" />
                        : <Home size={11} aria-label="Presencial" />)}
                      {info ? `${fmt$(info.price)} · Última: ${ddmm(info.lastVisit)}` : 'Sin turnos registrados'}
                    </div>
                  </div>
                  <ChevronRight size={17} color="var(--text-lt)" style={{ flex: 'none' }} />
                </button>
              );
            })}
            {visiblePatients.length === 0 && (
              <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 20, textAlign: 'center', margin: 0 }}>
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
          <div style={{ padding: '18px 16px 0' }}>
            <button
              onClick={backToList}
              className="pressable"
              style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--teal-dk)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              ‹ Volver a la lista
            </button>
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
    <div style={{ padding: '14px 16px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--warning-tint)',
        border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)', borderRadius: 'var(--radius-lg)', padding: 14,
      }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--warning-text)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
            Total pendiente de cobro
          </div>
          <div style={{ fontSize: 12, color: 'var(--warning-text)', marginTop: 2 }}>
            {nPat === 0 ? 'Nadie debe nada' : `${nPat} paciente${nPat > 1 ? 's' : ''} con deuda`}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 21, fontWeight: 800, color: 'var(--warning-text)' }}>{fmt$(totAll)}</div>
      </div>
      {nPat > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '2px 2px 4px' }}>
          Tocá un paciente para ver cada sesión adeudada y registrar el cobro.
        </p>
      )}

      {local.map((g) => {
        const open = openId === g.patientId;
        const sub = g.items.length > 1 ? `${g.items.length} sesiones sin cobrar` : `1 sesión sin cobrar · ${ddmm(g.items[0]?.date)}`;
        return (
          <div key={g.patientId} className="card" style={{ borderLeft: '4px solid var(--warning)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : g.patientId)}
              aria-expanded={open}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px 11px 14px', cursor: 'pointer', width: '100%', background: 'none', border: 'none', color: 'var(--text)', font: 'inherit', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-lt)', marginTop: 1 }}>{sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--warning-text)' }}>{fmt$(g.total)}</span>
                <ChevronDown size={15} color="var(--text-lt)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </div>
            </button>
            {open && (
              <div style={{ borderTop: '1px solid var(--border-soft)', padding: '6px 12px 12px 14px' }}>
                {g.items.map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: idx === 0 ? 'none' : '1px solid var(--border-soft)' }}>
                    <div>
                      <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{dowDdmm(item.date)} · {item.time?.slice(0, 5)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>Sesión individual</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{fmt$(remaining(item))}</span>
                      <button
                        onClick={() => payItem(g.patientId, item)}
                        disabled={isPending}
                        className="btn btn-accent pressable"
                        style={{ fontSize: 11, padding: '6px 12px', boxShadow: 'none' }}
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
                      aria-pressed={methodFor(g.patientId) === m}
                      className={`chip pressable${methodFor(g.patientId) === m ? ' on' : ''}`}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {m === 'cash' ? 'Efectivo' : 'Transferencia'}
                    </button>
                  ))}
                </div>
                {g.items.length > 1 && (
                  <button
                    onClick={() => payAll(g)}
                    disabled={isPending}
                    className="btn btn-primary btn-block pressable"
                    style={{ marginTop: 10, fontSize: 12, padding: 10 }}
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
        <p style={{ color: 'var(--text-lt)', fontSize: 13, padding: 20, textAlign: 'center' }}>Nadie te debe sesiones.</p>
      )}
    </div>
  );
}
