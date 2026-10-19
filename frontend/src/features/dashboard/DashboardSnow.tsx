type Flake = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: number;
  duration: number;
  delay: number;
};

/** Sparse flakes so values stay readable. Positions are percentages. */
const FLAKES: readonly Flake[] = [
  { x: 6, y: 14, size: 4, opacity: 0.86, blur: 0, duration: 5.4, delay: 0 },
  { x: 18, y: 76, size: 3, opacity: 0.62, blur: 0.7, duration: 7.2, delay: 0.4 },
  { x: 31, y: 22, size: 5, opacity: 0.74, blur: 0, duration: 6.1, delay: 0.9 },
  { x: 44, y: 88, size: 2.5, opacity: 0.55, blur: 1, duration: 8, delay: 0.2 },
  { x: 57, y: 10, size: 3.5, opacity: 0.8, blur: 0.3, duration: 5.8, delay: 1.2 },
  { x: 69, y: 64, size: 6, opacity: 0.58, blur: 0.5, duration: 7.6, delay: 0.6 },
  { x: 82, y: 28, size: 3, opacity: 0.9, blur: 0, duration: 6.4, delay: 1.5 },
  { x: 91, y: 80, size: 4, opacity: 0.66, blur: 0.4, duration: 6.9, delay: 0.3 },
  { x: 12, y: 46, size: 2, opacity: 0.72, blur: 0.9, duration: 8.4, delay: 1.1 },
  { x: 38, y: 6, size: 3, opacity: 0.6, blur: 0.6, duration: 7.4, delay: 0.8 },
  { x: 52, y: 54, size: 2.5, opacity: 0.55, blur: 1.1, duration: 9, delay: 0.5 },
  { x: 26, y: 92, size: 4.5, opacity: 0.78, blur: 0, duration: 5.9, delay: 1.3 },
];

function shift(value: number, seed: number, step: number) {
  const nudged = value + (seed % 9) * step;
  return 4 + (((nudged % 86) + 86) % 86);
}

/**
 * Subtle 3D snow for hero-theme dashboard tiles.
 * White bodies stay in the 0.55–0.9 range so they read on steel.
 * The steel-blue drop shadow and inset shade stay opaque so the same
 * flakes still show on white sky-krypton cards.
 */
export function DashboardSnow({ seed = 0 }: { seed?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          className="absolute rounded-full shadow-[0_1.5px_3px_rgba(21,56,95,0.45),0_0_0_0.5px_rgba(42,64,88,0.28)]"
          style={{
            left: `${shift(flake.x, seed, 5 + (index % 4))}%`,
            top: `${shift(flake.y, seed, 3 + (index % 3))}%`,
            width: flake.size,
            height: flake.size,
            filter: flake.blur > 0 ? `blur(${flake.blur}px)` : undefined,
            animation: `float ${flake.duration}s ease-in-out infinite`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <span
            className="absolute inset-0 rounded-full bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_1.5px_rgba(42,64,88,0.42)]"
            style={{ opacity: flake.opacity }}
          />
        </span>
      ))}
    </div>
  );
}
