"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";
import { EnterpriseCapabilities } from "@/modules/admin/components/EnterpriseCapabilities";
import { useFeature } from "@/modules/auth/hooks";

function PlaceholderPanel({
  title,
  description,
  enabled,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          {description}
        </Typography>
        <Box sx={{ opacity: enabled ? 1 : 0.55, pointerEvents: enabled ? "auto" : "none" }}>
          {children}
        </Box>
        {!enabled ? (
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Desbloqueie no plano Enterprise para configurar.
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Interface de configuração em breve — a flag do plano já está ativa.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function EnterpriseAdminPage() {
  const api = useFeature("api").enabled;
  const webhooks = useFeature("webhooks").enabled;
  const customizations = useFeature("customizations").enabled;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Enterprise</Typography>
          <Typography variant="body2" color="text.secondary">
            Integrações e personalizações do plano da empresa
          </Typography>
        </Box>
        <Button component={Link} href="/admin" variant="outlined">
          Voltar à administração
        </Button>
      </Stack>

      <EnterpriseCapabilities />

      <PlaceholderPanel
        title="Chaves de API"
        description="Gere tokens para integrar CRM, contratos e financeiro."
        enabled={api}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Nome da chave"
            placeholder="Integração ERP"
            disabled={!api}
            fullWidth
          />
          <Button variant="contained" disabled>
            Gerar chave
          </Button>
        </Stack>
      </PlaceholderPanel>

      <PlaceholderPanel
        title="Webhooks"
        description="Endpoints que recebem eventos do Cypher Ops."
        enabled={webhooks}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="URL do endpoint"
            placeholder="https://api.suaempresa.com/hooks/cypher"
            disabled={!webhooks}
            fullWidth
          />
          <Button variant="contained" disabled>
            Adicionar
          </Button>
        </Stack>
      </PlaceholderPanel>

      <PlaceholderPanel
        title="Personalizações"
        description="Branding e campos extras para a operação."
        enabled={customizations}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Nome exibido"
            placeholder="Cypher Ops — sua marca"
            disabled={!customizations}
            fullWidth
          />
          <Button variant="contained" disabled>
            Salvar
          </Button>
        </Stack>
      </PlaceholderPanel>
    </Stack>
  );
}
