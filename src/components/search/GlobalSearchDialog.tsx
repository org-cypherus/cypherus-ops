"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useFeature } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";

export function GlobalSearchDialog() {
  const open = useUIStore((s) => s.searchOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const [q, setQ] = useState("");
  const router = useRouter();
  const contractsEnabled = useFeature("contracts").enabled;

  const { data } = useQuery({
    queryKey: queryKeys.search(q),
    queryFn: async () => {
      const { data } = await api.get<{
        leads: Array<{ id: string; name: string; cpf: string }>;
        contracts: Array<{ id: string; leadName: string }>;
      }>("/search", { params: { q } });
      return data;
    },
    enabled: open && q.length >= 2,
  });

  const contracts = contractsEnabled ? data?.contracts : [];
  const hasLeads = Boolean(data?.leads?.length);
  const hasContracts = Boolean(contracts?.length);

  return (
    <Dialog open={open} onClose={() => setSearchOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Pesquisa global</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder={
            contractsEnabled
              ? "Nome, CPF, telefone, e-mail ou contrato"
              : "Nome, CPF, telefone ou e-mail"
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2 }}
        />
        {hasLeads ? (
          <>
            <Typography variant="overline" color="text.secondary">
              Leads
            </Typography>
            <List dense>
              {data!.leads.map((lead) => (
                <ListItemButton
                  key={lead.id}
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/leads/${lead.id}`);
                  }}
                >
                  <ListItemText primary={lead.name} secondary={lead.cpf} />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : null}
        {hasContracts ? (
          <>
            <Typography variant="overline" color="text.secondary">
              Contratos
            </Typography>
            <List dense>
              {contracts!.map((contract) => (
                <ListItemButton
                  key={contract.id}
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/contracts/${contract.id}`);
                  }}
                >
                  <ListItemText primary={contract.leadName} secondary={contract.id} />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : null}
        {q.length >= 2 && !hasLeads && !hasContracts ? (
          <Typography color="text.secondary">Nenhum resultado.</Typography>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
