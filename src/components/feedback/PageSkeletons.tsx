"use client";

import {
  Box,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

export function PageHeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
      <Box>
        <Skeleton variant="text" width={220} height={40} />
        <Skeleton variant="text" width={320} height={24} />
      </Box>
      {withActions ? (
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Stack>
      ) : null}
    </Stack>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        overflowX: "auto",
        alignItems: "flex-start",
        pb: 1,
      }}
    >
      {Array.from({ length: columns }, (_, col) => (
        <Paper
          key={col}
          variant="outlined"
          sx={{
            flex: "0 0 260px",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            bgcolor: "action.hover",
          }}
        >
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="40%" height={18} />
          {Array.from({ length: 3 }, (_, card) => (
            <Skeleton key={card} variant="rounded" height={88} sx={{ bgcolor: "background.paper" }} />
          ))}
        </Paper>
      ))}
    </Box>
  );
}

export function TableSkeleton({
  columns,
  rows = 8,
  headers,
}: {
  columns: number;
  rows?: number;
  headers?: string[];
}) {
  const cols = headers?.length ?? columns;
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {Array.from({ length: cols }, (_, i) => (
              <TableCell key={i}>{headers?.[i] ?? <Skeleton width="70%" />}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <TableCell key={c}>
                  <Skeleton variant="text" width={c === 0 ? "80%" : "60%"} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function LeadDetailSkeleton() {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
          <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
          <Stack spacing={1.25}>
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={40} />
            <Skeleton variant="rounded" height={80} />
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
          <Skeleton variant="text" width="45%" height={28} sx={{ mb: 1 }} />
          <Stack spacing={1.25}>
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        </Paper>
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 1.5 }} />
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </Stack>
      </Paper>
    </Stack>
  );
}

export function LeadsPageSkeleton({ view = "kanban" }: { view?: "kanban" | "table" }) {
  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <PageHeaderSkeleton />
      <Skeleton variant="rounded" height={56} />
      {view === "table" ? (
        <TableSkeleton
          columns={7}
          headers={["Nome", "Documento", "Status", "Responsável", "Origem", "Valor", "Criação"]}
        />
      ) : (
        <KanbanSkeleton />
      )}
    </Stack>
  );
}

export function ContractsPageSkeleton() {
  return (
    <Stack spacing={2.5}>
      <PageHeaderSkeleton />
      <TableSkeleton
        columns={5}
        headers={["Lead", "Modelo", "Status", "Valor", "Criado em"]}
      />
    </Stack>
  );
}
