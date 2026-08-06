export const queryKeys = {
  me: ["me"] as const,
  leads: {
    all: ["leads"] as const,
    list: (params?: Record<string, unknown>) => ["leads", "list", params] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
  },
  kanban: (params?: Record<string, unknown>) => ["kanban", params] as const,
  contracts: {
    all: ["contracts"] as const,
    list: (params?: Record<string, unknown>) => ["contracts", "list", params] as const,
    detail: (id: string) => ["contracts", "detail", id] as const,
    templates: ["contracts", "templates"] as const,
  },
  legalKanban: ["legal", "kanban"] as const,
  payments: {
    all: ["payments"] as const,
    list: (params?: Record<string, unknown>) => ["payments", "list", params] as const,
    commissions: ["payments", "commissions"] as const,
    rules: ["payments", "rules"] as const,
  },
  dashboard: {
    me: (params?: Record<string, unknown>) => ["dashboard", "me", params] as const,
    admin: (params?: Record<string, unknown>) => ["dashboard", "admin", params] as const,
  },
  reports: (params?: Record<string, unknown>) => ["reports", params] as const,
  users: ["users"] as const,
  roles: ["roles"] as const,
  notifications: ["notifications"] as const,
  search: (q: string) => ["search", q] as const,
};
