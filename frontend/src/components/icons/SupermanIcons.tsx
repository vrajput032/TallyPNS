import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Original diamond crest — not a licensed trademark. */
export function SupermanCrestIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        d="M12 2.5 19.5 7v5.2c0 4.3-3 7.6-7.5 9.3-4.5-1.7-7.5-5-7.5-9.3V7L12 2.5Z"
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M8.2 12.2 12 8.5l3.8 3.7L12 15.8 8.2 12.2Z" fill="currentColor" />
    </svg>
  );
}

export function SupermanCapeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M8 4.5c1.2-.8 2.6-1.2 4-1.2s2.8.4 4 1.2" />
      <path d="M7 6.5c0 5.5-1.8 10.2-4 13.5 3.2-.8 5.8-1 8-.6 2.2-.4 4.8-.2 8 .6-2.2-3.3-4-8-4-13.5" />
      <circle cx="12" cy="8" r="2.2" />
    </svg>
  );
}

export function SupermanCityIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M3 20h18" />
      <path d="M5 20V11l3-2 3 2v9" />
      <path d="M11 20V7l3.5-2.5L18 7v13" />
      <path d="M7.5 13v1.5M7.5 16v1.5M14.5 10v1.5M14.5 13.5V15" />
    </svg>
  );
}

export function SupermanBurstIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M12 3v3.2M12 17.8V21M4.8 6.2l2.3 2.3M16.9 15.5l2.3 2.3M3 12h3.2M17.8 12H21M4.8 17.8l2.3-2.3M16.9 8.5l2.3-2.3" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity={0.2} />
    </svg>
  );
}

export function SupermanSwapIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M7 8h11l-2.5-2.5" />
      <path d="M17 16H6l2.5 2.5" />
    </svg>
  );
}

export function SupermanCoinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <ellipse cx="12" cy="8" rx="7" ry="3.2" />
      <path d="M5 8v4c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V8" />
      <path d="M5 12v4c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-4" />
    </svg>
  );
}

export function SupermanPipeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SupermanFactoryIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M3 20h18" />
      <path d="M5 20V10l4 3V10l4 3V8h6v12" />
      <path d="M16 5.5c.8-1.2 1.5-1.8 2.4-2.2" />
    </svg>
  );
}

export function SupermanLayersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </svg>
  );
}

export function SupermanHomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...stroke} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M7 10.5V20h10V10.5" />
      <path d="M12 2.5 19.2 7v4.5c0 3.6-2.5 6.4-7.2 7.8-4.7-1.4-7.2-4.2-7.2-7.8V7L12 2.5Z" opacity={0.35} />
    </svg>
  );
}
