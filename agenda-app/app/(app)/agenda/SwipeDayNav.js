'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SwipeDayNav({ prevHref, nextHref, dateKey, children }) {
  const router = useRouter();
  const touchStart = useRef(null);

  function onTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    // Gesto horizontal claro (no un scroll vertical accidental)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (navigator.vibrate) navigator.vibrate(8);
      router.push(dx > 0 ? prevHref : nextHref);
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
      <div key={dateKey} className="day-fade-in">{children}</div>
    </div>
  );
}
