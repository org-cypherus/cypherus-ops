import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";
import { Role } from "@/lib/auth/permissions";

const fieldsState = vi.hoisted(() => ({
  data: [] as CustomFieldDefinition[],
}));

const createMutate = vi.fn();

vi.mock("@/modules/custom-fields/hooks", () => ({
  useCustomFields: () => ({ data: fieldsState.data, isLoading: false, isError: false }),
}));

vi.mock("../hooks", () => ({
  useCreateLead: () => ({ mutate: createMutate, isPending: false }),
}));

vi.mock("@/modules/auth/hooks", () => ({
  useSession: () => ({
    data: {
      id: "u1",
      role: Role.Administrador,
      permissions: ["crm:criar"],
    },
  }),
}));

vi.mock("@/modules/users/hooks", () => ({
  useUserDirectory: () => ({ data: [{ id: "u1", name: "Ana" }], isLoading: false }),
}));

import { CreateLeadDialog } from "./CreateLeadDialog";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryClientProvider>
  );
}

const requiredSelect: CustomFieldDefinition = {
  id: "cf-select",
  companyId: "c1",
  entity: "LEAD",
  key: "origem_detalhe",
  label: "Origem detalhe",
  type: "select",
  required: true,
  sortOrder: 0,
  options: ["Indicação", "Google"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CreateLeadDialog custom fields", () => {
  beforeEach(() => {
    fieldsState.data = [];
    createMutate.mockReset();
  });

  it("creates without extra fields when there are no defs", async () => {
    const user = userEvent.setup();
    render(<CreateLeadDialog open onClose={() => undefined} />, { wrapper });
    await user.type(screen.getByLabelText("Nome"), "Maria Silva");
    await user.type(screen.getByLabelText("E-mail"), "maria@example.com");
    await user.type(screen.getByLabelText("Telefone"), "11999999999");
    await user.type(screen.getByLabelText("CPF"), "12345678909");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/Nenhum campo extra/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar e criar" }));
    expect(createMutate).toHaveBeenCalled();
    const payload = createMutate.mock.calls[0][0] as { process: Record<string, unknown> };
    expect(payload.process.bank).toBeUndefined();
    expect(payload.process.installments).toBeUndefined();
  });

  it("shows a required select when the tenant defined one", async () => {
    fieldsState.data = [requiredSelect];
    const user = userEvent.setup();
    render(<CreateLeadDialog open onClose={() => undefined} />, { wrapper });
    await user.type(screen.getByLabelText("Nome"), "Maria Silva");
    await user.type(screen.getByLabelText("E-mail"), "maria@example.com");
    await user.type(screen.getByLabelText("Telefone"), "11999999999");
    await user.type(screen.getByLabelText("CPF"), "12345678909");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Origem detalhe *")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(createMutate).not.toHaveBeenCalled();
  });
});
