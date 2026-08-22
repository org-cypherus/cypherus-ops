"use client";

import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/ErrorState";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { paymentStatusLabel } from "@/modules/platform/labels";
import { fetchCompaniesOverview, planPriceNumber } from "@/modules/platform/services";

const cards = [
  {
    href: "/platform/companies",
    title: "Empresas clientes",
    description: "Cadastro, status de acesso e plano de cada tenant",
    icon: <BusinessOutlinedIcon />,
  },
  {
    href: "/platform/plans",
    title: "Planos e preços",
    description: "Essencial, Profissional e Enterprise",
    icon: <CreditCardOutlinedIcon />,
  },
  {
    href: "/platform/billing",
    title: "Pagamentos",
    description: "Assinaturas pagas, pendentes e em trial",
    icon: <PaidOutlinedIcon />,
  },
];

export default function PlatformHomePage() {
  const overview = useQuery({
    queryKey: queryKeys.platform.overview,
    queryFn: fetchCompaniesOverview,
  });

  if (overview.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  }

  const companies = overview.data ?? [];
  const pending = companies.filter((item) => item.subscription?.status === "PAST_DUE").length;
  const paid = companies.filter((item) => item.subscription?.status === "ACTIVE").length;
  const mrr = companies
    .filter((item) => item.subscription?.status === "ACTIVE")
    .reduce((sum, item) => sum + planPriceNumber(item.plan), 0);

  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h4">Console da plataforma</Typography>
        <Typography variant="body2" color="text.secondary">
          Visão Cypher das empresas clientes, acessos, features e cobrança
        </Typography>
      </div>

      <Grid container spacing={2}>
        {[
          { label: "Clientes", value: String(companies.length) },
          { label: "Pagamentos em dia", value: String(paid) },
          { label: "Pendentes", value: String(pending) },
          { label: "MRR ativo", value: formatCurrency(mrr) },
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {cards.map((item) => (
          <Grid key={item.href} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardActionArea component={Link} href={item.href}>
                <CardContent>
                  <Box color="primary.main" mb={1.5}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {pending > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Pendências recentes</Typography>
            <Stack spacing={1} mt={1.5}>
              {companies
                .filter((item) => item.subscription?.status === "PAST_DUE")
                .slice(0, 5)
                .map((item) => (
                  <Box
                    key={item.company.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={2}
                  >
                    <Typography>{item.company.name}</Typography>
                    <Button component={Link} href={`/platform/companies/${item.company.id}`} size="small">
                      {paymentStatusLabel(item.subscription?.status ?? "PAST_DUE")} · ver
                    </Button>
                  </Box>
                ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
