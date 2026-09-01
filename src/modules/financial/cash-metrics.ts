import type { Payment } from "./services";

export type StatusMixSlice = {
  status: string;
  amount: number;
  count: number;
};

export type AgingBucket = {
  key: string;
  label: string;
  amount: number;
  count: number;
};

export type WeeklyCashPoint = {
  weekStart: string;
  label: string;
  amount: number;
  count: number;
};

export type CashPanelMetrics = {
  received: number;
  pending: number;
  overdue: number;
  collectionRate: number;
  next7Days: number;
  statusMix: StatusMixSlice[];
  aging: AgingBucket[];
  weeklyCash: WeeklyCashPoint[];
};

const OPEN_STATUSES = new Set(["Pendente", "Atrasado", "Inadimplente"]);

function parseDay(value?: string): Date | null {
  const key = value?.slice(0, 10);
  if (!key) return null;
  const date = new Date(`${key}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / 86_400_000);
}

function mondayOf(date: Date) {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + offset);
  return day;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekLabel(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt.format(weekStart)}–${fmt.format(end)}`;
}

function agingBucketFor(daysOverdue: number): AgingBucket["key"] {
  if (daysOverdue <= 0) return "on_time";
  if (daysOverdue <= 7) return "1_7";
  if (daysOverdue <= 15) return "8_15";
  if (daysOverdue <= 30) return "16_30";
  return "30_plus";
}

const AGING_ORDER: Array<{ key: AgingBucket["key"]; label: string }> = [
  { key: "on_time", label: "No prazo" },
  { key: "1_7", label: "1–7 dias" },
  { key: "8_15", label: "8–15 dias" },
  { key: "16_30", label: "16–30 dias" },
  { key: "30_plus", label: "30+ dias" },
];

export function buildCashPanelMetrics(
  payments: Payment[],
  today: Date = new Date(),
): CashPanelMetrics {
  let received = 0;
  let pending = 0;
  let overdue = 0;
  let next7Days = 0;

  const mixMap = new Map<string, StatusMixSlice>();
  const agingMap = new Map<string, AgingBucket>(
    AGING_ORDER.map((bucket) => [
      bucket.key,
      { key: bucket.key, label: bucket.label, amount: 0, count: 0 },
    ]),
  );
  const weekMap = new Map<string, WeeklyCashPoint>();

  for (const payment of payments) {
    const amount = Number(payment.amount) || 0;
    const status = payment.status || "—";

    if (status === "Recebido") received += amount;
    else if (status === "Atrasado" || status === "Inadimplente") overdue += amount;
    else pending += amount;

    const mix = mixMap.get(status) ?? { status, amount: 0, count: 0 };
    mix.amount += amount;
    mix.count += 1;
    mixMap.set(status, mix);

    const due = parseDay(payment.dueDate);
    if (due && OPEN_STATUSES.has(status)) {
      const overdueDays = daysBetween(due, today);
      const bucketKey = agingBucketFor(overdueDays);
      const bucket = agingMap.get(bucketKey)!;
      bucket.amount += amount;
      bucket.count += 1;

      if (overdueDays <= 0 && overdueDays >= -7) {
        next7Days += amount;
      }

      const weekStart = mondayOf(due);
      const key = dayKey(weekStart);
      const point = weekMap.get(key) ?? {
        weekStart: key,
        label: weekLabel(weekStart),
        amount: 0,
        count: 0,
      };
      point.amount += amount;
      point.count += 1;
      weekMap.set(key, point);
    }
  }

  const collectible = received + overdue;
  const collectionRate = collectible > 0 ? received / collectible : 0;

  const weeklyCash = Array.from(weekMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );

  return {
    received,
    pending,
    overdue,
    collectionRate,
    next7Days,
    statusMix: Array.from(mixMap.values()).sort((a, b) => b.amount - a.amount),
    aging: AGING_ORDER.map((item) => agingMap.get(item.key)!),
    weeklyCash,
  };
}

export type UpcomingReceivableDay = {
  key: string;
  label: string;
  weekday: string;
};

/** `"week"` lista a janela de 7 dias; qualquer outro valor é `YYYY-MM-DD`. */
export type UpcomingDayFilter = string;

export function upcomingReceivableDays(today: Date = new Date(), count = 7): UpcomingReceivableDay[] {
  const start = startOfDay(today);
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: dayKey(date),
      label: dateFmt.format(date),
      weekday: index === 0 ? "Hoje" : weekdayFmt.format(date).replace(/\.$/, ""),
    };
  });
}

/** Pendentes/atrasados com vencimento nos próximos 7 dias (mesmo recorte do KPI Caixa 7 dias). */
export function listUpcomingReceivables(
  payments: Payment[],
  today: Date = new Date(),
  day: UpcomingDayFilter = "week",
): Payment[] {
  const windowKeys = new Set(upcomingReceivableDays(today).map((item) => item.key));
  return payments
    .filter((payment) => {
      if (!OPEN_STATUSES.has(payment.status || "")) return false;
      const due = parseDay(payment.dueDate);
      if (!due) return false;
      const key = dayKey(due);
      if (!windowKeys.has(key)) return false;
      return day === "week" || key === day;
    })
    .sort((a, b) => {
      const byDate = (a.dueDate || "").localeCompare(b.dueDate || "");
      if (byDate !== 0) return byDate;
      return a.leadName.localeCompare(b.leadName, "pt-BR");
    });
}
