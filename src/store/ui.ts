"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  mode: "light" | "dark";
  sidebarOpen: boolean;
  searchOpen: boolean;
  notificationsOpen: boolean;
  /** Quando false, valores monetários dos dashboards ficam mascarados. */
  moneyVisible: boolean;
  toggleMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleMoneyVisible: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      mode: "dark",
      sidebarOpen: false,
      searchOpen: false,
      notificationsOpen: false,
      moneyVisible: false,
      toggleMode: () => set({ mode: get().mode === "light" ? "dark" : "light" }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
      toggleMoneyVisible: () => set({ moneyVisible: !get().moneyVisible }),
    }),
    {
      name: "cypher-ops-ui",
      partialize: (state) => ({ mode: state.mode, moneyVisible: state.moneyVisible }),
    },
  ),
);
