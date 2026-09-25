'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';

const fmt$ = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR');
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function AnalisisClient({ appointments, activeCount, events }) {
  const [period, setPeriod] = useState('month');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [sortCol, setSortCol] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);

  const today = new Date();

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

  const { from, to } = useMemo(() => {
    const y = today.getFullYear(), m = today.getMonth();
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
    if (period === 'month') return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}` };
    if (period === 'quarter') {
      const qm = Math.max(0, m - 2);
      return { from: `${y}-${pad(qm + 1)}-01`, to: toDateStr(today) };
    }
    if (period === 'year') return { from: `${y}-01-01`, to: toDateStr(today) };
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
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 4 }}>
          Sesiones por mes
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '0 0 10px' }}>
          Turnos con paciente, por mes.
        </p>
        {stats.monthlyData.length < 2 ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>No hay suficientes meses en este período para graficar.</p>
        ) : (
          <div style={{ width: '100%', height: 170 }}>
            <ResponsiveContainer>
              <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-lt)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Sesiones']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="sesiones" fill="var(--teal-dk)" radius={[4, 4, 2, 2]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 4 }}>
          Recaudación por mes
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: '0 0 10px' }}>
          Total cobrado, por mes. Antes compartía eje con "Sesiones" — separarlos evita comparar dos magnitudes distintas en la misma escala.
        </p>
        {stats.monthlyData.length < 2 ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>No hay suficientes meses en este período para graficar.</p>
        ) : (
          <div style={{ width: '100%', height: 170 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="recaudadoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--teal-dk)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--teal-dk)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-lt)' }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => [fmt$(v), 'Recaudado']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Area type="monotone" dataKey="recaudado" stroke="var(--teal-dk)" strokeWidth={2} fill="url(#recaudadoFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-lt)' }} axisLine={false} tickLine={false} unit="%" width={30} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="tasa" fill="var(--amber)" radius={[4, 4, 2, 2]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <Link
        href="/pacientes?statuses=active&debtors=1"
        className="card pressable"
        style={{ padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--amber-tint)' }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', marginBottom: 4 }}>
            Deudores
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-lt)', margin: 0 }}>
            Ver el detalle y registrar pagos ahora se hace desde la ficha de cada paciente, en Pacientes.
          </p>
        </div>
        <span style={{ fontSize: 20, color: 'var(--text-lt)', flex: 'none', marginLeft: 12 }}>›</span>
      </Link>

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
