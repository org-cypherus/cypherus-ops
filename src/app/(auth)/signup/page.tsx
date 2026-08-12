"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { Suspense } from "react";
import { SignupForm } from "@/modules/auth/components/SignupForm";

function SignupFallback() {
  return (
    <Card sx={{ width: "100%", maxWidth: 640 }} elevation={0} variant="outlined">
      <CardContent sx={{ p: 4 }}>
        <Typography>Carregando formulário…</Typography>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Box
      component="main"
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={4}
      sx={{
        background: (theme) =>
          theme.palette.mode === "light"
            ? "linear-gradient(160deg, #F5F7FA 0%, #E3F2FD 100%)"
            : "linear-gradient(160deg, #0F1419 0%, #1A2332 100%)",
      }}
    >
      <Suspense fallback={<SignupFallback />}>
        <SignupForm />
      </Suspense>
    </Box>
  );
}
