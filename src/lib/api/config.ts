export const BFF_BASE_PATH = "/api/bff";

export function isMockMode() {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}
