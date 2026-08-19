import { api, type Paginated } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";

export type Contract = {
  id: string;
  leadId: string;
  leadName: string;
  templateId: string;
  templateName: string;
  status: "Rascunho" | "Enviado" | "Assinado" | "Arquivado";
  value: number;
  createdAt: string;
  signedAt?: string;
  pdfId?: string;
  signedPdfId?: string;
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  placeholders: string[];
  body: string;
};

export type StoredFile = {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
};

type CrmContract = {
  id: string;
  lead_id: string;
  template_id?: string | null;
  title: string;
  status: string;
  data?: Record<string, string>;
  current_version?: number;
  signed_attachment_id?: string | null;
  created_at: string;
  signed_at?: string | null;
  versions?: Array<{ version: number; attachment_id: string }>;
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

function toUiContract(item: CrmContract, leadName?: string, templateName?: string): Contract {
  const latest = item.versions?.[item.versions.length - 1];
  return {
    id: item.id,
    leadId: item.lead_id,
    leadName: leadName || "",
    templateId: item.template_id || "",
    templateName: templateName || item.title,
    status: STATUS_TO_UI[item.status] ?? "Rascunho",
    value: Number(item.data?.value ?? item.data?.valor ?? 0),
    createdAt: item.created_at,
    signedAt: item.signed_at ?? undefined,
    pdfId: latest?.attachment_id,
    signedPdfId: item.signed_attachment_id ?? undefined,
  };
}

async function leadNameMap() {
  const { data } = await api.get<Array<{ id: string; name: string }>>(companyPath("/leads"));
  return Object.fromEntries(data.map((lead) => [lead.id, lead.name]));
}

export async function fetchContracts(params?: { leadId?: string }) {
  const path = params?.leadId
    ? companyPath(`/leads/${params.leadId}/contracts`)
    : companyPath("/contracts");
  const { data } = await api.get<CrmContract[]>(path);
  const names = await leadNameMap();
  const mapped = data.map((item) => toUiContract(item, names[item.lead_id], item.title));
  return {
    data: mapped,
    total: mapped.length,
    page: 1,
    pageSize: mapped.length,
  } satisfies Paginated<Contract>;
}

export async function fetchContract(id: string) {
  const { data } = await api.get<CrmContract>(companyPath(`/contracts/${id}`));
  const names = await leadNameMap();
  return toUiContract(data, names[data.lead_id], data.title);
}

export async function fetchTemplates() {
  const { data } = await api.get<CrmTemplate[]>(companyPath("/contract-templates"));
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    description: "",
    placeholders: item.placeholders ?? [],
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
    placeholders: data.placeholders ?? [],
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
    placeholders: data.placeholders ?? [],
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
}) {
  const { data } = await api.post<CrmContract>(companyPath(`/leads/${payload.leadId}/contracts`), {
    template_id: payload.templateId,
    title: "Contrato",
    data: { value: String(payload.value) },
  });
  return toUiContract(data, undefined, "Contrato");
}

export async function generateContractPdf(id: string) {
  const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/generate`));
  return toUiContract(data);
}

export async function fetchFile(id: string) {
  const response = await api.get<ArrayBuffer>(companyPath(`/attachments/${id}/content`), {
    responseType: "arraybuffer",
  });
  const blob = new Blob([response.data]);
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  return {
    id,
    name: "arquivo",
    mime: String(response.headers["content-type"] || "application/pdf"),
    dataUrl,
  } satisfies StoredFile;
}

export async function signContract(
  id: string,
  payload?: { signedDataUrl?: string; fileName?: string; file?: File },
) {
  const form = new FormData();
  if (payload?.file) {
    form.append("file", payload.file);
  } else if (payload?.signedDataUrl) {
    const blob = await (await fetch(payload.signedDataUrl)).blob();
    form.append("file", blob, payload.fileName || "assinado.pdf");
  } else {
    throw new Error("Envie o PDF assinado para concluir a assinatura.");
  }
  const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/sign`), form);
  return toUiContract(data);
}

export async function updateContract(id: string, payload: Partial<Contract>) {
  if (payload.status === "Arquivado") {
    const { data } = await api.post<CrmContract>(companyPath(`/contracts/${id}/archive`));
    return toUiContract(data);
  }
  const { data } = await api.patch<CrmContract>(companyPath(`/contracts/${id}`), {
    title: payload.templateName,
    data: payload.value != null ? { value: String(payload.value) } : undefined,
  });
  return toUiContract(data);
}

export { UI_TO_STATUS };
