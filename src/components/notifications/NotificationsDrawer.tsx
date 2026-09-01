"use client";

import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { formatDate } from "@/lib/utils/format";
import { queryKeys } from "@/lib/query/keys";
import { useUIStore } from "@/store/ui";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  kind?: string;
  meta?: { eventIds?: string[]; leadId?: string; date?: string };
};

export function NotificationsDrawer() {
  const open = useUIStore((s) => s.notificationsOpen);
  const setOpen = useUIStore((s) => s.setNotificationsOpen);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const { data } = await api.get<{ data: NotificationItem[] }>("/notifications");
      return data.data;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  return (
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box width={360} p={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Notificações</Typography>
          <Button size="small" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Marcar todas
          </Button>
        </Stack>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : !(data || []).length ? (
          <Typography variant="body2" color="text.secondary">
            Nenhuma notificação.
          </Typography>
        ) : (
        <List>
          {(data || []).map((item) => (
            <ListItemButton
              key={item.id}
              alignItems="flex-start"
              sx={{ opacity: item.read ? 0.65 : 1 }}
              onClick={() => {
                markRead.mutate(item.id);
                setOpen(false);
                if (item.href) router.push(item.href);
              }}
            >
              <ListItemText
                primary={item.title}
                secondary={
                  <>
                    {item.body}
                    <br />
                    {formatDate(item.createdAt)}
                  </>
                }
              />
            </ListItemButton>
          ))}
        </List>
        )}
      </Box>
    </Drawer>
  );
}
