import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Agenda Psicológica';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1729',
          gap: 28,
        }}
      >
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 32,
            background: '#0F1729',
            border: '7px solid #3ECFB2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#3ECFB2' }} />
        </div>
        <div style={{ color: '#fff', fontSize: 60, fontWeight: 800, letterSpacing: -1 }}>Agenda Psicológica</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 28 }}>Hecha por y para psicólogos</div>
      </div>
    ),
    { ...size }
  );
}
