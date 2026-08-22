"use client";

import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import type { Permission } from "@/lib/auth/permissions";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  permissionFromModule,
} from "@/modules/admin/permission-modules";

type Props = {
  selected: Permission[];
  onChange: (next: Permission[]) => void;
  loading?: boolean;
  disabled?: boolean;
  /** Sem feature `advanced_permissions` no plano. */
  planBlocked?: boolean;
};

function togglePermission(list: Permission[], permission: Permission, checked: boolean): Permission[] {
  if (checked) {
    return list.includes(permission) ? list : [...list, permission];
  }
  return list.filter((item) => item !== permission);
}

export function UserPermissionsEditor({
  selected,
  onChange,
  loading,
  disabled,
  planBlocked,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  if (planBlocked) {
    return (
      <Alert
        severity="info"
        icon={<LockOutlinedIcon fontSize="inherit" />}
        action={
          <Button component={Link} href="/#pricing" color="inherit" size="small">
            Ver planos
          </Button>
        }
        sx={{ borderRadius: 2 }}
      >
        Overrides por usuário exigem o recurso de permissões avançadas (plano Profissional ou
        superior).
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box py={3} display="flex" justifyContent="center">
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          Permissões
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ajuste o que este colaborador pode ver e fazer. As alterações entram como exceções sobre o
          cargo — use o botão <strong>Salvar</strong> abaixo para gravar.
        </Typography>
      </Box>

      {isMobile ? (
        <Stack spacing={1.5}>
          {PERMISSION_MODULES.map((mod) => (
            <Box
              key={mod.key}
              sx={{
                p: 1.75,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                {mod.label}
              </Typography>
              <Stack spacing={0.25}>
                {mod.actions.map((action) => {
                  const permission = permissionFromModule(mod.key, action);
                  const checked = selected.includes(permission);
                  return (
                    <FormControlLabel
                      key={action}
                      disabled={disabled}
                      control={
                        <Switch
                          size="small"
                          id={`perm-${mod.key}-${action}`}
                          checked={checked}
                          onChange={(e) =>
                            onChange(togglePermission(selected, permission, e.target.checked))
                          }
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                          {action}
                        </Typography>
                      }
                      sx={{
                        mx: 0,
                        px: 0.5,
                        borderRadius: 1,
                        justifyContent: "space-between",
                        width: "100%",
                        ml: 0,
                        "& .MuiFormControlLabel-label": { flex: 1 },
                      }}
                      labelPlacement="start"
                    />
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <TableContainer
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            overflow: "auto",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Módulo</TableCell>
                {PERMISSION_ACTIONS.map((action) => (
                  <TableCell key={action} align="center" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {action}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERMISSION_MODULES.map((mod) => (
                <TableRow key={mod.key} hover>
                  <TableCell>{mod.label}</TableCell>
                  {PERMISSION_ACTIONS.map((action) => {
                    const available = mod.actions.includes(action);
                    if (!available) {
                      return (
                        <TableCell key={action} align="center" sx={{ color: "text.disabled" }}>
                          —
                        </TableCell>
                      );
                    }
                    const permission = permissionFromModule(mod.key, action);
                    const checked = selected.includes(permission);
                    return (
                      <TableCell key={action} align="center" padding="checkbox">
                        <Checkbox
                          size="small"
                          disabled={disabled}
                          checked={checked}
                          icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                          checkedIcon={<CheckBoxIcon fontSize="small" />}
                          onChange={(e) =>
                            onChange(togglePermission(selected, permission, e.target.checked))
                          }
                          inputProps={{ "aria-label": `${mod.label} ${action}` }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
