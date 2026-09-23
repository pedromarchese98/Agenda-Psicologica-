'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from 'recharts';
import { registerPayment } from './actions';

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function AnalisisClient({ appointments, activeCount, allDebts, events }) {
  const [period, setPeriod] = useState('month');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [sortCol, setSortCol] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);

  const today = new Date();

  const [debtPending, startDebtTransition] = useTransition();
  const [openDebtId, setOpenDebtId] = useState(null);
  const [openDebtorKey, setOpenDebtorKey] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transfer');
  const [localDebts, setLocalDebts] = useState(allDebts);

  const debtorGroups = useMemo(() => {
    const groups = {};
    localDebts.forEach((d) => {
      const key = d.patient_id || (d.patients ? `${d.patients.first_name}-${d.patients.last_name}` : 'sin-nombre');
      const name = d.patients ? `${d.patients.first_name} ${d.patients.last_name || ''}`.trim() : 'Sin nombre';
      if (!groups[key]) groups[key] = { key, name, items: [], total: 0 };
      groups[key].items.push(d);
      groups[key].total += (Number(d.price) || 0) - (Number(d.amount_paid) || 0);
    });
    return Object.values(groups)
      .map((g) => ({ ...g, items: g.items.sort((a, b) => a.date.localeCompare(b.date)) }))
      .sort((a, b) => b.total - a.total);
  }, [localDebts]);

  const [projectionOffset, setProjectionOffset] = useState(0);

  const projection = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + projectionOffset, 1);
    const y = base.getFullYear(), m = base.getMonth();
    const monthStart = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const monthEnd = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    const total = appointments
      .filter((a) => a.date >= monthStart && a.date <= monthEnd && a.attendance !== 'no' && a.attendance !== 'no-free')
      .reduce((s, a) => s + (Number(a.price) || 0), 0);
    return { label: `${MONTH_SHORT[m]} ${y}`, total };
  }, [appointments, projectionOffset]);

  function remaining(d) {
    return (Number(d.price) || 0) - (Number(d.amount_paid) || 0);
  }

  function handleRegisterPayment(debt) {
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    setLocalDebts((prev) => {
      const updated = prev.map((d) => (d.id === debt.id ? { ...d, amount_paid: (Number(d.amount_paid) || 0) + amount } : d));
      return updated.filter((d) => remaining(d) > 0.01);
    });
    startDebtTransition(() => registerPayment(debt.id, amount, payMethod));
    setOpenDebtId(null);
    setPayAmount('');
  }

  const { from, to } = useMemo(() => {
    const y = today.getFullYear(), m = today.getMonth();
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
    if (period === 'month') return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}` };
    if (period === 'quarter') {
      const qm = Math.max(0, m - 2);
      return { from: `${y}-${pad(qm + 1)}-01`, to: toDateStr(today) };
    }
    if (period === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` };
    if (period === 'custom') return { from: rangeFrom || `${y}-01-01`, to: rangeTo || toDateStr(today) };
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}` };
  }, [period, rangeFrom, rangeTo]);

  const filtered = useMemo(() => {
    let list = appointments.filter((a) => a.date >= from && a.date <= to);
    if (patientFilter.trim()) {
      const q = patientFilter.trim().toLowerCase();
      list = list.filter((a) => {
        const name = a.patients ? `${a.patients.first_name} ${a.patients.last_name || ''}`.toLowerCase() : '';
        return name.includes(q);
      });
    }
    return list;
  }, [appointments, from, to, patientFilter]);

  const stats = useMemo(() => {
    const todayStr = toDateStr(today);
    let total = 0, pastTotal = 0, att = 0, cancDay = 0, cancAdv = 0, cancFree = 0, coll = 0, debt = 0, cash = 0, transf = 0;
    const byPatient = {};
    const byMonth = {};
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    const totalByWeekday = [0, 0, 0, 0, 0, 0, 0];

    filtered.forEach((a) => {
      total++;
      if (a.date <= todayStr) pastTotal++;
      const pr = Number(a.price) || 0;
      const name = a.patients ? `${a.patients.first_name} ${a.patients.last_name || ''}`.trim() : 'Sin nombre';
      if (!byPatient[name]) byPatient[name] = { name, total: 0, att: 0, cancDay: 0, cancAdv: 0, cancFree: 0, paid: 0, debt: 0 };
      byPatient[name].total++;

      const mkey = a.date.slice(0, 7);
      if (!byMonth[mkey]) byMonth[mkey] = { sessions: 0, revenue: 0 };

      const weekday = (new Date(a.date + 'T00:00:00').getDay() + 6) % 7; // 0=lunes
      totalByWeekday[weekday]++;

      if (a.attendance === 'yes') {
        att++; byPatient[name].att++;
        byMonth[mkey].sessions++;
        if (a.payment === 'paid') byMonth[mkey].revenue += pr;
      }
      if (a.attendance === 'no') {
        const isAdv = a.cancel_type === 'advance' || a.payment === 'na';
        if (isAdv) { cancAdv++; byPatient[name].cancAdv++; } else { cancDay++; byPatient[name].cancDay++; }
        byWeekday[weekday]++;
      }
      if (a.attendance === 'no-free') {
        cancFree++; byPatient[name].cancFree++;
        byWeekday[weekday]++;
      }
      if (a.payment === 'paid') {
        coll += pr; byPatient[name].paid += pr;
        if (a.payment_method === 'cash') cash += pr;
        if (a.payment_method === 'transfer') transf += pr;
      }
      if (a.payment === 'unpaid') { debt += pr; byPatient[name].debt += pr; }
    });

    const totalCanc = cancDay + cancAdv + cancFree;
    const attendanceRate = pastTotal ? Math.round((att / pastTotal) * 100) : 0;

    const monthKeys = Object.keys(byMonth).sort();
    const monthlyData = monthKeys.map((k) => ({
      label: `${MONTH_SHORT[parseInt(k.slice(5)) - 1]}`,
      sesiones: byMonth[k].sessions,
      recaudado: byMonth[k].revenue,
    }));

    const weekdayData = WEEKDAY_LABELS.map((label, i) => ({
      label,
      tasa: totalByWeekday[i] ? Math.round((byWeekday[i] / totalByWeekday[i]) * 100) : 0,
    }));

    // Tasa de abandono/alta: tiempo entre primer y último turno para pacientes dados de alta o abandonados
    const durations = [];
    Object.values(
      appointments.reduce((acc, a) => {
        const key = a.patient_id;
        if (!key) return acc;
        if (!acc[key]) acc[key] = { dates: [], status: a.patients?.status };
        acc[key].dates.push(a.date);
        return acc;
      }, {})
    ).forEach((p) => {
      if (p.dates.length < 2) return;
      if (!['discharged', 'abandoned'].includes(p.status)) return;
      const sorted = [...p.dates].sort();
      const days = (new Date(sorted[sorted.length - 1]) - new Date(sorted[0])) / 86400000;
      durations.push(days);
    });
    const avgDurationDays = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

    return {
      total, pastTotal, att, cancDay, cancAdv, cancFree, totalCanc, coll, debt, cash, transf, attendanceRate,
      byPatient: Object.values(byPatient).sort((a, b) => b.total - a.total),
      monthlyData, weekdayData, avgDurationDays,
    };
  }, [filtered, appointments]);

  const sortedPatients = useMemo(() => {
    const arr = [...stats.byPatient];
    arr.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [stats.byPatient, sortCol, sortAsc]);

  function sortBy(col) {
    if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(false); }
  }
  const arrow = (col) => (sortCol === col ? (sortAsc ? '↑' : '↓') : '');

  const debtors = stats.byPatient.filter((p) => p.debt > 0).sort((a, b) => b.debt - a.debt);

  const eventsInPeriod = useMemo(() => {
    const list = events.filter((e) => e.date >= from && e.date <= to);
    const paid = list.filter((e) => e.payment === 'paid').reduce((s, e) => s + (Number(e.price) || 0), 0);
    return { count: list.length, paid };
  }, [events, from, to]);

  const kpis = [
    { label: 'Pacientes activos', value: activeCount, color: 'var(--navy)' },
    { label: 'Sesiones', value: `${stats.pastTotal}/${stats.total}`, sub: 'pasadas / totales del período', color: 'var(--teal)' },
    { label: 'Asistencia', value: `${stats.attendanceRate}%`, sub: `${stats.att} de ${stats.pastTotal} (pasadas)`, color: 'var(--sage)' },
    { label: 'Cancelaciones', value: stats.totalCanc, sub: `Día: ${stats.cancDay} · Anticip.: ${stats.cancAdv} · Liberó: ${stats.cancFree}`, color: 'var(--rose)' },
    { label: 'Recaudado', value: fmt$(stats.coll), color: 'var(--teal)' },
    { label: 'Pendiente de cobro', value: fmt$(stats.debt), color: 'var(--amber)' },
    { label: 'Efectivo', value: fmt$(stats.cash), color: 'var(--navy)' },
    { label: 'Transferencia', value: fmt$(stats.transf), color: 'var(--navy)' },
  ];
  if (eventsInPeriod.count > 0) {
    kpis.push({ label: 'Eventos', value: eventsInPeriod.count, sub: eventsInPeriod.paid ? `${fmt$(eventsInPeriod.paid)} recaudado` : '', color: '#6A3FA0' });
  }
  if (stats.avgDurationDays != null) {
    kpis.push({ label: 'Duración prom. de tratamiento', value: `${Math.round(stats.avgDurationDays / 30)} meses`, sub: '(altas y abandonos)', color: 'var(--violet)' });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>Análisis</h2>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {[['month', 'Mes en curso'], ['quarter', 'Últimos 3 meses'], ['year', 'Año en curso'], ['custom', 'Personalizado']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setPeriod(v)}
            className="pressable"
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)',
              background: period === v ? 'var(--navy)' : 'var(--card)', color: period === v ? '#fff' : 'var(--text-md)',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
          <span style={{ fontSize: 12, color: 'var(--text-lt)' }}>a</span>
          <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
        </div>
      )}

      <input
        value={patientFilter}
        onChange={(e) => setPatientFilter(e.target.value)}
        placeholder="🔍 Filtrar por paciente (vacío = todos)"
        style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, marginBottom: 14 }}
      />

      <div className="card" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setProjectionOffset((v) => v - 1)} className="btn btn-secondary pressable" style={{ padding: '6px 11px' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase' }}>
            Proyección de facturación — {projection.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal-dk)' }}>{fmt$(projection.total)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-lt)' }}>turnos agendados, sin contar cancelados</div>
        </div>
        <button onClick={() => setProjectionOffset((v) => v + 1)} className="btn btn-secondary pressable" style={{ padding: '6px 11px' }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card" style={{ padding: 14, borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 10, color: 'var(--text-lt)', marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Evolución mensual
        </div>
        {stats.monthlyData.length < 2 ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>No hay suficientes meses en este período para graficar.</p>
        ) : (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => (name === 'recaudado' ? fmt$(v) : v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="sesiones" stroke="#3ECFB2" strokeWidth={2.5} />
                <Line yAxisId="right" type="monotone" dataKey="recaudado" stroke="#F0A93A" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Tasa de cancelación por día de la semana
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '0 0 10px' }}>
          % de los turnos agendados ese día que terminaron cancelados (más representativo que el conteo bruto).
        </p>
        {stats.totalCanc === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin cancelaciones en el período.</p>
        ) : (
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={stats.weekdayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="tasa" fill="#E85D6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 4 }}>
          Deudores (a la fecha de hoy)
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '0 0 10px' }}>
          Esta lista muestra toda la deuda pendiente, sin importar el período elegido arriba.
        </p>
        {localDebts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-lt)', margin: 0 }}>Sin deudores 🙌</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {debtorGroups.map((group) => {
              const isOpen = openDebtorKey === group.key;
              return (
                <div key={group.key} className="card" style={{ padding: 10, border: '1px solid var(--border)' }}>
                  <div
                    onClick={() => setOpenDebtorKey(isOpen ? null : group.key)}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, cursor: 'pointer' }}
                  >
                    <span>{group.name} <span style={{ color: 'var(--text-lt)', fontSize: 11 }}>· {group.items.length} sesión{group.items.length !== 1 ? 'es' : ''}</span></span>
                    <strong style={{ color: 'var(--amber)' }}>{fmt$(group.total)}</strong>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.items.map((d) => {
                        const rem = remaining(d);
                        const isOpenPay = openDebtId === d.id;
                        return (
                          <div key={d.id}>
                            <div
                              onClick={() => { setOpenDebtId(isOpenPay ? null : d.id); setPayAmount(rem.toString()); }}
                              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }}
                            >
                              <span style={{ color: 'var(--text-md)' }}>{d.date}</span>
                              <strong style={{ color: 'var(--amber)' }}>{fmt$(rem)}</strong>
                            </div>
                            {isOpenPay && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                <input
                                  type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                                  style={{ flex: 1, minWidth: 90, padding: 7, borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }}
                                />
                                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                                  style={{ padding: 7, borderRadius: 7, border: '1px solid var(--border)', fontSize: 12 }}>
                                  <option value="transfer">Transferencia</option>
                                  <option value="cash">Efectivo</option>
                                </select>
                                <button className="btn btn-primary pressable" style={{ fontSize: 12, padding: '7px 10px' }} onClick={() => handleRegisterPayment(d)} disabled={debtPending}>
                                  Registrar pago
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 10 }}>
          Resumen por paciente
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
          <thead>
            <tr>
              {[
                ['name', 'Paciente'], ['total', 'Turnos'], ['att', 'Asistió'],
                ['cancDay', 'Canc. día'], ['cancAdv', 'Canc. antic.'], ['paid', 'Pagado'], ['debt', 'Deuda'],
              ].map(([col, label]) => (
                <th
                  key={col}
                  onClick={() => sortBy(col)}
                  style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid var(--border)', cursor: 'pointer', color: 'var(--text-lt)', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {label} {arrow(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPatients.map((p) => (
              <tr key={p.name}>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{p.name}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{p.total}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: '#2E7D32' }}>{p.att}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{p.cancDay}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{p.cancAdv}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: '#1B5E20' }}>{fmt$(p.paid)}</td>
                <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: p.debt > 0 ? 'var(--amber)' : 'var(--text-lt)' }}>
                  {p.debt > 0 ? fmt$(p.debt) : '—'}
                </td>
              </tr>
            ))}
            {sortedPatients.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-lt)', padding: 16 }}>Sin datos para este período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
