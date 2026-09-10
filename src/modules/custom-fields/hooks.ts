"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  createCustomField,
  deleteCustomField,
  fetchCustomFields,
  updateCustomField,
} from "./services";
import type { CreateCustomFieldInput, UpdateCustomFieldInput } from "./types";

export function useCustomFields(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customFields.list(includeInactive),
    queryFn: () => fetchCustomFields(includeInactive),
    enabled,
  });
}

function invalidateCustomFields(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.customFields.all });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) => createCustomField(input),
    onSuccess: () => invalidateCustomFields(queryClient),
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, input }: { fieldId: string; input: UpdateCustomFieldInput }) =>
      updateCustomField(fieldId, input),
    onSuccess: () => invalidateCustomFields(queryClient),
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) => deleteCustomField(fieldId),
    onSuccess: () => invalidateCustomFields(queryClient),
  });
}
