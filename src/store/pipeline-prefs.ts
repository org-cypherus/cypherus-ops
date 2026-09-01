"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PipelineStage } from "@/modules/leads/types";

type PipelinePrefsState = {
  /** Estágios ocultos por empresa (nome UI da coluna). Vazio = todas visíveis. */
  hiddenStagesByCompany: Record<string, PipelineStage[]>;
  getHiddenStages: (companyId: string) => PipelineStage[];
  setHiddenStages: (companyId: string, stages: PipelineStage[]) => void;
  toggleStageHidden: (companyId: string, stage: PipelineStage, hidden: boolean) => void;
};

export const usePipelinePrefsStore = create<PipelinePrefsState>()(
  persist(
    (set, get) => ({
      hiddenStagesByCompany: {},
      getHiddenStages: (companyId) => get().hiddenStagesByCompany[companyId] ?? [],
      setHiddenStages: (companyId, stages) =>
        set((state) => ({
          hiddenStagesByCompany: {
            ...state.hiddenStagesByCompany,
            [companyId]: stages,
          },
        })),
      toggleStageHidden: (companyId, stage, hidden) => {
        const current = new Set(get().getHiddenStages(companyId));
        if (hidden) current.add(stage);
        else current.delete(stage);
        get().setHiddenStages(companyId, [...current]);
      },
    }),
    {
      name: "cypher-ops-pipeline-prefs",
      skipHydration: true,
      partialize: (state) => ({ hiddenStagesByCompany: state.hiddenStagesByCompany }),
    },
  ),
);
