'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Plus } from 'lucide-react';
import { deleteEvent, createAppointment } from '../agenda/actions';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function AvailabilityList({ days }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState('free'); // 'free' | 'blocked'
  const [hiddenIds, setHiddenIds] = useState([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  function unblock(id) {
    if (!confirm('¿Liberar este horario bloqueado?')) return;
    setHiddenIds((prev) => [...prev, id]);
    startTransition(() => deleteEvent(id));
  }

  const totalBlocked = days.reduce((s, d) => s + d.blockedSlots.length, 0);

  return (
    <div style={{ padding: '16px 16px 90px' }}>
      <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Turnos libres</h2>
      <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: '0 0 14px' }}>
        Próximas 4 semanas (días hábiles).
      </p>

      <div className="segmented" style={{ marginBottom: 16 }}>
        <button onClick={() => setTab('free')} className={`pressable segmented-item${tab === 'free' ? ' active' : ''}`}>
          Libres
        </button>
        <button onClick={() => setTab('blocked')} className={`pressable segmented-item${tab === 'blocked' ? ' active' : ''}`}>
          Bloqueados{totalBlocked > 0 ? ` (${totalBlocked})` : ''}
        </button>
      </div>

      {tab === 'blocked' && (
        <button
          onClick={() => setBlockModalOpen(true)}
          className="btn btn-secondary pressable"
          style={{ width: '100%', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={15} /> Bloquear un horario
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {days.map((day) => {
          const visibleBlocked = day.blockedSlots.filter((b) => !hiddenIds.includes(b.id));
          const items = tab === 'free' ? day.freeSlots : visibleBlocked;
          if (items.length === 0) return null;
          return (
            <div key={day.key} className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'capitalize' }}>
                {DAY_NAMES[day.weekday]} {day.day}/{day.month}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tab === 'free'
                  ? items.map((time) => (
                      <button key={time} onClick={() => router.push(`/agenda?date=${day.key}`)} className="pressable badge badge-teal" style={{ border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px' }}>
                        {time}
                      </button>
                    ))
                  : items.map((b) => (
                      <button
                        key={b.id} onClick={() => unblock(b.id)} className="pressable badge badge-neutral"
                        style={{ border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Ban size={12} /> {b.time}
                      </button>
                    ))}
              </div>
            </div>
          );
        })}
        {tab === 'free' && days.every((d) => d.freeSlots.length === 0) && (
          <p style={{ fontSize: 13, color: 'var(--text-lt)', textAlign: 'center' }}>Sin horarios libres en las próximas 4 semanas.</p>
        )}
        {tab === 'blocked' && totalBlocked === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-lt)', textAlign: 'center' }}>No tenés horarios bloqueados.</p>
        )}
      </div>

      {blockModalOpen && (
        <div
          onClick={() => setBlockModalOpen(false)}
          className="sheet-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,41,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        >
          <form
            action={async (formData) => { await createAppointment(formData); setBlockModalOpen(false); router.refresh(); }}
            onClick={(e) => e.stopPropagation()}
            className="card sheet-box"
            style={{ width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Bloquear horario</h3>
            <input type="hidden" name="type" value="block" />
            <div style={{ display: 'flex', gap: 10 }}>
              <input name="date" type="date" required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
              <input name="time" type="time" required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={() => setBlockModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>Bloquear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
