"use client";

import ApiOutlinedIcon from "@mui/icons-material/ApiOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import WebhookOutlinedIcon from "@mui/icons-material/WebhookOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";
import { ENTERPRISE_CAPABILITIES } from "@/lib/billing/enterprise";
import { planLabel } from "@/lib/billing/plan-catalog";
import type { FeatureKey } from "@/lib/billing/types";
import { useFeature } from "@/modules/auth/hooks";

const ICONS: Partial<Record<FeatureKey, ReactNode>> = {
  api: <ApiOutlinedIcon />,
  webhooks: <WebhookOutlinedIcon />,
  customizations: <TuneOutlinedIcon />,
};

function CapabilityCard({
  feature,
  title,
  summary,
  comingSoonDetail,
}: {
  feature: FeatureKey;
  title: string;
  summary: string;
  comingSoonDetail: string;
}) {
  const { enabled } = useFeature(feature);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box color="text.secondary" sx={{ display: "grid", placeItems: "center" }}>
                {ICONS[feature]}
              </Box>
              <Typography variant="h6">{title}</Typography>
            </Stack>
            <Chip
              size="small"
              label={enabled ? "Incluído" : planLabel("ENTERPRISE")}
              color={enabled ? "success" : "default"}
              variant={enabled ? "filled" : "outlined"}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary}
          </Typography>
          {enabled ? (
            <Alert severity="success">{comingSoonDetail}</Alert>
          ) : (
            <Alert
              severity="info"
              action={
                <Button component={Link} href="/#pricing" color="inherit" size="small">
                  Ver planos
                </Button>
              }
            >
              Disponível no plano {planLabel("ENTERPRISE")}.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

type Props = {
  /** Quando true, mostra intro compacta (ex.: bloco na home de admin). */
  compact?: boolean;
};

export function EnterpriseCapabilities({ compact = false }: Props) {
  return (
    <Stack spacing={2}>
      {!compact ? (
        <Box>
          <Typography variant="h5">Recursos Enterprise</Typography>
          <Typography variant="body2" color="text.secondary">
            API, webhooks e personalizações — liberados pelo plano da empresa.
          </Typography>
        </Box>
      ) : (
        <Typography variant="h6">Recursos Enterprise</Typography>
      )}
      <Grid container spacing={2}>
        {ENTERPRISE_CAPABILITIES.map((item) => (
          <Grid key={item.feature} size={{ xs: 12, md: 4 }}>
            <CapabilityCard {...item} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
