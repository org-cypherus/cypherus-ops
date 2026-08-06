"use client";

import {
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Lead } from "../types";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = useMemo(
    () => leads.length > 0 && selected.length === leads.length,
    [leads.length, selected.length],
  );

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allSelected}
                indeterminate={selected.length > 0 && !allSelected}
                onChange={(e) => setSelected(e.target.checked ? leads.map((l) => l.id) : [])}
              />
            </TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Documento</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Responsável</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Criação</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} hover selected={selected.includes(lead.id)}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.includes(lead.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, lead.id] : prev.filter((id) => id !== lead.id),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Typography
                  component={Link}
                  href={`/leads/${lead.id}`}
                  variant="body2"
                  color="primary"
                  sx={{ textDecoration: "none", fontWeight: 600 }}
                >
                  {lead.name}
                </Typography>
              </TableCell>
              <TableCell>{lead.cpf}</TableCell>
              <TableCell>
                <StatusBadge label={lead.status} />
              </TableCell>
              <TableCell>{lead.ownerName}</TableCell>
              <TableCell align="right">{formatCurrency(lead.process.totalValue)}</TableCell>
              <TableCell>{formatDate(lead.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
