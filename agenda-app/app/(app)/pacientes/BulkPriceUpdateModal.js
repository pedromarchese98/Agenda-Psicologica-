'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { applyPriceChange } from './actions';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BulkPriceUpdateModal({ patients }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
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
    if (!price || selected.length === 0) return;
    startTransition(async () => {
      await applyPriceChange(selected, parseFloat(price), effectiveDate);
      setOpen(false);
      setPrice('');
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-secondary pressable"
        style={{ width: 'calc(100% - 24px)', margin: '8px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
      >
        <DollarSign size={15} /> Actualizar precio a varios pacientes
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="card sheet-box"
            style={{ width: '100%', maxHeight: '85dvh', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Actualizar precio de sesión</h3>
            <p style={{ fontSize: 12, color: 'var(--text-md)', margin: 0 }}>
              Se aplica a todos los turnos futuros (desde la fecha elegida) de los pacientes que marques abajo. El historial pasado no se toca.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Nuevo precio</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
                  style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Vigente desde</label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required
                  style={{ width: '100%', marginTop: 4, padding: 11, borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-md)' }}>Aplicar a ({selected.length} elegidos)</label>
              <button type="button" onClick={selectAll} className="pressable" style={{ background: 'none', border: 'none', color: 'var(--teal-dk)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Marcar todos
              </button>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {patients.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                  {p.first_name} {p.last_name || ''}
                </label>
              ))}
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
