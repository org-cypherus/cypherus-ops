"use client";

import { Chip } from "@mui/material";

const colorMap: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"> = {
  "Novo Lead": "info",
  "Contato realizado": "primary",
  "Em negociação": "warning",
  "Contrato enviado": "secondary",
  "Contrato assinado": "success",
  "Pagamento confirmado": "success",
  Concluído: "success",
  Rascunho: "default",
  Enviado: "info",
  Assinado: "success",
  Arquivado: "default",
  Recebido: "success",
  Pendente: "warning",
  Inadimplente: "error",
  Ativo: "success",
  Inativo: "default",
  alta: "error",
  media: "warning",
  baixa: "default",
};

type Props = {
  label: string;
  size?: "small" | "medium";
};

export function StatusBadge({ label, size = "small" }: Props) {
  return <Chip size={size} label={label} color={colorMap[label] || "default"} variant="filled" />;
}
