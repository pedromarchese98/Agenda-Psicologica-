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
          ? { flex: 1, fontSize: 12.5, padding: '11px 10px', gap: 6 }
          : { width: 'calc(100% - 24px)', margin: '10px 12px 0' }}
      >
        <Plus size={13} strokeWidth={2.5} color="var(--teal)" /> Nuevo paciente
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="sheet-backdrop">
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="sheet sheet-box">
            <div className="sheet-grab" />
            <h3>Nuevo paciente</h3>
            <input
              value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Nombre" required autoFocus aria-label="Nombre"
              style={{ padding: '11px 13px', background: 'var(--muted)' }}
            />
            <input
              value={last} onChange={(e) => setLast(e.target.value)} placeholder="Apellido (opcional)" aria-label="Apellido"
              style={{ padding: '11px 13px', background: 'var(--muted)' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
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
