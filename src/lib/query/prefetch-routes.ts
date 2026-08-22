import type { QueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@/lib/auth/session";
import { Role } from "@/lib/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { fetchUsers } from "@/modules/admin/services";
import { fetchContracts } from "@/modules/contracts/services";
import { fetchAdminDashboard, fetchCommercialDashboard, periodRange } from "@/modules/dashboard/services";
import { fetchPayments } from "@/modules/financial/services";
import { fetchKanban } from "@/modules/leads/services";
import { fetchCompaniesOverview } from "@/modules/platform/services";
import { fetchUserDirectoryOrEmpty } from "@/modules/users/directory";

function periodBounds(days = 30) {
  const { from, to } = periodRange(days);
  return {
    period: String(days),
    from,
    to,
  };
}

/** Prefetch pós-sessão: home comercial (kanban) + diretório de users. */
export function prefetchWarmQueries(queryClient: QueryClient, session: SessionUser) {
  const tasks: Promise<unknown>[] = [];

  if (session.permissions.includes("crm:visualizar")) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.kanban,
        queryFn: fetchKanban,
      }),
    );
  }

  if (session.role !== Role.Comercial) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.userDirectory,
        queryFn: fetchUserDirectoryOrEmpty,
      }),
    );
  }

  return Promise.allSettled(tasks);
}

/** Prefetch da query principal ao hover na sidebar. */
export function prefetchNavHref(queryClient: QueryClient, href: string) {
  switch (href) {
    case "/leads":
      return queryClient.prefetchQuery({
        queryKey: queryKeys.kanban,
        queryFn: fetchKanban,
      });
    case "/contracts":
      return queryClient.prefetchQuery({
        queryKey: queryKeys.contracts.list(),
        queryFn: () => fetchContracts(),
      });
    case "/dashboard": {
      const { period, from, to } = periodBounds(30);
      return queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.me({ period }),
        queryFn: () => fetchCommercialDashboard(from, to),
      });
    }
    case "/dashboard/admin": {
      const { period, from, to } = periodBounds(30);
      return queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.admin({ period }),
        queryFn: () => fetchAdminDashboard(from, to),
      });
    }
    case "/financial":
      return queryClient.prefetchQuery({
        queryKey: queryKeys.payments.list(),
        queryFn: fetchPayments,
      });
    case "/admin/users":
      return queryClient.prefetchQuery({
        queryKey: queryKeys.users,
        queryFn: fetchUsers,
      });
    case "/platform":
    case "/platform/companies":
    case "/platform/billing":
      return queryClient.prefetchQuery({
        queryKey: queryKeys.platform.overview,
        queryFn: fetchCompaniesOverview,
      });
    default:
      return Promise.resolve();
  }
}
