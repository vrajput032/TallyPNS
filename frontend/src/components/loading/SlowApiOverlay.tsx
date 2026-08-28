import { ColdStartLoader } from "@/components/loading/ColdStartLoader";
import { useColdStartStore } from "@/store/coldStartStore";

/** Lottie overlay — only when Render server is waking from sleep, not every API call. */
export function SlowApiOverlay() {
  const visible = useColdStartStore((s) => s.visible);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-md sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="my-auto w-full max-w-md">
        <ColdStartLoader variant="overlay" />
      </div>
    </div>
  );
}
