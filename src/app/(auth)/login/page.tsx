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
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/components/auth/AuthShell";
import { getApiError } from "@/lib/api/client";
import { isMockMode } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/session";
import { homePathForSession, useLogin, useSession } from "@/modules/auth/hooks";
import { loginSchema, type LoginFormValues } from "@/modules/auth/schemas";

export default function LoginPage() {
  const router = useRouter();
  const hasMockToken = isMockMode() && typeof window !== "undefined" && Boolean(getAccessToken());
  const session = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if ((hasMockToken || session.isSuccess) && session.data) {
      router.replace(homePathForSession(session.data));
    }
  }, [hasMockToken, session.isSuccess, session.data, router]);

  const loginError = login.isError ? getApiError(login.error) : null;

  return (
    <AuthShell>
      <Card sx={{ width: "100%", maxWidth: 420 }} elevation={0} variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit((values) => login.mutate(values))}>
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

            {loginError ? (
              <Alert severity="error">
                {loginError.code === "ACCOUNT_LOCKED"
                  ? "Conta bloqueada temporariamente. Tente novamente mais tarde."
                  : loginError.message || "Credenciais inválidas ou usuário inativo."}
              </Alert>
            ) : null}

            <TextField
              label="E-mail corporativo"
              type="email"
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Senha"
              type="password"
              fullWidth
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              {...register("password")}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={login.isPending}
              startIcon={login.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              Acessar sistema
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Não tem conta?{" "}
              <MuiLink component={NextLink} href="/signup" underline="hover">
                Criar conta
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
