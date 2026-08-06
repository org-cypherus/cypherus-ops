"use client";

import { Card, CardActionArea, CardContent, Grid2 as Grid, Stack, Typography } from "@mui/material";
import Link from "next/link";

const links = [
  {
    href: "/admin/users",
    title: "Usuários",
    description: "CRUD de colaboradores, cargos e times",
  },
  {
    href: "/admin/roles",
    title: "Perfis",
    description: "Administrador, Gestor, Comercial, Financeiro e Jurídico",
  },
  {
    href: "/admin/permissions",
    title: "Matriz de permissões",
    description: "Controle granular por módulo e ação",
  },
];

export default function AdminPage() {
  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h4">Administração</Typography>
        <Typography variant="body2" color="text.secondary">
          Usuários, perfis e permissões
        </Typography>
      </div>
      <Grid container spacing={2}>
        {links.map((item) => (
          <Grid key={item.href} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardActionArea component={Link} href={item.href}>
                <CardContent>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1  }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
