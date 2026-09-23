'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createPatient } from './actions';

export default function AddPatientButton({ compact }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    if (!first.trim()) return;
    startTransition(async () => {
      const id = await createPatient(first.trim(), last.trim());
      setOpen(false);
      setFirst('');
      setLast('');
      if (id) router.push(`/pacientes?id=${id}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary pressable"
        style={compact
          ? { flex: 1, fontSize: 12, padding: '9px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }
          : { width: 'calc(100% - 24px)', margin: '10px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Plus size={15} /> Agregar
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
            style={{ width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Nuevo paciente</h3>
            <input
              value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Nombre" required autoFocus
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
            />
            <input
              value={last} onChange={(e) => setLast(e.target.value)} placeholder="Apellido (opcional)"
              style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }} disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
