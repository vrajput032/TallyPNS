import { create } from "zustand";

export type MobileHeaderOverride = {
  title: string;
  subtitle?: string;
};

type MobileHeaderState = {
  override: MobileHeaderOverride | null;
  setOverride: (override: MobileHeaderOverride) => void;
  clearOverride: () => void;
};

export const useMobileHeaderStore = create<MobileHeaderState>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
  clearOverride: () => set({ override: null }),
}));
