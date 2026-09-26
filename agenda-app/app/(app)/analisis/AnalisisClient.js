'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, AreaChart, Area, LabelList,
} from 'recharts';
import { MoreHorizontal, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const fmt$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function normalize(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function addMonths(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n;
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12 + 12) % 12 + 1;
  return `${y}-${pad(m)}`;
}
function monthsBetween(fromYm, toYm) {
  const [f, t] = fromYm <= toYm ? [fromYm, toYm] : [toYm, fromYm];
  const out = [];
  let cur = f, guard = 0;
  while (cur <= t && guard < 48) { out.push(cur); cur = addMonths(cur, 1); guard++; }
  return out;
}
function monthLabel(ym) { return MONTH_SHORT[parseInt(ym.slice(5), 10) - 1]; }

// Agrupa turnos en "baldes" (semanas del mes en curso, o meses) según el rango local de un gráfico,
// y devuelve también los turnos del período comparable anterior (para la variación %).
function bucketByRange(apps, range, customFrom, customTo, todayYm) {
  if (range === 'mes') {
    const [y, m] = todayYm.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const weeks = [];
    for (let start = 1; start <= lastDay; start += 7) weeks.push({ start, end: Math.min(start + 6, lastDay) });
    const inMonth = apps.filter((a) => a.date.slice(0, 7) === todayYm);
    const current = weeks.map((w, i) => ({
      label: `Sem ${i + 1}`,
      items: inMonth.filter((a) => { const d = parseInt(a.date.slice(8, 10), 10); return d >= w.start && d <= w.end; }),
    }));
    const prevYm = addMonths(todayYm, -1);
    const previousItems = apps.filter((a) => a.date.slice(0, 7) === prevYm);
    return { current, previousItems, note: 'Este mes por semana · vs. mes anterior' };
  }
  let months;
  if (range === '3m') months = [addMonths(todayYm, -2), addMonths(todayYm, -1), todayYm];
  else if (range === 'ytd') months = monthsBetween(`${todayYm.slice(0, 4)}-01`, todayYm);
  else months = monthsBetween(customFrom || addMonths(todayYm, -2), customTo || todayYm);

  const current = months.map((mk) => ({ label: monthLabel(mk), items: apps.filter((a) => a.date.slice(0, 7) === mk) }));
  const n = months.length;
  const prevMonths = [];
  for (let i = n; i >= 1; i--) prevMonths.unshift(addMonths(months[0], -i));
  const previousItems = range === 'ytd' ? null : apps.filter((a) => prevMonths.includes(a.date.slice(0, 7)));
  const note =
    range === '3m' ? 'Últ. 3 meses · vs. los 3 meses anteriores' :
    range === 'ytd' ? `Enero – ${monthLabel(todayYm)} · año en curso` :
    `${monthLabel(months[0])} – ${monthLabel(months[n - 1])} · vs. período anterior`;
  return { current, previousItems, note };
}

// Verde → ámbar → rojo, según qué tan alto es el valor dentro del set mostrado.
function heatColor(k) {
  const stops = [[43, 169, 141], [245, 165, 36], [229, 72, 77]];
  const j = k < 0.5 ? 0 : 1;
  const t = k < 0.5 ? k * 2 : (k - 0.5) * 2;
  const c = stops[j].map((x, n) => Math.round(x + (stops[j + 1][n] - x) * t));
  return `rgb(${c.join(',')})`;
}

const PERIOD_OPTS = [['month', 'Este mes'], ['quarter', 'Últ. 3 meses'], ['year', 'Este año'], ['custom', 'Personalizado']];
const PERIOD_TO_RANGE = { month: 'mes', quarter: '3m', year: 'ytd', custom: 'custom' };
const MONTH_CAP = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function ymLabel(ym) { return `${MONTH_CAP[parseInt(ym.slice(5), 10) - 1]} ${ym.slice(0, 4)}`; }

function Delta({ current, previous }) {
  if (previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 6, color: up ? 'var(--teal-dk)' : 'var(--danger)' }}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

export default function AnalisisClient({ appointments, activeCount, events }) {
  const today = new Date();
  const todayYm = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

  const [period, setPeriod] = useState('month');
  const [rangeFrom, setRangeFrom] = useState(addMonths(todayYm, -5)); // YYYY-MM
  const [rangeTo, setRangeTo] = useState(todayYm);                    // YYYY-MM
  const [patientFilter, setPatientFilter] = useState('');
  const [sortCol, setSortCol] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [projectionOffset, setProjectionOffset] = useState(0);

  // ---- Proyección de facturación del mes elegido ----
  const projection = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + projectionOffset, 1);
    const y = base.getFullYear(), m = base.getMonth();
    const monthStart = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const monthEnd = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    const items = appointments.filter((a) => a.date >= monthStart && a.date <= monthEnd && a.attendance !== 'no' && a.attendance !== 'no-free');
    const total = items.reduce((s, a) => s + (Number(a.price) || 0), 0);
    return { label: `${monthLabel(`${y}-${pad(m + 1)}`)} ${y}`, total, count: items.length };
  }, [appointments, projectionOffset]);

  // ---- Período global: aplica a todo el análisis (KPIs, gráficos, cancelaciones y tabla) ----
  const [customFrom, customTo] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
  const { from, to, periodLabel } = useMemo(() => {
    const y = today.getFullYear(), m = today.getMonth();
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
    const endOf = (ym) => { const [yy, mm] = ym.split('-').map(Number); return `${ym}-${pad(new Date(yy, mm, 0).getDate())}`; };
    if (period === 'quarter') {
      const fromYm = addMonths(todayYm, -2);
      return { from: `${fromYm}-01`, to: toDateStr(today), periodLabel: `${ymLabel(fromYm).split(' ')[0]} – ${ymLabel(todayYm)}` };
    }
    if (period === 'year') return { from: `${y}-01-01`, to: toDateStr(today), periodLabel: `Ene – ${ymLabel(todayYm)}` };
    if (period === 'custom') {
      return {
        from: `${customFrom}-01`, to: endOf(customTo),
        periodLabel: customFrom === customTo ? ymLabel(customFrom) : `${ymLabel(customFrom)} – ${ymLabel(customTo)}`,
      };
    }
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}`, periodLabel: ymLabel(todayYm) };
  }, [period, customFrom, customTo]);
  const chartRange = PERIOD_TO_RANGE[period];

  const filtered = useMemo(() => appointments.filter((a) => a.date >= from && a.date <= to), [appointments, from, to]);

  // Historial completo por paciente (no depende del período elegido), para "Meses en sesión" y "Frecuencia".
  const fullByPatient = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      if (!a.patient_id) return;
      if (!map[a.patient_id]) map[a.patient_id] = [];
      map[a.patient_id].push(a.date);
    });
    const out = {};
    Object.entries(map).forEach(([pid, dates]) => {
      const sorted = [...dates].sort();
      const start = new Date(sorted[0] + 'T00:00:00');
      const months = Math.max((today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()), 0);
      let freq = '—';
      if (sorted.length >= 2) {
        const diffs = [];
        for (let i = 1; i < sorted.length; i++) {
          const d = (new Date(sorted[i] + 'T00:00:00') - new Date(sorted[i - 1] + 'T00:00:00')) / 86400000;
          if (d > 0) diffs.push(d);
        }
        if (diffs.length) {
          diffs.sort((a, b) => a - b);
          const median = diffs[Math.floor(diffs.length / 2)];
          if (median <= 10) freq = 'Semanal';
          else if (median <= 20) freq = 'Quincenal';
          else if (median <= 35) freq = 'Mensual';
          else freq = 'Variable';
        }
      }
      out[pid] = { months, freq };
    });
    return out;
  }, [appointments]);

  const stats = useMemo(() => {
    const todayStr = toDateStr(today);
    let total = 0, pastTotal = 0, att = 0, cancDay = 0, cancAdv = 0, cancFree = 0, coll = 0, debt = 0, cash = 0, transf = 0;
    const byPatient = {};
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    const totalByWeekday = [0, 0, 0, 0, 0, 0, 0];

    filtered.forEach((a) => {
      total++;
      if (a.date <= todayStr) pastTotal++;
      const pr = Number(a.price) || 0;
      const name = a.patients ? `${a.patients.first_name} ${a.patients.last_name || ''}`.trim() : 'Sin nombre';
      const pid = a.patient_id || name;
      if (!byPatient[pid]) byPatient[pid] = {
        id: pid, name, total: 0, att: 0, cancDay: 0, cancAdv: 0, cancFree: 0, paid: 0, debt: 0,
        cash: 0, transfer: 0, lastPrice: 0, modalityCounts: {},
        status: a.patients?.status || '', lastVisit: a.date,
      };
      const row = byPatient[pid];
      row.total++;
      if (a.date > row.lastVisit) row.lastVisit = a.date;
      row.lastPrice = pr || row.lastPrice;
      if (a.modality) row.modalityCounts[a.modality] = (row.modalityCounts[a.modality] || 0) + 1;

      const weekday = (new Date(a.date + 'T00:00:00').getDay() + 6) % 7;
      totalByWeekday[weekday]++;

      if (a.attendance === 'yes') att++, row.att++;
      if (a.attendance === 'no') {
        const isAdv = a.cancel_type === 'advance' || a.payment === 'na';
        if (isAdv) { cancAdv++; row.cancAdv++; } else { cancDay++; row.cancDay++; }
        byWeekday[weekday]++;
      }
      if (a.attendance === 'no-free') { cancFree++; row.cancFree++; byWeekday[weekday]++; }
      if (a.payment === 'paid') {
        coll += pr; row.paid += pr;
        if (a.payment_method === 'cash') { cash += pr; row.cash += pr; }
        if (a.payment_method === 'transfer') { transf += pr; row.transfer += pr; }
      }
      if (a.payment === 'unpaid') { debt += pr; row.debt += pr; }
    });

    const totalCanc = cancDay + cancAdv + cancFree;
    const attendanceRate = (att + totalCanc) ? Math.round((att / (att + totalCanc)) * 100) : 0;
    const weekdayData = WEEKDAY_LABELS.map((label, i) => ({ label, tasa: totalByWeekday[i] ? Math.round((byWeekday[i] / totalByWeekday[i]) * 100) : 0, tot: totalByWeekday[i], canc: byWeekday[i] }));

    const patientRows = Object.values(byPatient).map((p) => {
      const methodTotal = p.cash + p.transfer;
      const modality = Object.entries(p.modalityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const full = fullByPatient[p.id] || { months: 0, freq: '—' };
      return {
        ...p,
        attRate: (p.att + p.cancDay + p.cancAdv) ? Math.round((p.att / (p.att + p.cancDay + p.cancAdv)) * 100) : 0,
        cashPct: methodTotal ? Math.round((p.cash / methodTotal) * 100) : 0,
        transferPct: methodTotal ? Math.round((p.transfer / methodTotal) * 100) : 0,
        fee: p.lastPrice,
        avgCollected: p.att ? Math.round(p.paid / p.att) : 0,
        modality: modality === 'virtual' ? 'Virtual' : modality === 'presencial' ? 'Presencial' : '—',
        months: full.months,
        freq: full.freq,
      };
    });

    return { total, pastTotal, att, cancDay, cancAdv, cancFree, totalCanc, coll, debt, cash, transf, attendanceRate, byPatient: patientRows, weekdayData };
  }, [filtered, fullByPatient]);

  const eventsInPeriod = useMemo(() => {
    const list = events.filter((e) => e.date >= from && e.date <= to);
    const paid = list.filter((e) => e.payment === 'paid').reduce((s, e) => s + (Number(e.price) || 0), 0);
    return { count: list.length, paid };
  }, [events, from, to]);

  const kpis = [
    { label: 'Pacientes activos', value: activeCount },
    { label: 'Sesiones', value: <>{stats.att}<span style={{ color: 'var(--text-lt)', fontSize: 12 }}>/{stats.att + stats.totalCanc}</span></>, sub: 'asistidas / agendadas' },
    { label: 'Asistencia', value: `${stats.attendanceRate}%`, color: 'var(--teal-dk)' },
    { label: 'Cancelaciones', value: stats.totalCanc, sub: `${stats.cancDay} día · ${stats.cancAdv} anticip.${stats.cancFree ? ` · ${stats.cancFree} liberó` : ''}`, color: 'var(--warning)' },
    { label: 'Recaudado', value: fmt$(stats.coll) },
    { label: 'Pendiente de cobro', value: fmt$(stats.debt), color: 'var(--warning-text)' },
    { label: 'Efectivo', value: fmt$(stats.cash) },
    { label: 'Transferencia', value: fmt$(stats.transf) },
  ];
  if (eventsInPeriod.count > 0) kpis.push({ label: 'Eventos', value: eventsInPeriod.count, sub: eventsInPeriod.paid ? `${fmt$(eventsInPeriod.paid)} recaudado` : '', color: 'var(--violet)' });

  // ---- Gráfico Sesiones: asistidas + canceladas apiladas (sigue al período global) ----
  const ses = useMemo(() => {
    const { current, previousItems, note } = bucketByRange(appointments, chartRange, customFrom, customTo, todayYm);
    const data = current.map((b) => {
      const asistidas = b.items.filter((a) => a.attendance === 'yes').length;
      const canceladas = b.items.filter((a) => a.attendance === 'no' || a.attendance === 'no-free').length;
      return { label: b.label, asistidas, canceladas, total: asistidas + canceladas };
    });
    const totalAtt = data.reduce((s, d) => s + d.asistidas, 0);
    const prevAtt = previousItems ? previousItems.filter((a) => a.attendance === 'yes').length : null;
    const totalCanc = data.reduce((s, d) => s + d.canceladas, 0);
    return { data, note, totalAtt, prevAtt, totalCanc };
  }, [appointments, chartRange, customFrom, customTo, todayYm]);

  // ---- Gráfico Recaudación: total cobrado (sigue al período global) ----
  const rev = useMemo(() => {
    const { current, previousItems, note } = bucketByRange(appointments, chartRange, customFrom, customTo, todayYm);
    const data = current.map((b) => ({ label: b.label, recaudado: b.items.filter((a) => a.payment === 'paid').reduce((s, a) => s + (Number(a.price) || 0), 0) }));
    const totalRev = data.reduce((s, d) => s + d.recaudado, 0);
    const prevRev = previousItems ? previousItems.filter((a) => a.payment === 'paid').reduce((s, a) => s + (Number(a.price) || 0), 0) : null;
    return { data, note, totalRev, prevRev };
  }, [appointments, chartRange, customFrom, customTo, todayYm]);

  // ---- Cancelaciones: por día de la semana / por mes (período global) / últimos 12 meses ----
  const [cancMode, setCancMode] = useState('dia');
  const cancMonthly = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      const mk = a.date.slice(0, 7);
      if (!map[mk]) map[mk] = { tot: 0, canc: 0 };
      map[mk].tot++;
      if (a.attendance === 'no' || a.attendance === 'no-free') map[mk].canc++;
    });
    return Object.keys(map).sort().map((k) => ({ label: monthLabel(k), full: `${monthLabel(k)} ${k.slice(0, 4)}`, pct: map[k].tot ? Math.round((map[k].canc / map[k].tot) * 100) : 0, tot: map[k].tot, canc: map[k].canc }));
  }, [filtered]);
  const cancYear = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      const mk = a.date.slice(0, 7);
      if (!map[mk]) map[mk] = { tot: 0, canc: 0 };
      map[mk].tot++;
      if (a.attendance === 'no' || a.attendance === 'no-free') map[mk].canc++;
    });
    return Object.keys(map).sort().slice(-12).map((k) => ({ label: monthLabel(k), full: `${monthLabel(k)} ${k.slice(0, 4)}`, pct: map[k].tot ? Math.round((map[k].canc / map[k].tot) * 100) : 0, tot: map[k].tot, canc: map[k].canc }));
  }, [appointments]);
  const cancData = cancMode === 'dia'
    ? stats.weekdayData.map((d) => ({ label: d.label, full: d.label, pct: d.tasa, tot: d.tot, canc: d.canc }))
    : cancMode === 'mes' ? cancMonthly : cancYear;
  const cancNote = cancMode === 'dia' ? '% de turnos cancelados sobre el total agendado ese día de la semana.'
    : cancMode === 'mes' ? '% de turnos cancelados sobre el total agendado cada mes del período.'
    : '% de turnos cancelados en cada uno de los últimos 12 meses. No depende del período elegido arriba.';

  // ---- Tabla "Resumen por paciente": columnas elegibles, orden, búsqueda y exportar a Excel ----
  const ALL_COLUMNS = useMemo(() => ([
    { k: 'name', l: 'Paciente', t: 'text', lock: true },
    { k: 'total', l: 'Total', t: 'num' },
    { k: 'att', l: 'Asistió', t: 'num' },
    { k: 'cancDay', l: 'Canc. día', t: 'num' },
    { k: 'cancAdv', l: 'Canc. anticip.', t: 'num' },
    { k: 'cancFree', l: 'Liberó', t: 'num' },
    { k: 'paid', l: 'Pagado', t: 'money' },
    { k: 'debt', l: 'Debe', t: 'money' },
    { k: 'cashPct', l: '% Efectivo', t: 'pct' },
    { k: 'transferPct', l: '% Transf.', t: 'pct' },
    { k: 'months', l: 'Meses en sesión', t: 'num' },
    { k: 'attRate', l: '% Asistencia', t: 'pct' },
    { k: 'fee', l: 'Precio sesión', t: 'money' },
    { k: 'avgCollected', l: 'Cobrado por sesión', t: 'money' },
    { k: 'modality', l: 'Modalidad', t: 'text' },
    { k: 'freq', l: 'Frecuencia', t: 'text' },
    { k: 'status', l: 'Estado', t: 'text' },
    { k: 'lastVisit', l: 'Última sesión', t: 'text' },
  ]), []);
  const DEFAULT_ON = ['name', 'total', 'att', 'cancDay', 'cancAdv', 'paid', 'debt', 'cashPct', 'transferPct', 'months'];
  const [colsOn, setColsOn] = useState(DEFAULT_ON);
  const [colMenuOpen, setColMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('an-cols') || 'null');
      if (Array.isArray(saved) && saved.length) setColsOn(saved);
    } catch (e) { /* noop */ }
  }, []);
  function toggleCol(k) {
    setColsOn((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem('an-cols', JSON.stringify(next)); } catch (e) { /* noop */ }
      return next;
    });
  }
  const visibleCols = ALL_COLUMNS.filter((c) => c.lock || colsOn.includes(c.k));

  const sortedPatients = useMemo(() => {
    const q = normalize(patientFilter).trim();
    const arr = stats.byPatient.filter((p) => !q || normalize(p.name).includes(q));
    arr.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [stats.byPatient, sortCol, sortAsc, patientFilter]);

  function sortBy(col) {
    if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(false); }
  }
  const arrow = (col) => (sortCol === col ? (sortAsc ? '▲' : '▼') : '↕');
  function cellValue(c, row) {
    if (c.t === 'money') return fmt$(row[c.k]);
    if (c.t === 'pct') return `${row[c.k]}%`;
    if (c.k === 'status') return { active: 'Activo', paused: 'Pausado', suspended: 'Suspendido', discharged: 'De alta', abandoned: 'Abandonó', referred: 'Derivado' }[row[c.k]] || row[c.k] || '—';
    return row[c.k] ?? '—';
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const header = visibleCols.map((c) => c.l);
    const rows = sortedPatients.map((r) => visibleCols.map((c) => (c.t === 'text' ? String(cellValue(c, r)) : r[c.k])));
    const ws = XLSX.utils.aoa_to_sheet([[`Resumen por paciente — ${periodLabel}`], [], header, ...rows]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(visibleCols.length - 1, 0) } }];
    ws['!cols'] = visibleCols.map((c) => ({ wch: Math.max(c.l.length + 2, c.k === 'name' ? 20 : 10) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
    const fname = `resumen-pacientes-${periodLabel.toLowerCase().replace(/[^a-z0-9ñáéíóú]+/gi, '-').replace(/^-|-$/g, '')}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Período: fijo arriba, aplica a todo el análisis */}
      <div style={{ position: 'sticky', top: 0, zIndex: 4, background: 'var(--card)', margin: '0 -16px', padding: '14px 16px 10px', borderBottom: '1px solid var(--border-soft)' }}>
        <div className="segmented dark-on" role="group" aria-label="Período" style={{ width: '100%' }}>
          {PERIOD_OPTS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              aria-pressed={period === v}
              className={`pressable segmented-item${period === v ? ' active' : ''}`}
              style={{ flex: '1 1 auto', minWidth: 0, fontSize: 10.5, padding: '7px 3px' }}
            >
              {l}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 10.5, color: 'var(--text-lt)' }}>
            <span>Desde</span>
            <input type="month" value={rangeFrom} max={todayYm} onChange={(e) => e.target.value && setRangeFrom(e.target.value)} aria-label="Desde"
              style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 7px', borderRadius: 8, background: 'var(--muted)' }} />
            <span>hasta</span>
            <input type="month" value={rangeTo} onChange={(e) => e.target.value && setRangeTo(e.target.value)} aria-label="Hasta"
              style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 7px', borderRadius: 8, background: 'var(--muted)' }} />
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-lt)', marginTop: 6 }}>Mostrando: {periodLabel} · aplica a todo el análisis</div>
      </div>

      {/* Proyección */}
      <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setProjectionOffset((v) => v - 1)} className="pressable" aria-label="Mes anterior" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Proyección · {projection.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--teal)', marginTop: 2 }}>{fmt$(projection.total)}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{projection.count} turno{projection.count === 1 ? '' : 's'} confirmado{projection.count === 1 ? '' : 's'}</div>
        </div>
        <button onClick={() => setProjectionOffset((v) => v + 1)} className="pressable" aria-label="Mes siguiente" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={14} /></button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '1fr', gap: 9 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '11px 10px', borderTop: '3px solid var(--teal-dk)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 82, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.03em', lineHeight: 1.3 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 800, marginTop: 3, whiteSpace: 'nowrap', color: k.color || 'var(--text)' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 9, color: 'var(--text-lt)', marginTop: 2, lineHeight: 1.3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Sesiones: asistidas + canceladas apiladas; la barra es el total agendado */}
      <div className="fcard">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="flabel">Sesiones</div>
          <div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 800 }}>{ses.totalAtt} asistidas</span>
            <Delta current={ses.totalAtt} previous={ses.prevAtt} />
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-lt)', margin: '-4px 0 10px' }}>{ses.note} · canceladas: {ses.totalCanc}</p>
        {ses.data.every((d) => d.total === 0) ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin turnos en este período.</p>
        ) : (
          <div style={{ width: '100%', height: 150 }}>
            <ResponsiveContainer>
              <BarChart data={ses.data} margin={{ top: 16, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                <Bar dataKey="asistidas" name="Asistidas" stackId="s" fill="var(--teal-dk)" radius={[0, 0, 2, 2]} maxBarSize={22} />
                <Bar dataKey="canceladas" name="Canceladas" stackId="s" fill="var(--warning)" radius={[4, 4, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="total" position="top" style={{ fontSize: 9.5, fontWeight: 700, fill: 'var(--text)', fontFamily: 'var(--font-mono, monospace)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-md)', marginTop: 8 }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--teal-dk)', marginRight: 5 }} />Asistidas</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--warning)', marginRight: 5 }} />Canceladas</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-lt)' }}>Barra = total agendado</span>
        </div>
      </div>

      {/* Recaudación */}
      <div className="fcard">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="flabel">Recaudación</div>
          <div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 800 }}>{fmt$(rev.totalRev)}</span>
            <Delta current={rev.totalRev} previous={rev.prevRev} />
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-lt)', margin: '-4px 0 10px' }}>{rev.note}</p>
        {rev.data.every((d) => d.recaudado === 0) ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin cobros en este período.</p>
        ) : (
          <div style={{ width: '100%', height: 150 }}>
            <ResponsiveContainer>
              <AreaChart data={rev.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="recaudadoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ECFB2" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3ECFB2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-lt)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={34} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => [fmt$(v), 'Recaudado']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                <Area type="monotone" dataKey="recaudado" stroke="var(--teal-dk)" strokeWidth={2} fill="url(#recaudadoFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cancelaciones: por día / por mes / últimos 12 meses, heatmap verde→rojo */}
      <div className="fcard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          <div className="flabel" style={{ margin: 0 }}>
            {cancMode === 'dia' ? 'Cancelaciones por día' : cancMode === 'mes' ? 'Cancelaciones por mes' : 'Cancelaciones · 12 meses'}
          </div>
          <div className="segmented" style={{ padding: 2 }}>
            {[['dia', 'Por día'], ['mes', 'Por mes'], ['anio', '12 meses']].map(([v, l]) => (
              <button key={v} onClick={() => setCancMode(v)} aria-pressed={cancMode === v} className={`pressable segmented-item${cancMode === v ? ' active' : ''}`} style={{ fontSize: 10, padding: '4px 9px' }}>{l}</button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-lt)', margin: '0 0 10px' }}>{cancNote}</p>
        {cancData.every((d) => d.tot === 0) ? (
          <p style={{ fontSize: 12, color: 'var(--text-lt)', margin: 0 }}>Sin datos para mostrar.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96 }}>
              {(() => {
                const vals = cancData.map((d) => d.pct);
                const hi = Math.max(...vals), lo = Math.min(...vals);
                return cancData.map((d) => {
                  const k = hi === lo ? 0 : (d.pct - lo) / (hi - lo);
                  return (
                    <div key={d.label} title={`${d.full}: ${d.pct}% (${d.canc} de ${d.tot})`} aria-label={`${d.full}: ${d.pct}% cancelado`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span className="mono" style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>{d.pct}%</span>
                      <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((d.pct / (hi || 1)) * 100, 3)}%`, background: heatColor(k), borderRadius: '4px 4px 2px 2px' }} />
                    </div>
                  );
                });
              })()}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {cancData.map((d) => <span key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--text-lt)' }}>{d.label}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,#2BA98D,#F5A524,#E5484D)' }} />
              <span style={{ fontSize: 9.5, color: 'var(--text-lt)' }}>menos → más</span>
            </div>
          </>
        )}
      </div>

      {/* Resumen por paciente: columnas elegibles, búsqueda, orden y exportar a Excel */}
      <div className="fcard" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div className="flabel" style={{ margin: 0 }}>Resumen por paciente</div>
          <button
            onClick={() => setColMenuOpen((v) => !v)}
            className="pressable"
            aria-label="Opciones de la tabla"
            aria-haspopup="true"
            aria-expanded={colMenuOpen}
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: colMenuOpen ? 'var(--btn)' : 'var(--muted)', color: colMenuOpen ? 'var(--btn-fg)' : 'var(--text-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <MoreHorizontal size={16} />
          </button>
          {colMenuOpen && (
            <div className="card" style={{ position: 'absolute', top: 36, right: 0, width: 230, padding: 10, zIndex: 20, borderRadius: 14, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-lt)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 4px 6px' }}>Columnas visibles</div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {ALL_COLUMNS.map((c) => (
                  <label key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: c.lock ? 'default' : 'pointer', color: c.lock ? 'var(--text-lt)' : 'var(--text-md)' }}>
                    <input type="checkbox" checked={c.lock || colsOn.includes(c.k)} disabled={c.lock} onChange={() => toggleCol(c.k)} style={{ accentColor: 'var(--teal-dk)', width: 15, height: 15, margin: 0 }} />
                    {c.l}
                  </label>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
              <button onClick={exportXlsx} className="btn btn-accent btn-block pressable" style={{ fontSize: 12, padding: 9, boxShadow: 'none' }}>
                <Download size={14} /> Descargar Excel (.xlsx)
              </button>
            </div>
          )}
        </div>

        <input
          type="search"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          placeholder="Buscar paciente…"
          aria-label="Buscar paciente"
          style={{ width: '100%', margin: '10px 0', padding: '10px 13px', borderRadius: 12, background: 'var(--muted)', fontSize: 14 }}
        />

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr>
                {visibleCols.map((c) => (
                  <th
                    key={c.k}
                    onClick={() => sortBy(c.k)}
                    style={{
                      textAlign: c.t === 'text' ? 'left' : 'right', padding: '6px 8px', borderBottom: '2px solid var(--border)', cursor: 'pointer', userSelect: 'none',
                      color: sortCol === c.k ? 'var(--ink)' : 'var(--text-lt)', fontWeight: 700, whiteSpace: 'nowrap',
                      ...(c.lock ? { position: 'sticky', left: 0, background: 'var(--card)', zIndex: 1, boxShadow: '1px 0 0 var(--border)' } : {}),
                    }}
                  >
                    {c.l} <span style={{ fontSize: 9, opacity: sortCol === c.k ? 1 : 0.5, color: sortCol === c.k ? 'var(--teal-dk)' : 'inherit' }}>{arrow(c.k)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPatients.map((p) => (
                <tr key={p.name}>
                  {visibleCols.map((c) => (
                    <td key={c.k} style={{
                      padding: '6px 8px', borderBottom: '1px solid var(--border-soft)', textAlign: c.t === 'text' ? 'left' : 'right', whiteSpace: 'nowrap',
                      fontWeight: c.k === 'name' || (c.k === 'debt' && p.debt > 0) ? 700 : 400,
                      color: c.k === 'debt' && p.debt > 0 ? 'var(--warning-text)' : 'inherit',
                      ...(c.lock ? { position: 'sticky', left: 0, background: 'var(--card)', zIndex: 1, boxShadow: '1px 0 0 var(--border)' } : {}),
                    }}>
                      {cellValue(c, p)}
                    </td>
                  ))}
                </tr>
              ))}
              {sortedPatients.length === 0 && (
                <tr><td colSpan={visibleCols.length} style={{ textAlign: 'center', color: 'var(--text-lt)', padding: 16 }}>Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-lt)', marginTop: 8 }}>{sortedPatients.length} paciente{sortedPatients.length === 1 ? '' : 's'} · {periodLabel} · {visibleCols.length} columnas</div>
      </div>
    </div>
  );
}
