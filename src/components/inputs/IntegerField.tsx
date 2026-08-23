"use client";

import { TextField, type TextFieldProps } from "@mui/material";
import { formatIntegerInput, parseIntegerInput } from "@/lib/utils/money-input";

type Props = Omit<TextFieldProps, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
};

export function IntegerField({ value, onChange, ...props }: Props) {
  return (
    <TextField
      {...props}
      type="text"
      inputMode="numeric"
      value={formatIntegerInput(value)}
      onChange={(event) => onChange(parseIntegerInput(event.target.value))}
    />
  );
}
