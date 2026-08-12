"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { getAccessToken } from "@/lib/auth/session";
import { DEMO_ACCOUNTS } from "@/mocks/data";
import { homePathForSession, useLogin, useSession } from "@/modules/auth/hooks";
import { loginSchema, type LoginFormValues } from "@/modules/auth/schemas";

export default function LoginPage() {
  const router = useRouter();
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken());
  const session = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: DEMO_ACCOUNTS[0].email, password: DEMO_ACCOUNTS[0].password },
  });

  useEffect(() => {
    if (hasToken && session.isSuccess && session.data) {
      router.replace(homePathForSession(session.data));
    }
  }, [hasToken, session.isSuccess, session.data, router]);

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

            {login.isError ? (
              <Alert severity="error">Credenciais inválidas ou usuário inativo.</Alert>
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

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, textAlign: "center" }}>
                Acessos demo (MVP) — senha: {DEMO_ACCOUNTS[0].password}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                {DEMO_ACCOUNTS.map((account) => (
                  <Chip
                    key={account.email}
                    label={account.label}
                    clickable
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setValue("email", account.email, { shouldValidate: true });
                      setValue("password", account.password, { shouldValidate: true });
                    }}
                  />
                ))}
              </Stack>
            </Box>

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
