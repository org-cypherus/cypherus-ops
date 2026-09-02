"use client";

import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ViewKanbanRoundedIcon from "@mui/icons-material/ViewKanbanRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { hydrateComparisonRows } from "@/modules/billing/plan-catalog";
import { usePlanCatalog } from "@/modules/billing/use-plan-catalog";
import {
  addons,
  features,
  hero,
  landingColors,
  proofPoints,
  type ComparisonValue,
  type Plan,
} from "../content";
import { LandingHeader } from "./LandingHeader";

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "string") {
    return (
      <Typography variant="body2" fontWeight={700} color={landingColors.text} component="span">
        {value}
      </Typography>
    );
  }

  if (value) {
    return (
      <>
        <CheckCircleRoundedIcon aria-hidden sx={{ fontSize: 20, color: landingColors.primary, display: "block" }} />
        <Box component="span" sx={visuallyHidden}>
          Incluído
        </Box>
      </>
    );
  }

  return (
    <>
      <CloseRoundedIcon aria-hidden sx={{ fontSize: 20, color: "rgba(188,201,205,0.35)", display: "block" }} />
      <Box component="span" sx={visuallyHidden}>
        Não incluído
      </Box>
    </>
  );
}

const featureIcons: Record<(typeof features)[number]["icon"], ReactNode> = {
  view_kanban: <ViewKanbanRoundedIcon aria-hidden />,
  calendar_month: <CalendarMonthRoundedIcon aria-hidden />,
  description: <DescriptionRoundedIcon aria-hidden />,
  dashboard: <DashboardRoundedIcon aria-hidden />,
  payments: <PaymentsRoundedIcon aria-hidden />,
  admin_panel_settings: <ShieldRoundedIcon aria-hidden />,
  file_download: <DownloadRoundedIcon aria-hidden />,
};

