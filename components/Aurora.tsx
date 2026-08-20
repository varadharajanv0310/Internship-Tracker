/** The drifting gradient field behind the whole app. Decorative only. */
const BLOBS = [
  { left: "2%", top: "0", width: 620, height: 480, color: "#ff7a1a", stop: "68%" },
  { left: "26%", top: "60px", width: 720, height: 520, color: "#d94a8c", stop: "66%" },
  { left: "52%", top: "-40px", width: 800, height: 560, color: "#6b4ad9", stop: "68%" },
  { left: "76%", top: "80px", width: 620, height: 460, color: "#1e3fa8", stop: "70%" },
];

function rgba(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
}

export function Aurora() {
  return (
    <>
      <div className="aurora-wrap no-print" aria-hidden="true">
        <div className="aurora">
          {BLOBS.map((b) => (
            <span
              key={b.left}
              style={{
                left: b.left,
                top: b.top,
                width: b.width,
                height: b.height,
                background: `radial-gradient(circle, ${b.color} 0%, ${rgba(b.color)} ${b.stop})`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="aurora-veil no-print" aria-hidden="true" />
    </>
  );
}
