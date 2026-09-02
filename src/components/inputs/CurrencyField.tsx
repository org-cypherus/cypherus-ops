"use client";

import { InputAdornment, TextField, type TextFieldProps } from "@mui/material";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/money-input";

type Props = Omit<TextFieldProps, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
};

export function CurrencyField({ value, onChange, InputProps, ...props }: Props) {
  return (
    <TextField
      {...props}
      type="text"
      inputMode="numeric"
      value={formatCurrencyInput(value)}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
      InputProps={{
        ...InputProps,
        startAdornment: InputProps?.startAdornment ?? (
          <InputAdornment position="start">R$</InputAdornment>
        ),
      }}
    />
  );
}
