"use client";

import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { Box, CircularProgress } from "@mui/material";
import { AccessDeniedState } from "@/components/feedback/AccessDeniedState";
import { hasFeature, minimumPlanForFeature } from "@/lib/billing/access";
import { planLabel } from "@/lib/billing/plan-catalog";
import { canSeeAppRoute, matchAppRoute } from "@/lib/billing/routes";
import { isPlatformPath } from "@/lib/platform/routes";
import type { FeatureKey } from "@/lib/billing/types";
import { useSession } from "@/modules/auth/hooks";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PlanUpsell({ feature, label }: { feature: FeatureKey; label?: string }) {
  const required = minimumPlanForFeature(feature);
  const requiredLabel = required ? planLabel(required) : "um plano superior";
  const moduleLabel = label ?? "Este módulo";

  return (
    <AccessDeniedState
      icon={<WorkspacePremiumOutlinedIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />}
      title={`${moduleLabel} não está no seu plano`}
      description={`Disponível a partir do plano ${requiredLabel}. Faça upgrade da assinatura da empresa para liberar para toda a equipe.`}
      actionLabel="Ver planos"
      actionHref="/#pricing"
      actionVariant="contained"
    />
  );
}

export function PermissionDenied({ label }: { label?: string }) {
  return (
    <AccessDeniedState
      title="Acesso restrito"
      description={
        label
          ? `Seu cargo não tem acesso a ${label}. Peça ao administrador para ajustar as permissões.`
          : "Seu cargo não tem acesso a esta área. Peça ao administrador para ajustar as permissões."
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
        <Box flex={1} minHeight={0} display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    return null;
  }

  let content: ReactNode = children;

  if (isPlatformPath(pathname)) {
    content = user.isPlatformAdmin ? children : <PermissionDenied label="a visão de plataforma" />;
  } else if (route) {
    if (route.feature && !hasFeature(user.features, route.feature)) {
      content = <PlanUpsell feature={route.feature} label={route.label} />;
    } else if (!canSeeAppRoute(user, route)) {
      content = <PermissionDenied label={route.label} />;
    }
  }

  return (
    <Box flex={1} minHeight={0} display="flex" flexDirection="column">
      {content}
    </Box>
  );
}
