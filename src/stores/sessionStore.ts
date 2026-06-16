import { create } from "zustand";

export interface WavelengthGrid {
  wavelengths_nm: number[];
  meta: {
    filename: string;
    point_count: number;
    range_min_nm: number;
    range_max_nm: number;
    step_min_nm: number;
    step_max_nm: number;
    step_median_nm: number;
  };
}

interface SessionState {
  wavelengthGrid: WavelengthGrid | null;
  setWavelengthGrid: (g: WavelengthGrid | null) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  wavelengthGrid: null,
  setWavelengthGrid: (g) => set({ wavelengthGrid: g }),
}));
