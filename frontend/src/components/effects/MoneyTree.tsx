import { useState, useEffect, useRef, useCallback } from "react";

type Dollar = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  swayDuration: number;
  swayDelay: string;
  opacity: number;
  startY: string;
};

const DOLLARS_COUNT = 25;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function MoneyTree({ maxHeight = "50vh" }: { maxHeight?: string } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dollars, setDollars] = useState<Dollar[]>([]);
  const [treeKey, setTreeKey] = useState(0);

  const regenerate = useCallback(() => {
    const newDollars: Dollar[] = Array.from({ length: DOLLARS_COUNT }, (_, i) => ({
      id: i,
      x: randomBetween(18, 78),
      delay: randomBetween(0, 6),
      duration: randomBetween(4, 8),
      size: randomBetween(16, 28),
      swayDuration: randomBetween(2.5, 5),
      swayDelay: `${randomBetween(0, 3)}s`,
      opacity: randomBetween(0.7, 1),
      startY: `${randomBetween(8, 40)}%`,
    }));
    setDollars(newDollars);
    setTreeKey((k) => k + 1);
  }, []);

  useEffect(() => {
    regenerate();
    const interval = setInterval(regenerate, 9000);
    return () => clearInterval(interval);
  }, [regenerate]);

  return (
    <div
      ref={containerRef}
      className="flex items-end justify-center overflow-hidden"
      style={{ maxHeight, height: maxHeight }}
    >
      {/* Realistic SVG Tree */}
      <svg
        key={treeKey}
        className="h-full w-auto max-w-3xl drop-shadow-2xl"
        viewBox="0 0 500 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "treeSway 4s ease-in-out infinite" }}
      >
        <defs>
          {/* Bark texture filter */}
          <filter id="barkTexture" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="4" seed="2" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
            <feComponentTransfer in="blended">
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
          </filter>

          {/* Foliage shadow filter */}
          <filter id="foliageShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0,0,0,0.25)" />
          </filter>

          {/* Canopy gradient - multiple layers for 3D */}
          <radialGradient id="canopyMain" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#7CB342" />
            <stop offset="25%" stopColor="#558B2F" />
            <stop offset="55%" stopColor="#33691E" />
            <stop offset="100%" stopColor="#1B5E20" />
          </radialGradient>

          <radialGradient id="canopyBack" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#2E7D32" />
            <stop offset="60%" stopColor="#1B5E20" />
            <stop offset="100%" stopColor="#0D3B0F" />
          </radialGradient>

          <radialGradient id="canopyHighlight" cx="30%" cy="25%" r="40%">
            <stop offset="0%" stopColor="rgba(165,214,167,0.5)" />
            <stop offset="100%" stopColor="rgba(165,214,167,0)" />
          </radialGradient>

          <radialGradient id="trunkGrad" cx="40%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#8D6E63" />
            <stop offset="30%" stopColor="#6D4C41" />
            <stop offset="70%" stopColor="#4E342E" />
            <stop offset="100%" stopColor="#3E2723" />
          </radialGradient>

          {/* Bark pattern */}
          <pattern id="barkPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="transparent" />
            <path d="M0 8 Q5 6 10 8 T20 8" stroke="rgba(62,39,23,0.15)" strokeWidth="0.8" fill="none" />
            <path d="M0 16 Q5 14 10 16 T20 16" stroke="rgba(62,39,23,0.1)" strokeWidth="0.6" fill="none" />
            <line x1="3" y1="0" x2="3" y2="20" stroke="rgba(62,39,23,0.06)" strokeWidth="0.5" />
            <line x1="14" y1="0" x2="14" y2="20" stroke="rgba(62,39,23,0.06)" strokeWidth="0.5" />
          </pattern>

          <clipPath id="trunkClip">
            <path d="M230 600 L240 380 Q250 370 260 380 L270 600 Z" />
          </clipPath>
        </defs>

        {/* ===== BACK CANOPY (darker, behind trunk) ===== */}
        <g filter="url(#foliageShadow)" opacity="0.85">
          <ellipse cx="250" cy="160" rx="180" ry="155" fill="url(#canopyBack)" transform="translate(8, 12)" />
        </g>

        {/* ===== TRUNK ===== */}
        <g filter="url(#barkTexture)">
          {/* Main trunk shape */}
          <path
            d="M230 600
               L235 500 Q237 420 245 360
               L255 360 Q263 420 265 500
               L270 600 Z"
            fill="url(#trunkGrad)"
          />
          {/* Bark overlay pattern */}
          <path
            d="M230 600 L235 500 Q237 420 245 360 L255 360 Q263 420 265 500 L270 600 Z"
            fill="url(#barkPattern)"
          />
          {/* Trunk highlight (left edge) */}
          <path
            d="M232 600 L237 500 Q239 420 245 360 L248 360 Q242 420 240 500 L235 600 Z"
            fill="rgba(141,110,99,0.2)"
          />
          {/* Trunk shadow (right edge) */}
          <path
            d="M265 500 Q263 420 255 360 L258 360 Q266 420 268 500 L270 600 Z"
            fill="rgba(62,39,23,0.25)"
          />
        </g>

        {/* ===== ROOTS ===== */}
        <g fill="url(#trunkGrad)" filter="url(#barkTexture)">
          <path d="M230 600 Q210 595 190 600 Q180 602 175 608 Q185 605 200 602 Q220 600 230 600 Z" />
          <path d="M270 600 Q290 595 310 600 Q320 602 325 608 Q315 605 300 602 Q280 600 270 600 Z" />
          <path d="M228 600 Q215 598 200 598 Q192 598 188 604 Q198 601 210 600 Q220 600 228 600 Z" />
          <path d="M272 600 Q285 598 300 598 Q308 598 312 604 Q302 601 290 600 Q280 600 272 600 Z" />
        </g>

        {/* ===== BRANCHES (with sway) ===== */}
        <g stroke="#5D4037" strokeLinecap="round" style={{ transformOrigin: "250px 370px" }}>
          {/* Main branches */}
          <g style={{ animation: "branchSway1 3.5s ease-in-out infinite" }}>
            <path d="M245 380 Q200 340 155 290" strokeWidth="7" fill="none" />
            <path d="M240 370 Q205 340 175 310" strokeWidth="4" fill="none" />
            <path d="M160 295 Q145 280 130 275" strokeWidth="2.5" fill="none" />
          </g>
          <g style={{ animation: "branchSway2 4s ease-in-out infinite 0.5s" }}>
            <path d="M255 380 Q300 340 345 290" strokeWidth="7" fill="none" />
            <path d="M260 370 Q295 340 325 310" strokeWidth="4" fill="none" />
            <path d="M340 295 Q355 280 370 275" strokeWidth="2.5" fill="none" />
          </g>
          <g style={{ animation: "branchSway1 3.8s ease-in-out infinite 1s" }}>
            <path d="M248 365 Q220 330 185 300" strokeWidth="5" fill="none" />
            <path d="M252 365 Q280 330 315 300" strokeWidth="5" fill="none" />
          </g>
          <g style={{ animation: "branchSway2 3.2s ease-in-out infinite 1.5s" }}>
            <path d="M245 355 Q215 310 170 260" strokeWidth="3.5" fill="none" />
            <path d="M255 355 Q285 310 330 260" strokeWidth="3.5" fill="none" />
          </g>
          {/* Small twigs */}
          <g style={{ animation: "branchSway1 3s ease-in-out infinite 0.8s" }}>
            <path d="M150 295 Q140 278 125 265" strokeWidth="2" fill="none" />
            <path d="M350 295 Q360 278 375 265" strokeWidth="2" fill="none" />
          </g>
          <g style={{ animation: "branchSway2 3.6s ease-in-out infinite 2s" }}>
            <path d="M180 310 Q168 295 155 288" strokeWidth="1.8" fill="none" />
            <path d="M320 310 Q332 295 345 288" strokeWidth="1.8" fill="none" />
          </g>
        </g>

        {/* ===== MAIN CANOPY (front) ===== */}
        <g filter="url(#foliageShadow)">
          <ellipse cx="250" cy="170" rx="175" ry="150" fill="url(#canopyMain)" />
        </g>

        {/* Canopy highlight overlay */}
        <ellipse cx="220" cy="130" rx="100" ry="80" fill="url(#canopyHighlight)" />

        {/* ===== FOLIAGE CLUSTERS for realism ===== */}
        <g opacity="0.5">
          <circle cx="160" cy="140" r="55" fill="#689F38" />
          <circle cx="340" cy="150" r="50" fill="#689F38" />
          <circle cx="200" cy="100" r="60" fill="#7CB342" />
          <circle cx="300" cy="95" r="55" fill="#7CB342" />
          <circle cx="250" cy="80" r="65" fill="#8BC34A" />
          <circle cx="180" cy="180" r="45" fill="#33691E" />
          <circle cx="320" cy="175" r="45" fill="#33691E" />
          <circle cx="250" cy="200" r="50" fill="#2E7D32" />
        </g>

        {/* Bright top highlights */}
        <g opacity="0.35">
          <circle cx="220" cy="90" r="40" fill="#C5E1A5" />
          <circle cx="280" cy="100" r="35" fill="#C5E1A5" />
          <circle cx="250" cy="70" r="45" fill="#DCEDC8" />
        </g>

        {/* Edge rim light */}
        <ellipse
          cx="250" cy="170" rx="175" ry="150"
          fill="none"
          stroke="rgba(129,199,132,0.2)"
          strokeWidth="2"
        />
      </svg>

      {/* ===== FALLING DOLLARS (CSS animated) ===== */}
      <div className="absolute inset-0">
        {dollars.map((d) => (
          <span
            key={d.id}
            className="absolute block text-2xl font-bold"
            style={{
              left: `${d.x}%`,
              top: d.startY,
              fontSize: d.size,
              opacity: d.opacity,
              color: "#FFD700",
              textShadow: "0 0 6px rgba(255,215,0,0.6), 0 1px 2px rgba(0,0,0,0.3)",
              animation: `fallMoney ${d.duration}s linear ${d.delay}s infinite, swayMoney ${d.swayDuration}s ease-in-out ${d.swayDelay} infinite`,
              willChange: "transform",
            }}
          >
            $
          </span>
        ))}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes treeSway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(0.4deg); }
          75% { transform: rotate(-0.4deg); }
        }
        @keyframes branchSway1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1.2deg); }
        }
        @keyframes branchSway2 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-1deg); }
        }
        @keyframes fallMoney {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0;
          }
          5% { opacity: 1; }
          85% { opacity: 0.9; }
          100% {
            transform: translateY(110vh) rotate(720deg) scale(0.4);
            opacity: 0;
          }
        }
        @keyframes swayMoney {
          0%, 100% { margin-left: 0px; }
          25% { margin-left: 35px; }
          75% { margin-left: -35px; }
        }
      `}</style>
    </div>
  );
}
