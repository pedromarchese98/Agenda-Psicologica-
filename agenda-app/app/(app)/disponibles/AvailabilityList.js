'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Repeat } from 'lucide-react';
import { deleteEvent, createAppointment } from '../agenda/actions';
import BlockReasonFields from '../agenda/BlockReasonFields';

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
        {tab === 'free' ? 'Próximas 4 semanas (días hábiles).' : 'Horarios que no se ofrecen a pacientes.'}
      </p>

      <div className="segmented" style={{ marginBottom: 16, width: '100%' }}>
        <button onClick={() => setTab('free')} className={`pressable segmented-item${tab === 'free' ? ' active' : ''}`} style={{ flex: 1 }}>
          Libres
        </button>
        <button onClick={() => setTab('blocked')} className={`pressable segmented-item${tab === 'blocked' ? ' active' : ''}`} style={{ flex: 1 }}>
          Bloqueados{totalBlocked > 0 ? ` (${totalBlocked})` : ''}
        </button>
      </div>

      {tab === 'blocked' && (
        <button
          onClick={() => setBlockModalOpen(true)}
          className="btn btn-primary pressable"
          style={{ width: '100%', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={15} /> Bloquear un horario
        </button>
      )}

      {tab === 'free' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {days.map((day) => {
            if (day.freeSlots.length === 0) return null;
            return (
              <div key={day.key} className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, textTransform: 'capitalize' }}>
                  {DAY_NAMES[day.weekday]} {day.day}/{day.month}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {day.freeSlots.map((time) => (
                    <button key={time} onClick={() => router.push(`/agenda?date=${day.key}`)} className="pressable badge badge-teal" style={{ border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px', fontFamily: 'var(--font-mono, monospace)' }}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {days.every((d) => d.freeSlots.length === 0) && (
            <p style={{ fontSize: 13, color: 'var(--text-lt)', textAlign: 'center' }}>Sin horarios libres en las próximas 4 semanas.</p>
          )}
        </div>
      )}

      {tab === 'blocked' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {days.map((day) => {
            const visibleBlocked = day.blockedSlots.filter((b) => !hiddenIds.includes(b.id));
            if (visibleBlocked.length === 0) return null;
            return (
              <div key={day.key}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '4px 2px 8px' }}>
                  {DAY_NAMES[day.weekday]} {day.day}/{day.month}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 4 }}>
                  {visibleBlocked.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600, background: 'var(--surface)',
                        borderRadius: 8, padding: '5px 8px', flex: 'none', minWidth: 54, textAlign: 'center',
                      }}>
                        {b.time}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {b.reason}
                          {b.recurring && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-tint)', borderRadius: 999, padding: '1px 6px' }}>
                              <Repeat size={9} /> Semanal
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-lt)' }}>
                          {b.note || '1 hora'}
                        </div>
                      </div>
                      <button onClick={() => unblock(b.id)} className="btn btn-secondary pressable" style={{ fontSize: 10.5, padding: '5px 10px', flex: 'none' }}>
                        Liberar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {totalBlocked === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-lt)', textAlign: 'center' }}>No tenés horarios bloqueados.</p>
          )}
          {totalBlocked > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-lt)', textAlign: 'center', margin: '4px 0 0' }}>
              Al liberar un horario vuelve a aparecer en Libres.
            </p>
          )}
        </div>
      )}

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
            style={{ width: '100%', maxHeight: '88dvh', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px calc(20px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '4px auto' }} />
            <h3 style={{ margin: 0, fontSize: 16 }}>Bloquear horario</h3>
            <input type="hidden" name="type" value="block" />
            <div style={{ display: 'flex', gap: 10 }}>
              <input name="date" type="date" required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
              <input name="time" type="time" required style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
            <BlockReasonFields />
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
