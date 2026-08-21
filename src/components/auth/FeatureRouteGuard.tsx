"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { hasFeature, minimumPlanForFeature } from "@/lib/billing/access";
import { planLabel } from "@/lib/billing/plan-catalog";
import { matchAppRoute } from "@/lib/billing/routes";
import { isPlatformPath } from "@/lib/platform/routes";
import type { FeatureKey } from "@/lib/billing/types";
import { useSession } from "@/modules/auth/hooks";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function Shell({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Box
      flex={1}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={6}
    >
      <Stack spacing={2} alignItems="center" textAlign="center" maxWidth={440}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" fontWeight={700}>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
        {action}
      </Stack>
    </Box>
  );
}

export function PlanUpsell({ feature, label }: { feature: FeatureKey; label?: string }) {
  const required = minimumPlanForFeature(feature);
  const requiredLabel = required ? planLabel(required) : "um plano superior";
  const moduleLabel = label ?? "Este módulo";

  return (
    <Shell
      icon={<WorkspacePremiumOutlinedIcon />}
      title={`${moduleLabel} não está no seu plano`}
      description={`Disponível a partir do plano ${requiredLabel}. Faça upgrade da assinatura da empresa para liberar para toda a equipe.`}
      action={
        <Button component={Link} href="/#pricing" variant="contained">
          Ver planos
        </Button>
      }
    />
  );
}

export function PermissionDenied({ label }: { label?: string }) {
  return (
    <Shell
      icon={<LockOutlinedIcon />}
      title="Sem permissão"
      description={
        label
          ? `Seu cargo não tem acesso a ${label}. Peça ao administrador para ajustar as permissões.`
          : "Seu cargo não tem acesso a esta área. Peça ao administrador para ajustar as permissões."
      }
      action={
        <Button component={Link} href="/leads" variant="outlined">
          Voltar ao início
        </Button>
      }
    />
  );
}

/** Guard de rota: upsell se o plano não tem a feature; mensagem de role se só falta permission. */
export function FeatureRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user, isPending, isFetching } = useSession();
  const route = matchAppRoute(pathname);

  // Shell já montou; gates esperam sessão com loading leve só na área de conteúdo.
  if (!user) {
    if (isPending || isFetching) {
      return (
        <Box flex={1} display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    return null;
  }

  if (isPlatformPath(pathname)) {
    if (!user.isPlatformAdmin) {
      return <PermissionDenied label="a visão de plataforma" />;
    }
    return children;
  }

  if (!route) return children;

  if (route.feature && !hasFeature(user.features, route.feature)) {
    return <PlanUpsell feature={route.feature} label={route.label} />;
  }

  if (!user.permissions.includes(route.permission)) {
    return <PermissionDenied label={route.label} />;
  }

  return children;
}
