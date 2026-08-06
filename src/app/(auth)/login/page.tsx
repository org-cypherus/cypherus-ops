"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { getAccessToken } from "@/lib/auth/session";
import { useLogin, useSession } from "@/modules/auth/hooks";
import { loginSchema, type LoginFormValues } from "@/modules/auth/schemas";

export default function LoginPage() {
  const router = useRouter();
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken());
  const session = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "ana@cypherops.com", password: "123456" },
  });

  useEffect(() => {
    if (hasToken && session.isSuccess) {
      router.replace("/leads");
    }
  }, [hasToken, session.isSuccess, router]);

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      sx={{
        background: (theme) =>
          theme.palette.mode === "light"
            ? "linear-gradient(160deg, #F5F7FA 0%, #E3F2FD 100%)"
            : "linear-gradient(160deg, #0F1419 0%, #1A2332 100%)",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }} elevation={0} variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit((values) => login.mutate(values))}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em"  }}>
                Cypher Ops
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5  }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              Demo: ana@cypherops.com / 123456
              <br />
              Novos usuários: sobrenome + ano (ex.: Souza2026) — pedem troca no 1º acesso
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
