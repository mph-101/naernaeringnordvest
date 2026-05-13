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
  const [bob, setBob] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);
  const [waving, setWaving] = useState(false);
  const [mouth, setMouth] = useState(0); // 0..1 talking

  // Idle eye blink + occasional wave + tiny bob
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = (t - start) / 1000;
      setBob(Math.sin(elapsed * 1.6) * 2.4);
      setTilt(Math.sin(elapsed * 0.9) * 4);
      setMouth(Math.max(0, Math.sin(elapsed * 6.5)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const blinkInt = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 140);
    }, 2600 + Math.random() * 1800);
    const waveInt = setInterval(() => {
      setWaving(true);
      setTimeout(() => setWaving(false), 900);
    }, 5200 + Math.random() * 2400);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(blinkInt);
      clearInterval(waveInt);
    };
  }, []);

  useEffect(() => {
    if (!pointTo || !ref.current) {
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const elapsed = (t - start) / 1000;
        setAngle(Math.sin(elapsed * 0.7) * 22 + Math.sin(elapsed * 2.3) * 4);
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
      style={{ width: size, height: size, transform: `translateY(${bob}px) rotate(${tilt * 0.4}deg)`, transition: "transform 0.15s linear" }}
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
        {/* Hub + lively face — Mr. DNA-inspired */}
        <g style={{ transform: `translateY(${Math.sin(performance.now()/300)*0.15}px)` }}>
          <circle cx="50" cy="50" r="9" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="1.6" />
          {/* Cheeks */}
          <circle cx="44.5" cy="52.5" r="1.3" fill="hsl(var(--accent))" opacity="0.35" />
          <circle cx="55.5" cy="52.5" r="1.3" fill="hsl(var(--accent))" opacity="0.35" />
          {/* Eyes (white) */}
          <ellipse cx="47" cy="48.5" rx="1.5" ry={eyeBlink ? 0.15 : 1.7} fill="hsl(var(--foreground))" />
          <ellipse cx="53" cy="48.5" rx="1.5" ry={eyeBlink ? 0.15 : 1.7} fill="hsl(var(--foreground))" />
          {/* Pupil sparkle */}
          {!eyeBlink && (
            <>
              <circle cx="47.5" cy="48" r="0.4" fill="hsl(var(--card))" />
              <circle cx="53.5" cy="48" r="0.4" fill="hsl(var(--card))" />
            </>
          )}
          {/* Smile / talking mouth */}
          <path
            d={`M47 ${52.5 + mouth * 0.4} Q50 ${53.6 + mouth * 1.1} 53 ${52.5 + mouth * 0.4}`}
            stroke="hsl(var(--foreground))" strokeWidth="0.85" fill="none" strokeLinecap="round"
          />
          {/* Tiny waving arm */}
          <g style={{ transform: `rotate(${waving ? -35 : -10}deg)`, transformOrigin: "58px 50px", transition: "transform 0.25s ease-out" }}>
            <line x1="58" y1="50" x2={waving ? 64 : 61} y2={waving ? 44 : 47}
              stroke="hsl(var(--accent))" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx={waving ? 64 : 61} cy={waving ? 44 : 47} r="0.9" fill="hsl(var(--accent))" />
          </g>
        </g>
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