import { api } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import type { LoginFormValues } from "./schemas";

export async function loginRequest(values: LoginFormValues) {
  const { data } = await api.post<{
    access_token: string;
    user: SessionUser;
  }>("/login", values);
  setAccessToken(data.access_token);
  return data.user;
}

export async function fetchMe() {
  const { data } = await api.get<SessionUser>("/me");
  return data;
}

export async function logoutRequest() {
  try {
    await api.post("/logout");
  } finally {
    clearAccessToken();
  }
}
