import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type UseTiltOptions = {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  enabled?: boolean;
  enableSpotlight?: boolean;
};

export function useTilt(options: UseTiltOptions = {}) {
  const {
    maxTilt = 12,
    perspective = 1000,
    scale = 1.02,
    speed = 400,
    enabled = true,
    enableSpotlight = true,
  } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("");
  const [spotlight, setSpotlight] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let rafId: number | undefined;

    const handleMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -maxTilt;
        const tiltY = ((x - centerX) / centerX) * maxTilt;

        setTransform(
          `perspective(${perspective}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
        );

        if (enableSpotlight) {
          setSpotlight({
            x: Number(((x / rect.width) * 100).toFixed(1)),
            y: Number(((y / rect.height) * 100).toFixed(1)),
          });
        }
      });
    };

    const handleEnter = () => {
      setIsHovering(true);
      el.style.transition = `transform ${speed}ms ease-out`;
    };

    const handleLeave = () => {
      setIsHovering(false);
      setSpotlight(null);
      el.style.transition = `transform ${speed}ms ease-out`;
      setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [maxTilt, perspective, scale, speed, enabled, enableSpotlight]);

  return { ref, transform, isHovering, spotlight } as const;
}

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  maxTilt?: number;
  scale?: number;
  speed?: number;
  disabled?: boolean;
  enableSpotlight?: boolean;
};

export function TiltCard({
  children,
  className,
  style,
  maxTilt = 12,
  scale = 1.02,
  speed = 400,
  disabled = false,
  enableSpotlight = true,
}: TiltCardProps) {
  const { ref, transform, isHovering, spotlight } = useTilt({
    maxTilt,
    scale,
    speed,
    enabled: !disabled,
    enableSpotlight,
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        willChange: "transform",
        transform,
        transition: "transform 400ms ease-out",
        ...style,
      }}
    >
      {/* Spotlight overlay that follows cursor */}
      {isHovering && spotlight && enableSpotlight && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${spotlight.x}% ${spotlight.y}%, rgba(var(--primary), 0.06), transparent 40%)`,
            opacity: isHovering ? 1 : 0,
          }}
        />
      )}
      {children}
    </div>
  );
}
