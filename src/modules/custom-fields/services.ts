import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { sortCustomFields, toUiCustomField, unwrapCustomFieldList } from "./adapters";
import type {
  CreateCustomFieldInput,
  CrmCustomField,
  CustomFieldDefinition,
  UpdateCustomFieldInput,
} from "./types";

export async function fetchCustomFields(includeInactive = false): Promise<CustomFieldDefinition[]> {
  const { data } = await api.get<unknown>(companyPath("/custom-fields"), {
    params: includeInactive ? { include_inactive: true } : undefined,
  });
  return sortCustomFields(unwrapCustomFieldList(data).map(toUiCustomField));
}

export async function createCustomField(input: CreateCustomFieldInput): Promise<CustomFieldDefinition> {
  const { data } = await api.post<CrmCustomField>(companyPath("/custom-fields"), {
    key: input.key,
    label: input.label,
    type: input.type,
    required: input.required ?? false,
    sort_order: input.sortOrder ?? 0,
    ...(input.type === "select" ? { options: input.options ?? [] } : {}),
    entity: input.entity ?? "LEAD",
  });
  return toUiCustomField(data);
}

export async function updateCustomField(
  fieldId: string,
  input: UpdateCustomFieldInput,
): Promise<CustomFieldDefinition> {
  const body: Record<string, unknown> = {};
  if (input.label !== undefined) body.label = input.label;
  if (input.required !== undefined) body.required = input.required;
  if (input.sortOrder !== undefined) body.sort_order = input.sortOrder;
  if (input.options !== undefined) body.options = input.options;
  const { data } = await api.patch<CrmCustomField>(companyPath(`/custom-fields/${fieldId}`), body);
  return toUiCustomField(data);
}

export async function deleteCustomField(fieldId: string): Promise<void> {
  await api.delete(companyPath(`/custom-fields/${fieldId}`));
}
