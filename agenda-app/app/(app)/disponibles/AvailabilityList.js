'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Repeat } from 'lucide-react';
import { deleteBlocks, createAppointment } from '../agenda/actions';
import BlockReasonFields, { BlockWhenFields } from '../agenda/BlockReasonFields';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAY_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }
function dayTitle(day) {
  return `${DAY_NAMES[day.weekday]} ${day.day} de ${MONTH_SHORT[day.month]}`;
}
function blockMeta(b, weekday) {
  const hours = b.ids.length;
  if (b.recurring) return `Todos los ${DAY_PLURAL[weekday]}${hours > 1 ? ` · hasta ${pad(b.endHour)}:00` : ''}`;
  if (b.note) return b.note;
  return hours > 1 ? `${hours} horas · hasta ${pad(b.endHour)}:00` : '1 hora';
}

export default function AvailabilityList({ days }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('free'); // 'free' | 'blocked'
  const [hiddenIds, setHiddenIds] = useState([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  function unblock(ids) {
    if (!confirm('¿Liberar este horario bloqueado?')) return;
    setHiddenIds((prev) => [...prev, ...ids]);
    startTransition(() => deleteBlocks(ids));
  }

  function closeSheet() {
    setClosing(true);
    setTimeout(() => { setBlockModalOpen(false); setClosing(false); }, 220);
  }

  const visibleBlocks = (d) => d.blockedSlots.filter((b) => !b.ids.every((id) => hiddenIds.includes(id)));
  const totalBlocked = days.reduce((s, d) => s + visibleBlocks(d).length, 0);

  return (
    <div style={{ padding: '14px 16px 90px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 3px' }}>Turnos libres</h2>
      <p style={{ fontSize: 11.5, color: 'var(--text-lt)', margin: '0 0 16px' }}>
        {tab === 'free' ? 'Próximas 4 semanas (días hábiles)' : 'Horarios que no se ofrecen a pacientes'}
      </p>

      <div className="segmented" style={{ marginBottom: 16, width: '100%' }}>
        <button onClick={() => setTab('free')} className={`pressable segmented-item${tab === 'free' ? ' active' : ''}`} style={{ flex: 1 }}>
          Libres
        </button>
        <button onClick={() => setTab('blocked')} className={`pressable segmented-item${tab === 'blocked' ? ' active' : ''}`} style={{ flex: 1 }}>
          Bloqueados{totalBlocked > 0 ? ` (${totalBlocked})` : ''}
        </button>
      </div>

      {tab === 'free' && (
        <div>
          {days.map((day) => {
            if (day.freeSlots.length === 0) return null;
            return (
              <div key={day.key} className="card" style={{ padding: 14, marginBottom: 12, borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, marginBottom: 9, textTransform: 'capitalize' }}>
                  {dayTitle(day)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {day.freeSlots.map((time) => (
                    <button key={time} onClick={() => router.push(`/agenda?view=day&date=${day.key}`)} className="pill-free pressable">
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
        <div>
          <button onClick={() => setBlockModalOpen(true)} className="btn btn-primary btn-block pressable" style={{ marginBottom: 18 }}>
            <Plus size={14} strokeWidth={2.5} color="var(--teal)" /> Bloquear un horario
          </button>

          {days.map((day) => {
            const list = visibleBlocks(day);
            if (list.length === 0) return null;
            return (
              <div key={day.key}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '4px 2px 8px' }}>
                  {dayTitle(day)}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14, borderRadius: 'var(--radius-lg)' }}>
                  {list.map((b, i) => (
                    <div key={b.ids[0]} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)' }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, background: 'var(--muted)', borderRadius: 8, padding: '5px 8px', flex: 'none', minWidth: 54, textAlign: 'center' }}>
                        {b.time}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.reason}
                          {b.recurring && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--warning-text)', background: 'var(--warning-tint)', borderRadius: 999, padding: '1px 6px', marginLeft: 6, verticalAlign: 1 }}>
                              <Repeat size={9} /> Semanal
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-lt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {blockMeta(b, day.weekday)}
                        </div>
                      </div>
                      <button onClick={() => unblock(b.ids)} disabled={isPending} className="btn btn-outline pressable" style={{ fontSize: 10.5, padding: '5px 10px', flex: 'none' }}>
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
            <p style={{ fontSize: 11, color: 'var(--text-lt)', textAlign: 'center', margin: '6px 0 0' }}>
              Al liberar un horario vuelve a aparecer en Libres.
            </p>
          )}
        </div>
      )}

      {blockModalOpen && (
        <div onClick={closeSheet} className="sheet-backdrop">
          <form
            action={async (formData) => { await createAppointment(formData); closeSheet(); router.refresh(); }}
            onClick={(e) => e.stopPropagation()}
            className={`sheet sheet-box${closing ? ' closing' : ''}`}
          >
            <div className="sheet-grab" />
            <h3>Bloquear horario</h3>
            <input type="hidden" name="type" value="block" />
            <BlockWhenFields />
            <BlockReasonFields />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary pressable" style={{ flex: 1 }} onClick={closeSheet}>Cancelar</button>
              <button type="submit" className="btn btn-primary pressable" style={{ flex: 1 }}>Bloquear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
