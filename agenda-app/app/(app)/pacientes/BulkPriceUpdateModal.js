'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Laptop, Home } from 'lucide-react';
import { applyPriceChange } from './actions';

const STATUS_BADGE = {
  active: 'badge-teal', paused: 'badge-amber', suspended: 'badge-amber',
  abandoned: 'badge-rose', discharged: 'badge-violet', referred: 'badge-blue',
};
const STATUS_LABEL = {
  active: 'Activo', paused: 'Pausado', suspended: 'Suspendido',
  abandoned: 'Abandonó', discharged: 'Alta', referred: 'Derivado',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BulkPriceUpdateModal({ patients, infoByPatient, compact }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [priceVirtual, setPriceVirtual] = useState('');
  const [pricePresencial, setPricePresencial] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayStr());
  const [selected, setSelected] = useState([]);
  const [isPending, startTransition] = useTransition();

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function selectAll() {
    setSelected(patients.map((p) => p.id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (selected.length === 0 || (!priceVirtual && !pricePresencial)) return;
    startTransition(async () => {
      if (priceVirtual) await applyPriceChange(selected, parseFloat(priceVirtual), effectiveDate, 'virtual');
      if (pricePresencial) await applyPriceChange(selected, parseFloat(pricePresencial), effectiveDate, 'presencial');
      setOpen(false);
      setPriceVirtual(''); setPricePresencial(''); setSelected([]);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-accent pressable"
        style={compact
          ? { flex: 1, fontSize: 12.5, padding: '11px 10px', gap: 6 }
          : { width: 'calc(100% - 24px)', margin: '8px 12px 0', fontSize: 13 }}
      >
        <DollarSign size={13} strokeWidth={2.5} /> Establecer precios
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="sheet-backdrop">
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="sheet sheet-box" style={{ gap: 12 }}>
            <div className="sheet-grab" />
            <h3>Establecer precios</h3>
            <p style={{ fontSize: 12, color: 'var(--text-md)', margin: 0 }}>
              Se aplica solo a los turnos futuros (desde la fecha elegida) que coincidan con la modalidad, de los pacientes que marques abajo. Dejá un precio en blanco si no querés tocar esa modalidad.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Laptop size={12} /> Virtual
                </label>
                <input type="number" value={priceVirtual} onChange={(e) => setPriceVirtual(e.target.value)} placeholder="Sin cambios"
                  style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Home size={12} /> Presencial
                </label>
                <input type="number" value={pricePresencial} onChange={(e) => setPricePresencial(e.target.value)} placeholder="Sin cambios"
                  style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Vigente desde</label>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required
                style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Aplicar a ({selected.length} elegidos)</label>
              <button type="button" onClick={selectAll} className="pressable" style={{ background: 'none', border: 'none', color: 'var(--teal-dk)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Marcar todos
              </button>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
              {patients.map((p) => {
                const info = infoByPatient?.[p.id];
                return (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border-soft)', fontSize: 13 }}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} style={{ accentColor: 'var(--teal-dk)', width: 16, height: 16, margin: 0 }} />
                    <span style={{ flex: 1 }}>{p.first_name} {p.last_name || ''}</span>
                    <span className={`badge ${STATUS_BADGE[p.status] || 'badge-teal'}`}>{STATUS_LABEL[p.status] || 'Activo'}</span>
                    {info?.modality && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-lt)' }}>
                        {info.modality === 'virtual' ? <Laptop size={12} /> : <Home size={12} />}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }} disabled={isPending || selected.length === 0}>
                {isPending ? 'Aplicando…' : 'Aplicar cambio'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
