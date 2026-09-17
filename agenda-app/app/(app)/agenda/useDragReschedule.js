'use client';

import { useRef, useState } from 'react';

const LONG_PRESS_MS = 480;
const MOVE_CANCEL_PX = 10;

export function useDragReschedule(onDrop) {
  const [dragging, setDragging] = useState(null); // { id, label, x, y }
  const [hoverSlot, setHoverSlot] = useState(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const draggingRef = useRef(null);
  const hoverRef = useRef(null);

  function activate(meta, x, y) {
    if (navigator.vibrate) navigator.vibrate(15);
    draggingRef.current = meta;
    setDragging({ ...meta, x, y });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }

  function onMove(e) {
    if (!draggingRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDragging((d) => (d ? { ...d, x: touch.clientX, y: touch.clientY } : d));
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = el?.closest?.('[data-slot]');
    const slot = slotEl?.dataset?.slot || null;
    hoverRef.current = slot;
    setHoverSlot(slot);
  }

  function onEnd() {
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
    window.removeEventListener('touchcancel', onEnd);
    const meta = draggingRef.current;
    const slot = hoverRef.current;
    draggingRef.current = null;
    hoverRef.current = null;
    setDragging(null);
    setHoverSlot(null);
    if (meta && slot) onDrop(meta, slot);
  }

  function dragHandlers(meta) {
    return {
      onTouchStart: (e) => {
        const touch = e.touches[0];
        startRef.current = { x: touch.clientX, y: touch.clientY };
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => activate(meta, touch.clientX, touch.clientY), LONG_PRESS_MS);
      },
      onTouchMove: (e) => {
        if (draggingRef.current) return; // ya activo, lo maneja el listener global
        const touch = e.touches[0];
        if (!startRef.current) return;
        const dx = Math.abs(touch.clientX - startRef.current.x);
        const dy = Math.abs(touch.clientY - startRef.current.y);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearTimeout(timerRef.current);
      },
      onTouchEnd: () => clearTimeout(timerRef.current),
    };
  }

  return { dragging, hoverSlot, dragHandlers };
}
