import { useEffect, useState } from "react";

const EVENT = "themechange";

export function usePrimaryColor() {
  const [color, setColor] = useState(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
  );

  useEffect(() => {
    const handler = () => {
      setColor(getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return color;
}
