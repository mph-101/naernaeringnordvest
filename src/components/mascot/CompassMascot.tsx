import { useEffect, useRef, useState } from "react";

interface Props {
  size?: number;
  pointTo?: { x: number; y: number } | null;
  className?: string;
  blink?: boolean;
}

/**
 * Living compass mascot. The needle gently breathes and rotates toward
 * an optional target point (the spotlight or the cursor). Built with the
 * Nær Næring peach + dusty-rose palette via semantic tokens.
 */
export function CompassMascot({ size = 96, pointTo = null, className = "", blink = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!pointTo || !ref.current) {
      // gentle idle wander
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const elapsed = (t - start) / 1000;
        setAngle(Math.sin(elapsed * 0.7) * 18);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = pointTo.x - cx;
    const dy = pointTo.y - cy;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // needle points up by default
    setAngle(deg);
  }, [pointTo]);

  return (
    <div
      ref={ref}
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle at 30% 30%, hsl(var(--accent)/0.18), hsl(var(--card)) 70%)",
        boxShadow: "0 8px 22px -10px hsl(var(--accent)/0.35), inset 0 0 0 1px hsl(var(--border))",
        animation: blink ? "mascot-breathe 3.4s ease-in-out infinite" : undefined,
      }} />
      {/* Cardinal ticks */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {[0, 90, 180, 270].map((a) => (
          <line key={a} x1="50" y1="8" x2="50" y2="14"
            stroke="hsl(var(--muted-foreground))" strokeWidth="1.4" strokeLinecap="round"
            transform={`rotate(${a} 50 50)`} opacity="0.55" />
        ))}
        {/* Needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 50%", transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
          <polygon points="50,16 56,52 50,48 44,52" fill="hsl(var(--accent))" />
          <polygon points="50,84 56,52 50,56 44,52" fill="hsl(var(--muted-foreground))" opacity="0.55" />
        </g>
        {/* Hub + face */}
        <circle cx="50" cy="50" r="6" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="1.5" />
        <circle cx="48" cy="49" r="0.9" fill="hsl(var(--foreground))" />
        <circle cx="52" cy="49" r="0.9" fill="hsl(var(--foreground))" />
        <path d="M47.5 51.5 Q50 53.5 52.5 51.5" stroke="hsl(var(--foreground))" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
      <style>{`
        @keyframes mascot-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}