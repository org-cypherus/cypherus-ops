"use client";

import ViewWeekOutlinedIcon from "@mui/icons-material/ViewWeekOutlined";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { PipelineStage } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  hiddenStages: PipelineStage[];
  onSave: (hidden: PipelineStage[]) => void;
};

export function CustomizeColumnsDialog({ open, onClose, stages, hiddenStages, onSave }: Props) {
  const [draftHidden, setDraftHidden] = useState<Set<PipelineStage>>(() => new Set(hiddenStages));

  useEffect(() => {
    if (open) setDraftHidden(new Set(hiddenStages));
  }, [open, hiddenStages]);

  const visibleCount = stages.filter((stage) => !draftHidden.has(stage)).length;

  function toggle(stage: PipelineStage, checked: boolean) {
    setDraftHidden((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(stage);
      else {
        // Impede ocultar a última coluna.
        if (stages.length - next.size <= 1) return prev;
        next.add(stage);
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Personalizar colunas</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escolha quais estágios aparecem no kanban. Os leads nas colunas ocultas continuam no
          pipeline.
        </Typography>
        <FormGroup>
          {stages.map((stage) => {
            const checked = !draftHidden.has(stage);
            const isLastVisible = checked && visibleCount <= 1;
            return (
              <FormControlLabel
                key={stage}
                control={
                  <Checkbox
                    checked={checked}
                    disabled={isLastVisible}
                    onChange={(_, value) => toggle(stage, value)}
                  />
                }
                label={stage}
              />
            );
          })}
        </FormGroup>
        {visibleCount <= 1 ? (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Pelo menos uma coluna precisa permanecer visível.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSave([...draftHidden]);
            onClose();
          }}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function CustomizeColumnsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outlined" startIcon={<ViewWeekOutlinedIcon />} onClick={onClick}>
      Colunas
    </Button>
  );
}
