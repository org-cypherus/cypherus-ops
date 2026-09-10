"use client";

import { Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import { CurrencyField } from "@/components/inputs/CurrencyField";
import { IntegerField } from "@/components/inputs/IntegerField";
import type { CustomFieldDefinition } from "../types";

type Props = {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  size?: "small" | "medium";
};

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function CustomFieldRenderer({
  definition,
  value,
  onChange,
  error,
  disabled,
  size = "medium",
}: Props) {
  const label = definition.required ? `${definition.label} *` : definition.label;
  const helper = error;

  switch (definition.type) {
    case "text":
      return (
        <TextField
          label={label}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          error={Boolean(error)}
          helperText={helper}
          disabled={disabled}
          size={size}
          fullWidth
        />
      );
    case "number":
      return (
        <IntegerField
          label={label}
          value={asNumber(value)}
          onChange={onChange}
          error={Boolean(error)}
          helperText={helper}
          disabled={disabled}
          size={size}
          fullWidth
        />
      );
    case "money":
      return (
        <CurrencyField
          label={label}
          value={asNumber(value)}
          onChange={onChange}
          error={Boolean(error)}
          helperText={helper}
          disabled={disabled}
          size={size}
          fullWidth
        />
      );
    case "date":
      return (
        <TextField
          type="date"
          label={label}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          error={Boolean(error)}
          helperText={helper}
          disabled={disabled}
          size={size}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      );
    case "bool":
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value)}
              onChange={(_, checked) => onChange(checked)}
              disabled={disabled}
            />
          }
          label={label}
        />
      );
    case "select":
      return (
        <TextField
          select
          label={label}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          error={Boolean(error)}
          helperText={helper}
          disabled={disabled}
          size={size}
          fullWidth
        >
          <MenuItem value="">
            <em>Selecione</em>
          </MenuItem>
          {definition.options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );
  }
}
