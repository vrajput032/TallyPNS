import { Lottie } from "lottie-react";
import { useCallback, useEffect, useState } from "react";
import { COLD_START_HINT, COLD_START_MESSAGES } from "@/lib/coldStartMessages";
import { cn } from "@/lib/utils";

type ColdStartLoaderProps = {
  headline?: string;
  variant?: "fullscreen" | "overlay";
  /** Larger animation + text for login / full-screen use */
  size?: "default" | "large";
  className?: string;
};

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 align-middle" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function ColdStartLoader({
  headline = "Loading your data",
  variant = "fullscreen",
  size = "default",
  className,
}: ColdStartLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [manual, setManual] = useState(false);
  const [animationSrc, setAnimationSrc] = useState<string | null>(null);

  useEffect(() => {
    void import("@/assets/lottie/revenue.json?url").then((mod) => {
      setAnimationSrc(mod.default);
    });
  }, []);

  const cycleMessage = useCallback(() => {
    setManual(true);
    setMessageIndex((i) => (i + 1) % COLD_START_MESSAGES.length);
  }, []);

  useEffect(() => {
    if (manual) return;
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % COLD_START_MESSAGES.length);
    }, 4500);
    return () => clearInterval(id);
  }, [manual]);

  const body = COLD_START_MESSAGES[messageIndex];
  const isLarge = size === "large" || variant === "fullscreen";

  const panel = (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 px-4 py-6 text-center sm:gap-5 sm:px-6 sm:py-8",
        isLarge ? "max-w-lg" : "max-w-md",
        variant === "overlay" &&
          "rounded-2xl border border-white/25 bg-white/65 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/70",
        className,
      )}
    >
      <button
        type="button"
        onClick={cycleMessage}
        className={cn(
          "group relative mx-auto shrink-0 cursor-pointer overflow-visible transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isLarge ? "h-44 w-44 sm:h-52 sm:w-52" : "h-32 w-32 sm:h-36 sm:w-36"
        )}
        aria-label="Tap to see another loading message"
      >
        <div className="relative h-full w-full overflow-visible">
          {animationSrc ? (
            <Lottie
              src={animationSrc}
              autoplay
              loop
              className="absolute left-1/2 top-1/2 h-[115%] w-[115%] max-w-none -translate-x-1/2 -translate-y-1/2 [&_svg]:!h-full [&_svg]:!w-full"
              rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
            />
          ) : (
            <div className="absolute inset-[10%] animate-pulse rounded-3xl bg-muted" />
          )}
        </div>
      </button>

      <div className="w-full shrink-0 space-y-2">
        <h1 className={cn("font-semibold tracking-tight", isLarge ? "text-xl sm:text-2xl" : "text-lg sm:text-xl")}>
          {headline}
          <LoadingDots />
        </h1>
        <button
          type="button"
          onClick={cycleMessage}
          className="mx-auto block max-w-sm text-sm leading-relaxed text-muted-foreground transition-colors hover:text-foreground sm:text-base"
        >
          {body}
        </button>
      </div>

      <div className="w-full shrink-0 space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
          <div className="h-full w-1/3 animate-[coldstart-slide_1.8s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">{COLD_START_HINT}</p>
      </div>
    </div>
  );

  if (variant === "overlay") {
    return panel;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
      {panel}
    </div>
  );
}
