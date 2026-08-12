import { describe, expect, it } from "vitest";
import { resolveFeatures } from "./access";
import {
  canAddActiveUser,
  getMaxUsersLimit,
  nextPlanForMoreUsers,
  usersLimitLabel,
} from "./limits";

describe("max_users limits", () => {
  it("enforces Essencial = 5 and Pro = 15", () => {
    expect(getMaxUsersLimit(resolveFeatures("ESSENTIAL"))).toBe(5);
    expect(getMaxUsersLimit(resolveFeatures("PROFESSIONAL"))).toBe(15);
    expect(getMaxUsersLimit(resolveFeatures("ENTERPRISE"))).toBeNull();
  });

  it("blocks add when at cap", () => {
    const essential = resolveFeatures("ESSENTIAL");
    expect(canAddActiveUser(essential, 4)).toBe(true);
    expect(canAddActiveUser(essential, 5)).toBe(false);
    expect(canAddActiveUser(resolveFeatures("ENTERPRISE"), 100)).toBe(true);
  });

  it("formats usage label", () => {
    expect(usersLimitLabel(resolveFeatures("ESSENTIAL"), 2)).toBe("2 de 5 usuários do plano");
    expect(usersLimitLabel(resolveFeatures("ENTERPRISE"), 9)).toBe(
      "9 usuários ativos · ilimitado",
    );
  });

  it("points to the next plan for more seats", () => {
    expect(nextPlanForMoreUsers("ESSENTIAL")).toBe("PROFESSIONAL");
    expect(nextPlanForMoreUsers("PROFESSIONAL")).toBe("ENTERPRISE");
    expect(nextPlanForMoreUsers("ENTERPRISE")).toBeUndefined();
  });
});
