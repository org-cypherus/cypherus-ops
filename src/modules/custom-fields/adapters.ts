import { CUSTOM_FIELD_TYPES, type CrmCustomField, type CustomFieldDefinition, type CustomFieldType } from "./types";

function asType(value: unknown): CustomFieldType {
  if (typeof value === "string" && (CUSTOM_FIELD_TYPES as readonly string[]).includes(value)) {
    return value as CustomFieldType;
  }
  return "text";
}

export function unwrapCustomFieldList(data: unknown): CrmCustomField[] {
  if (Array.isArray(data)) return data as CrmCustomField[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: CrmCustomField[] }).items;
  }
  return [];
}

export function toUiCustomField(row: CrmCustomField): CustomFieldDefinition {
  return {
    id: row.id,
    companyId: row.company_id,
    entity: row.entity === "LEAD" ? "LEAD" : "LEAD",
    key: row.key,
    label: row.label,
    type: asType(row.type),
    required: Boolean(row.required),
    sortOrder: Number(row.sort_order ?? 0),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

export function sortCustomFields(fields: CustomFieldDefinition[]) {
  return [...fields].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"));
}
