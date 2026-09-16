export default function Loading() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ height: 32, width: '60%', margin: '0 auto 16px', background: '#E4E7F0', borderRadius: 8, animation: 'pulse 1.2s ease-in-out infinite' }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 56, background: '#E4E7F0', borderRadius: 12, marginBottom: 10, animation: 'pulse 1.2s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}
