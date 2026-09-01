import { api, getApiError, type Paginated } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { downloadApiFile, fetchApiBlob } from "@/lib/utils/download";
import { fetchLeadNameMap } from "@/modules/leads/services";

export type Contract = {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  templateId: string;
  templateName: string;
  status: "Rascunho" | "Enviado" | "Assinado" | "Arquivado";
  value: number;
  createdAt: string;
  updatedAt?: string;
  signedAt?: string;
  archivedAt?: string;
  pdfId?: string;
  signedPdfId?: string;
  currentVersion: number;
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  placeholders: string[];
  body: string;
};

/** Espelha ContractResponse do saas-crm (contrato-api-frontend.md). */
export type CrmContract = {
  id: string;
  company_id?: string;
  lead_id: string;
  template_id?: string | null;
  title: string;
  status: string;
  data?: Record<string, string> | null;
  current_version?: number;
  signed_attachment_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  signed_at?: string | null;
  archived_at?: string | null;
  versions?: Array<{ version: number; attachment_id: string; created_at?: string }>;
};

type CrmTemplate = {
  id: string;
  name: string;
  body: string;
  placeholders: string[];
  is_active?: boolean;
};

const STATUS_TO_UI: Record<string, Contract["status"]> = {
  DRAFT: "Rascunho",
  GENERATED: "Enviado",
  SIGNED: "Assinado",
  ARCHIVED: "Arquivado",
};

const UI_TO_STATUS: Record<string, string> = {
  Rascunho: "DRAFT",
  Enviado: "GENERATED",
  Assinado: "SIGNED",
  Arquivado: "ARCHIVED",
};

/** YYYY-MM-DD — filtros de data sem deslocar timezone do ISO. */
export function dayKey(value?: string) {
  return value?.slice(0, 10) || "";
}

