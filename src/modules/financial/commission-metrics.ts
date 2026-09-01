import type { Commission } from "./services";

export type CommissionByUser = {
  userName: string;
  amount: number;
  count: number;
};

export type CommissionStatusSlice = {
  status: string;
  amount: number;
  count: number;
};

export type CommissionPanelMetrics = {
  total: number;
  count: number;
  beneficiaries: number;
  average: number;
  topShare: number;
  byUser: CommissionByUser[];
  topUsers: CommissionByUser[];
  statusMix: CommissionStatusSlice[];
};

export function filterCommissions(
  commissions: Commission[],
  filters: { beneficiary: string; status: string },
) {
  const q = filters.beneficiary.trim().toLowerCase();
  return commissions.filter((item) => {
    if (q && !(item.userName || "").toLowerCase().includes(q)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}

export function buildCommissionPanelMetrics(
  commissions: Commission[],
  topN = 5,
): CommissionPanelMetrics {
  const byUserMap = new Map<string, CommissionByUser>();
  const statusMap = new Map<string, CommissionStatusSlice>();
  let total = 0;

  for (const item of commissions) {
    const amount = Number(item.amount) || 0;
    total += amount;
    const name = item.userName?.trim() || "Sem beneficiário";
    const row = byUserMap.get(name) ?? { userName: name, amount: 0, count: 0 };
    row.amount += amount;
    row.count += 1;
    byUserMap.set(name, row);

    const status = item.status || "—";
    const slice = statusMap.get(status) ?? { status, amount: 0, count: 0 };
    slice.amount += amount;
    slice.count += 1;
    statusMap.set(status, slice);
  }

  const byUser = Array.from(byUserMap.values()).sort((a, b) => b.amount - a.amount);
  const topUsers = byUser.slice(0, topN);
  const topTotal = topUsers.reduce((sum, row) => sum + row.amount, 0);

  return {
    total,
    count: commissions.length,
    beneficiaries: byUser.length,
    average: commissions.length ? total / commissions.length : 0,
    topShare: total > 0 ? topTotal / total : 0,
    byUser,
    topUsers,
    statusMix: Array.from(statusMap.values()).sort((a, b) => b.amount - a.amount),
  };
}
