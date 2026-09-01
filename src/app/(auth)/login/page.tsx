"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link as MuiLink,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/components/auth/AuthShell";
import { getApiError } from "@/lib/api/client";
import { isMockMode } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/session";
import {
  homePathForSession,
  useAcceptInvitation,
  useLogin,
  useSession,
} from "@/modules/auth/hooks";
import {
  acceptInvitationSchema,
  loginSchema,
  type AcceptInvitationFormValues,
  type LoginFormValues,
} from "@/modules/auth/schemas";

type AuthMode = "login" | "invite";

function LoginFallback() {
  return (
    <Card sx={{ width: "100%", maxWidth: 420 }} elevation={0} variant="outlined">
      <CardContent sx={{ p: 4 }}>
        <Typography>Carregando…</Typography>
      </CardContent>
    </Card>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("token") || searchParams.get("invite") || "";
  const [mode, setMode] = useState<AuthMode>(inviteFromUrl ? "invite" : "login");

  const hasMockToken = isMockMode() && typeof window !== "undefined" && Boolean(getAccessToken());
  const session = useSession();
  const login = useLogin();
  const acceptInvite = useAcceptInvitation();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const inviteForm = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token: inviteFromUrl,
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (inviteFromUrl) {
      setMode("invite");
      inviteForm.setValue("token", inviteFromUrl);
    }
  }, [inviteFromUrl, inviteForm]);

  useEffect(() => {
    if ((hasMockToken || session.isSuccess) && session.data) {
      router.replace(homePathForSession(session.data));
    }
  }, [hasMockToken, session.isSuccess, session.data, router]);

  const activeError =
    mode === "login"
      ? login.isError
        ? getApiError(login.error)
        : null
      : acceptInvite.isError
        ? getApiError(acceptInvite.error)
        : null;

  const pending = mode === "login" ? login.isPending : acceptInvite.isPending;

  return (
    <Card sx={{ width: "100%", maxWidth: 420 }} elevation={0} variant="outlined">
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box textAlign="center">
            <Typography
              component={NextLink}
              href="/"
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.03em",
                textDecoration: "none",
                color: "primary.main",
                display: "inline-block",
              }}
            >
              Cypher Ops
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Autenticação do sistema
            </Typography>
          </Box>

          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode}
            onChange={(_, value: AuthMode | null) => {
              if (value) setMode(value);
            }}
          >
            <ToggleButton value="login">Entrar</ToggleButton>
            <ToggleButton value="invite">Primeiro acesso</ToggleButton>
          </ToggleButtonGroup>

          {activeError ? (
            <Alert severity="error">
              {activeError.code === "ACCOUNT_LOCKED"
                ? "Conta bloqueada temporariamente. Tente novamente mais tarde."
                : activeError.message ||
                  (mode === "invite"
                    ? "Convite inválido, expirado ou já utilizado."
                    : "Credenciais inválidas ou usuário inativo.")}
            </Alert>
          ) : null}

          {mode === "login" ? (
            <Stack
              spacing={2}
              component="form"
              onSubmit={loginForm.handleSubmit((values) => login.mutate(values))}
            >
              <TextField
                label="E-mail corporativo"
                type="email"
                fullWidth
                autoComplete="email"
                error={Boolean(loginForm.formState.errors.email)}
                helperText={loginForm.formState.errors.email?.message}
                {...loginForm.register("email")}
              />
              <TextField
                label="Senha"
                type="password"
                fullWidth
                autoComplete="current-password"
                error={Boolean(loginForm.formState.errors.password)}
                helperText={loginForm.formState.errors.password?.message}
                {...loginForm.register("password")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={pending}
                startIcon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                Acessar sistema
              </Button>
            </Stack>
          ) : (
            <Stack
              spacing={2}
              component="form"
              onSubmit={inviteForm.handleSubmit((values) => acceptInvite.mutate(values))}
            >
              <Alert severity="info">
                Cole o token de convite recebido e defina sua senha para ativar a conta.
              </Alert>
              <TextField
                label="Token de convite"
                fullWidth
                autoComplete="off"
                error={Boolean(inviteForm.formState.errors.token)}
                helperText={inviteForm.formState.errors.token?.message}
                {...inviteForm.register("token")}
              />
              <TextField
                label="Nova senha"
                type="password"
                fullWidth
                autoComplete="new-password"
                error={Boolean(inviteForm.formState.errors.password)}
                helperText={inviteForm.formState.errors.password?.message}
                {...inviteForm.register("password")}
              />
              <TextField
                label="Confirmar senha"
                type="password"
                fullWidth
                autoComplete="new-password"
                error={Boolean(inviteForm.formState.errors.confirmPassword)}
                helperText={inviteForm.formState.errors.confirmPassword?.message}
                {...inviteForm.register("confirmPassword")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={pending}
                startIcon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                Validar convite e entrar
              </Button>
            </Stack>
          )}

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Não tem conta?{" "}
            <MuiLink component={NextLink} href="/signup" underline="hover">
              Criar conta
            </MuiLink>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