function PlanCard({ plan }: { plan: Plan }) {
  const headingId = `plan-${plan.id}-title`;

  return (
    <Box
      component="article"
      aria-labelledby={headingId}
      sx={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: { xs: 3, md: 3.5 },
        borderRadius: 3,
        bgcolor: plan.highlight ? landingColors.surfaceHigh : landingColors.surface,
        border: plan.highlight ? `2px solid ${landingColors.primary}` : `1px solid ${landingColors.border}`,
        boxShadow: plan.highlight ? "0 0 30px rgba(6,182,212,0.15)" : "none",
        mt: { md: plan.highlight ? 0 : 1 },
        mb: { md: plan.highlight ? 1 : 0 },
      }}
    >
      {plan.badge ? (
        <Chip
          label={plan.badge}
          size="small"
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: landingColors.primary,
            color: landingColors.bg,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        />
      ) : null}

      <Typography id={headingId} component="h3" variant="h5" fontWeight={700} color={landingColors.text} mb={1}>
        {plan.name}
      </Typography>
      <Stack mb={3} spacing={0.25}>
        {plan.pricePrefix ? (
          <Typography component="p" variant="caption" color={landingColors.muted} sx={{ m: 0, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 }}>
            {plan.pricePrefix}
          </Typography>
        ) : null}
        <Typography
          component="p"
          aria-label={plan.pricePrefix ? `${plan.pricePrefix} ${plan.price} por mês` : `${plan.price} por mês`}
          sx={{ fontSize: { xs: "2rem", md: "2.4rem" }, fontWeight: 800, color: landingColors.text, m: 0, lineHeight: 1.15 }}
        >
          {plan.price}
          <Typography component="span" color={landingColors.muted} sx={{ fontSize: "1rem", fontWeight: 400, ml: 0.5 }}>
            {plan.priceNote}
          </Typography>
        </Typography>
      </Stack>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
        {plan.features.map((item) => (
          <Box key={item} component="li" sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
            <CheckCircleRoundedIcon aria-hidden sx={{ fontSize: 18, color: landingColors.primary, mt: "2px" }} />
            <Typography variant="body2" color={plan.highlight ? landingColors.text : landingColors.muted}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>

      <Button
        component={plan.cta.href.startsWith("mailto:") ? "a" : NextLink}
        href={plan.cta.href}
        fullWidth
        variant={plan.cta.variant === "solid" ? "contained" : "outlined"}
        sx={{
          mt: "auto",
          ...(plan.cta.variant === "solid"
            ? {
                bgcolor: landingColors.primarySolid,
                color: landingColors.bg,
                fontWeight: 700,
                py: 1.25,
                "&:hover": { bgcolor: landingColors.primary },
              }
            : {
                borderColor: landingColors.primary,
                color: landingColors.primary,
                fontWeight: 700,
                py: 1.25,
                "&:hover": { borderColor: landingColors.primary, bgcolor: "rgba(76,215,246,0.06)" },
              }),
        }}
      >
        {plan.cta.label}
      </Button>
    </Box>
  );
}

export function LandingPage() {
  const { plans: catalogPlans, limits, isLoading: plansLoading, isError: plansError } = usePlanCatalog();
  const comparison = hydrateComparisonRows(limits);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: landingColors.bg,
        color: landingColors.text,
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        backgroundAttachment: "local",
      }}
    >
      <LandingHeader />

      <Box component="main" id="conteudo-principal" tabIndex={-1} sx={{ flex: "1 1 auto" }}>
        <Box component="section" aria-labelledby="hero-heading">
          <Container maxWidth="lg" sx={{ pt: { xs: 14, md: 18 }, pb: { xs: 8, md: 12 } }}>
            <Stack alignItems="center" textAlign="center" spacing={3} maxWidth={880} mx="auto">
              <Chip
                icon={<BoltRoundedIcon sx={{ color: `${landingColors.primary} !important`, fontSize: 16 }} aria-hidden />}
                label={hero.badge}
                sx={{
                  bgcolor: landingColors.surfaceBright,
                  color: landingColors.primary,
                  border: `1px solid ${landingColors.border}`,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              />
              <Typography
                id="hero-heading"
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "2.5rem", md: "4rem" },
                  lineHeight: { xs: 1.15, md: 1.1 },
                  color: landingColors.text,
                }}
              >
                {hero.titleLead}{" "}
                <Box component="span" sx={{ color: landingColors.primary }}>
                  {hero.titleAccent}
                </Box>
              </Typography>
              <Typography
                component="p"
                sx={{
                  color: landingColors.muted,
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  lineHeight: 1.6,
                  maxWidth: 680,
                }}
              >
                {hero.subtitle}
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                pt={1}
                width={{ xs: "100%", sm: "auto" }}
                role="group"
                aria-label="Ações principais"
              >
                <Button
                  component={NextLink}
                  href={hero.primaryCta.href}
                  size="large"
                  sx={{
                    bgcolor: landingColors.primarySolid,
                    color: landingColors.bg,
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    boxShadow: "0 0 15px rgba(6,182,212,0.3)",
                    "&:hover": { bgcolor: landingColors.primary },
                  }}
                >
                  {hero.primaryCta.label}
                </Button>
                <Button
                  component="a"
                  href={hero.secondaryCta.href}
                  size="large"
                  variant="outlined"
                  sx={{
                    borderColor: landingColors.primary,
                    color: landingColors.primary,
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    "&:hover": { borderColor: landingColors.primary, bgcolor: "rgba(76,215,246,0.06)" },
                  }}
                >
                  {hero.secondaryCta.label}
                </Button>
              </Stack>
            </Stack>

            <Box
              aria-hidden
              sx={{
                mt: { xs: 6, md: 10 },
                p: 1,
                borderRadius: 3,
                border: `1px solid ${landingColors.border}`,
                bgcolor: landingColors.surfaceBright,
                boxShadow: "0 0 20px rgba(6,182,212,0.1)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  borderRadius: 2,
                  minHeight: { xs: 180, md: 280 },
                  bgcolor: landingColors.bg,
                  background: `
                    radial-gradient(ellipse at 30% 40%, rgba(6,182,212,0.18), transparent 50%),
                    radial-gradient(ellipse at 70% 60%, rgba(104,97,242,0.12), transparent 45%),
                    ${landingColors.bg}
                  `,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
                  gap: 1.5,
                  p: { xs: 2, md: 3 },
                }}
              >
                {["Pipeline", "Agenda", "Contratos", "Financeiro"].map((label) => (
                  <Box
                    key={label}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${landingColors.border}`,
                      bgcolor: "rgba(17,28,45,0.85)",
                      p: 2,
                      minHeight: { xs: 72, md: 120 },
                    }}
                  >
                    <Typography variant="caption" color={landingColors.primary} fontWeight={700}>
                      {label}
                    </Typography>
                    <Box sx={{ mt: 1.5, height: 8, width: "70%", bgcolor: "rgba(76,215,246,0.25)", borderRadius: 1 }} />
                    <Box sx={{ mt: 1, height: 8, width: "45%", bgcolor: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
                    <Box sx={{ mt: 1, height: 8, width: "55%", bgcolor: "rgba(255,255,255,0.06)", borderRadius: 1 }} />
                  </Box>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        <Box
          component="section"
          aria-labelledby="proof-heading"
          sx={{
            py: 6,
            borderTop: `1px solid ${landingColors.border}`,
            borderBottom: `1px solid ${landingColors.border}`,
            bgcolor: landingColors.surface,
          }}
        >
          <Container maxWidth="lg">
            <Typography id="proof-heading" component="h2" textAlign="center" fontWeight={700} mb={4} color={landingColors.text}>
              Operação comercial completa
            </Typography>
            <Box
              component="ul"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 4,
                textAlign: "center",
                listStyle: "none",
                m: 0,
                p: 0,
              }}
            >
              {proofPoints.map((point) => (
                <Box component="li" key={point.label}>
                  <Typography
                    component="p"
                    sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" }, fontWeight: 800, color: landingColors.primary, m: 0 }}
                  >
                    {point.value}
                  </Typography>
                  <Typography
                    component="p"
                    sx={{
                      color: landingColors.muted,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontSize: 12,
                      m: 0,
                    }}
                  >
                    {point.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        <Box component="section" id="features" aria-labelledby="features-heading" sx={{ scrollMarginTop: 96 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <Stack textAlign="center" spacing={1.5} mb={6} maxWidth={640} mx="auto">
              <Typography
                id="features-heading"
                component="h2"
                sx={{ fontSize: { xs: "1.75rem", md: "3rem" }, fontWeight: 700, color: landingColors.text }}
              >
                Módulos da plataforma
              </Typography>
              <Typography component="p" color={landingColors.muted}>
                Do lead ao financeiro — com administração e relatórios para acompanhar a operação.
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                gap: 2.5,
              }}
            >
              {features.map((feature) => (
                <Box
                  key={feature.title}
                  component="article"
                  sx={{
                    p: 3.5,
                    borderRadius: 3,
                    bgcolor: landingColors.surfaceBright,
                    border: `1px solid ${landingColors.border}`,
                    transition: "background-color 0.2s ease",
                    "&:hover": { bgcolor: landingColors.surfaceHigh },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: landingColors.bg,
                      border: `1px solid ${landingColors.border}`,
                      color: landingColors.primary,
                      mb: 2.5,
                    }}
                  >
                    {featureIcons[feature.icon]}
                  </Box>
                  <Typography component="h3" variant="h6" fontWeight={700} color={landingColors.text} mb={1}>
                    {feature.title}
                  </Typography>
                  <Typography component="p" variant="body2" color={landingColors.muted} lineHeight={1.6}>
                    {feature.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        <Box component="section" id="pricing" aria-labelledby="pricing-heading" sx={{ scrollMarginTop: 96 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
            <Stack textAlign="center" spacing={1.5} mb={8} maxWidth={640} mx="auto">
              <Typography
                id="pricing-heading"
                component="h2"
                sx={{ fontSize: { xs: "1.75rem", md: "3rem" }, fontWeight: 700, color: landingColors.text }}
              >
                Planos
              </Typography>
              <Typography component="p" color={landingColors.muted}>
                Escolha o nível de operação: do CRM essencial à plataforma completa com integrações.
              </Typography>
            </Stack>

            {plansLoading ? (
              <Stack alignItems="center" py={8} spacing={2}>
                <CircularProgress aria-label="Carregando planos" />
                <Typography color={landingColors.muted} variant="body2">
                  Carregando preços do catálogo…
                </Typography>
              </Stack>
            ) : plansError || catalogPlans.every((plan) => !plan.price) ? (
              <Alert severity="error">
                Não foi possível carregar os planos. Atualize a página ou tente novamente em instantes.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                  gap: 3,
                  alignItems: "stretch",
                  pt: 1.5,
                }}
              >
                {catalogPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </Box>
            )}

            <Box id="addons" aria-labelledby="addons-heading" sx={{ mt: { xs: 8, md: 10 } }}>
              <Stack textAlign="center" spacing={1.5} mb={4} maxWidth={640} mx="auto">
                <Typography
                  id="addons-heading"
                  component="h3"
                  sx={{ fontSize: { xs: "1.35rem", md: "1.75rem" }, fontWeight: 700, color: landingColors.text }}
                >
                  Add-ons
                </Typography>
                <Typography component="p" color={landingColors.muted} variant="body2">
                  WhatsApp e API já entram no Enterprise. Nos demais planos, são contratados à parte. Customização entra só sob proposta.
                </Typography>
              </Stack>
              <Box
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${landingColors.border}`,
                  bgcolor: landingColors.surface,
                  overflow: "hidden",
                }}
              >
                <Table
                  size="small"
                  aria-labelledby="addons-heading"
                  sx={{
                    width: "100%",
                    "& .MuiTableCell-root": { borderColor: landingColors.border },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        scope="col"
                        sx={{ color: landingColors.muted, fontWeight: 700, bgcolor: landingColors.surfaceHigh }}
                      >
                        Item
                      </TableCell>
                      <TableCell
                        scope="col"
                        sx={{ color: landingColors.muted, fontWeight: 700, bgcolor: landingColors.surfaceHigh }}
                      >
                        Preço
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {addons.map((addon) => (
                      <TableRow key={addon.item} hover>
                        <TableCell component="th" scope="row" sx={{ color: landingColors.text, fontWeight: 500 }}>
                          {addon.item}
                        </TableCell>
                        <TableCell sx={{ color: landingColors.muted }}>{addon.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" id="compare" aria-labelledby="compare-heading" sx={{ scrollMarginTop: 96 }}>
          <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
            <Stack textAlign="center" spacing={1.5} mb={4} maxWidth={640} mx="auto">
              <Typography
                id="compare-heading"
                component="h2"
                sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700, color: landingColors.text }}
              >
                Comparativo de funcionalidades
              </Typography>
              <Typography component="p" color={landingColors.muted} variant="body2">
                Esboço inicial dos recursos por tier — sujeito a ajustes conforme a evolução do produto.
              </Typography>
            </Stack>

            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${landingColors.border}`,
                bgcolor: landingColors.surface,
                overflow: "hidden",
              }}
            >
              <Table
                size="small"
                aria-labelledby="compare-heading"
                sx={{
                  tableLayout: "fixed",
                  width: "100%",
                  "& .MuiTableCell-root": {
                    borderColor: landingColors.border,
                  },
                }}
              >
                <caption style={{ captionSide: "bottom", padding: "12px", color: landingColors.muted }}>
                  Inclusão de funcionalidades por plano comercial.
                </caption>
                <TableHead>
                  <TableRow>
                    <TableCell
                      scope="col"
                      sx={{
                        width: "40%",
                        color: landingColors.muted,
                        fontWeight: 700,
                        bgcolor: landingColors.surfaceHigh,
                      }}
                    >
                      Funcionalidade
                    </TableCell>
                    {(["Essencial", "Profissional", "Enterprise"] as const).map((col) => (
                      <TableCell
                        key={col}
                        scope="col"
                        align="center"
                        sx={{
                          width: "20%",
                          color: landingColors.muted,
                          fontWeight: 700,
                          bgcolor: landingColors.surfaceHigh,
                          textAlign: "center",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparison.map((row) => (
                    <TableRow key={row.feature} hover>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ color: landingColors.text, fontWeight: 500 }}
                      >
                        {row.feature}
                      </TableCell>
                      {(["essencial", "profissional", "enterprise"] as const).map((key) => (
                        <TableCell
                          key={key}
                          align="center"
                          sx={{
                            textAlign: "center",
                            verticalAlign: "middle",
                            p: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                            }}
                          >
                            <ComparisonCell value={row[key]} />
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Container>
        </Box>
      </Box>

      <Box
        component="footer"
        sx={{
          mt: "auto",
          flexShrink: 0,
          borderTop: `1px solid ${landingColors.border}`,
          bgcolor: landingColors.bg,
          py: { xs: 5, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={3}
          >
            <Box>
              <Typography fontWeight={800} color={landingColors.primary} mb={1}>
                Cypher Ops
              </Typography>
              <Typography component="p" variant="body2" color={landingColors.muted}>
                © {new Date().getFullYear()} Cypher Ops. Todos os direitos reservados.
              </Typography>
            </Box>
            <Box component="nav" aria-label="Rodapé">
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                <Box component="li">
                  <Button component={NextLink} href="/login" sx={{ color: landingColors.muted, minWidth: 0, p: 0 }}>
                    Entrar
                  </Button>
                </Box>
                <Box component="li">
                  <Button component={NextLink} href="/signup" sx={{ color: landingColors.muted, minWidth: 0, p: 0 }}>
                    Criar conta
                  </Button>
                </Box>
                <Box component="li">
                  <Button
                    component="a"
                    href="mailto:comercial@cypherops.com.br"
                    sx={{ color: landingColors.muted, minWidth: 0, p: 0 }}
                  >
                    Contato
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
