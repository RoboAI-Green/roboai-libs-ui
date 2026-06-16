import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  showLineMarkers: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  setShowLineMarkers: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      showLineMarkers: true,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setShowLineMarkers: (v) => set({ showLineMarkers: v }),
    }),
    { name: "roboai-ui-prefs" },
  ),
);
