import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomFieldDefinition } from "../types";

const fieldsState = vi.hoisted(() => ({
  data: [] as CustomFieldDefinition[],
}));

const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();

vi.mock("../hooks", () => ({
  useCustomFields: () => ({ data: fieldsState.data, isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateCustomField: () => ({ mutate: createMutate, isPending: false }),
  useUpdateCustomField: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteCustomField: () => ({ mutate: deleteMutate, isPending: false }),
}));

vi.mock("@/modules/auth/hooks", () => ({
  useSession: () => ({
    data: {
      features: { custom_fields: { enabled: true, limit: 10 } },
    },
  }),
}));

import { CustomFieldsAdminPage } from "./CustomFieldsAdminPage";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryClientProvider>
  );
}

describe("CustomFieldsAdminPage", () => {
  beforeEach(() => {
    fieldsState.data = [];
    createMutate.mockReset();
    updateMutate.mockReset();
    deleteMutate.mockReset();
  });

  it("shows empty state when the tenant has no extra fields", () => {
    render(<CustomFieldsAdminPage />, { wrapper });
    expect(screen.getByText("Nenhum campo extra")).toBeInTheDocument();
    expect(screen.getByText(/só os dados padrão/i)).toBeInTheDocument();
  });

  it("lists definitions and opens create dialog", async () => {
    fieldsState.data = [
      {
        id: "cf-1",
        companyId: "c1",
        entity: "LEAD",
        key: "nicho",
        label: "Nicho",
        type: "text",
        required: false,
        sortOrder: 0,
        options: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    render(<CustomFieldsAdminPage />, { wrapper });
    expect(screen.getByText("Nicho")).toBeInTheDocument();
    expect(screen.getByText("nicho")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Novo campo" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("soft-deletes a field after confirm", async () => {
    fieldsState.data = [
      {
        id: "cf-1",
        companyId: "c1",
        entity: "LEAD",
        key: "nicho",
        label: "Nicho",
        type: "text",
        required: false,
        sortOrder: 0,
        options: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    render(<CustomFieldsAdminPage />, { wrapper });
    await userEvent.click(screen.getByLabelText("Excluir Nicho"));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(deleteMutate).toHaveBeenCalledWith("cf-1", expect.any(Object));
  });
});