/** CRM interpola `{{valor}}`; aceita também `value` legado na UI. */
export function contractDataValue(data?: Record<string, string> | null) {
  if (!data) return 0;
  for (const key of ["valor", "value"] as const) {
    const raw = data[key];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function versionAttachment(item: CrmContract) {
  const version = item.current_version ?? 0;
  if (version < 1) return undefined;
  const match = item.versions?.find((row) => row.version === version);
  return match?.attachment_id ?? item.versions?.at(-1)?.attachment_id;
}

/** Placeholders do CRM vêm sem `{{}}`; a UI edita com chaves. */
export function toUiPlaceholders(keys: string[] | undefined) {
  return (keys ?? []).map((key) => {
    const bare = key.replace(/^\{\{\s*|\s*\}\}$/g, "");
    return bare ? `{{${bare}}}` : key;
  });
}

export function mapContract(
  item: CrmContract,
  extras?: { leadName?: string; templateName?: string },
): Contract {
  return {
    id: item.id,
    leadId: item.lead_id,
    leadName: extras?.leadName || "",
    title: item.title,
    templateId: item.template_id || "",
    templateName: extras?.templateName || item.title,
    status: STATUS_TO_UI[item.status] ?? "Rascunho",
    value: contractDataValue(item.data),
    createdAt: item.created_at,
    updatedAt: item.updated_at ?? undefined,
    signedAt: item.signed_at ?? undefined,
    archivedAt: item.archived_at ?? undefined,
    pdfId: versionAttachment(item),
    signedPdfId: item.signed_attachment_id ?? undefined,
    currentVersion: item.current_version ?? 0,
  };
}

export function filterContracts(
  contracts: Contract[],
  filters: { lead: string; status: string; template: string; from: string; to: string },
) {
  const leadQ = filters.lead.trim().toLowerCase();
  const templateQ = filters.template.trim().toLowerCase();
  return contracts.filter((contract) => {
    if (
      leadQ &&
      !`${contract.leadName} ${contract.title}`.toLowerCase().includes(leadQ)
    ) {
      return false;
    }
    if (filters.status && contract.status !== filters.status) return false;
    if (
      templateQ &&
      !`${contract.templateName} ${contract.title}`.toLowerCase().includes(templateQ)
    ) {
      return false;
    }
    const created = dayKey(contract.createdAt);
    if (filters.from && created && created < filters.from) return false;
    if (filters.to && created && created > filters.to) return false;
    return true;
  });
}

function emptyPage(): Paginated<Contract> {
  return { data: [], total: 0, page: 1, pageSize: 0 };
}

async function leadNameMap() {
  return fetchLeadNameMap().catch(() => ({} as Record<string, string>));
}

async function templateNameMap(): Promise<Record<string, string>> {
  try {
    const templates = await fetchTemplates();
    return Object.fromEntries(templates.map((item) => [item.id, item.name]));
  } catch {
    return {};
  }
}

function contractDataPayload(value: number) {
  const asText = String(value);
  // `valor` é o placeholder do CRM; `value` mantém leitura legado.
  return { valor: asText, value: asText };
}

export async function fetchContracts(params?: { leadId?: string }) {
  try {
    const path = params?.leadId
      ? companyPath(`/leads/${params.leadId}/contracts`)
      : companyPath("/contracts");
    const [{ data }, names, templates] = await Promise.all([
      api.get<CrmContract[] | null>(path),
      leadNameMap(),
      templateNameMap(),
    ]);
    const list = Array.isArray(data) ? data : [];
    const mapped = list.map((item) =>
      mapContract(item, {
        leadName: names[item.lead_id],
        templateName: item.template_id ? templates[item.template_id] : undefined,
      }),
    );
    return {
      data: mapped,
      total: mapped.length,
      page: 1,
      pageSize: mapped.length,
    } satisfies Paginated<Contract>;
  } catch (error) {
    const status = getApiError(error).status;
    if (status === 404 || status === 204) return emptyPage();
    throw error;
  }
}

export async function fetchContract(id: string) {
  const [{ data }, names, templates] = await Promise.all([
    api.get<CrmContract>(companyPath(`/contracts/${id}`)),
    leadNameMap(),
    templateNameMap(),
  ]);
  return mapContract(data, {
    leadName: names[data.lead_id],
    templateName: data.template_id ? templates[data.template_id] : undefined,
  });
}

export async function fetchTemplates() {
  const { data } = await api.get<CrmTemplate[] | null>(companyPath("/contract-templates"));
  const list = Array.isArray(data) ? data : [];
  return list.map((item) => ({
    id: item.id,
    name: item.name,
    description: "",
    placeholders: toUiPlaceholders(item.placeholders),
    body: item.body,
  }));
}

export async function createTemplate(payload: Omit<ContractTemplate, "id">) {
  const { data } = await api.post<CrmTemplate>(companyPath("/contract-templates"), {
    name: payload.name,
    body: payload.body,
    is_active: true,
  });
  return {
    id: data.id,
    name: data.name,
    description: payload.description,
    placeholders: toUiPlaceholders(data.placeholders),
    body: data.body,
  };
}

export async function updateTemplate(id: string, payload: Partial<ContractTemplate>) {
  const { data } = await api.patch<CrmTemplate>(companyPath(`/contract-templates/${id}`), {
    name: payload.name,
    body: payload.body,
  });
  return {
    id: data.id,
    name: data.name,
    description: payload.description || "",
    placeholders: toUiPlaceholders(data.placeholders),
    body: data.body,
  };
}

export async function deleteTemplate(id: string) {
  await api.delete(companyPath(`/contract-templates/${id}`));
  return { ok: true };
}

export async function createContract(payload: {
  leadId: string;
  templateId: string;
  value: number;
  title?: string;
}) {
  const templates = await templateNameMap();
  const templateName = templates[payload.templateId] || "Contrato";
  const { data } = await api.post<CrmContract>(companyPath(`/leads/${payload.leadId}/contracts`), {
    template_id: payload.templateId,
    title: payload.title?.trim() || templateName,
    data: contractDataPayload(payload.value),
  });
  return mapContract(data, { templateName });
}

export async function generateContractPdf(id: string) {
  const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/generate`));
  return mapContract(data);
}

export async function downloadContractVersion(id: string, version: number, fallbackName?: string) {
  if (!version || version < 1) {
    throw new Error("Este contrato ainda não tem PDF gerado.");
  }
  return downloadApiFile(
    companyPath(`/contracts/${id}/versions/${version}/content`),
    fallbackName ?? `contrato-v${version}.pdf`,
  );
}

export async function fetchContractVersionBlob(id: string, version: number) {
  if (!version || version < 1) {
    throw new Error("Este contrato ainda não tem PDF gerado.");
  }
  return fetchApiBlob(companyPath(`/contracts/${id}/versions/${version}/content`));
}

export async function downloadSignedContract(id: string, fallbackName = "contrato-assinado.pdf") {
  return downloadApiFile(companyPath(`/contracts/${id}/signed/content`), fallbackName);
}

export async function fetchSignedContractBlob(id: string) {
  return fetchApiBlob(companyPath(`/contracts/${id}/signed/content`));
}

export async function signContract(id: string, file: Blob, fileName = "contrato-assinado.pdf") {
  const form = new FormData();
  form.append("file", file instanceof File ? file : new File([file], fileName, { type: file.type || "application/pdf" }));
  const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/sign`), form);
  return mapContract(data);
}

export async function signContractWithGeneratedVersion(id: string, version: number) {
  const blob = await fetchContractVersionBlob(id, version);
  return signContract(id, blob, `contrato-v${version}.pdf`);
}

export async function updateContract(id: string, payload: Partial<Contract>) {
  if (payload.status === "Arquivado") {
    const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/archive`));
    return mapContract(data);
  }
  if (payload.status === "Enviado") {
    return generateContractPdf(id);
  }
  const { data } = await api.patch<CrmContract>(companyPath(`/contracts/${id}`), {
    title: payload.title ?? payload.templateName,
    data: payload.value != null ? contractDataPayload(payload.value) : undefined,
  });
  return mapContract(data);
}

export { UI_TO_STATUS, STATUS_TO_UI };
