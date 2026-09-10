export const CUSTOM_FIELD_TYPES = ["text", "number", "money", "date", "bool", "select"] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomFieldEntity = "LEAD";

export const RESERVED_PROCESS_KEYS = new Set(["potential_value", "value"]);

export const CUSTOM_FIELD_KEY_RE = /^[a-z][a-z0-9_]{0,62}$/;

export const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  money: "Moeda",
  date: "Data",
  bool: "Sim/Não",
  select: "Lista",
};

export type CustomFieldDefinition = {
  id: string;
  companyId: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  sortOrder: number;
  options: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CreateCustomFieldInput = {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  sortOrder?: number;
  options?: string[];
  entity?: CustomFieldEntity;
};

export type UpdateCustomFieldInput = {
  label?: string;
  required?: boolean;
  sortOrder?: number;
  options?: string[];
};

export type CrmCustomField = {
  id: string;
  company_id: string;
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  sort_order: number;
  options: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};
