"use client";

import { Card, CardContent, Typography } from "@mui/material";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell py={4}>
      <Suspense fallback={<SignupFallback />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
