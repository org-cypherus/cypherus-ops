import { api, type Paginated } from "@/lib/api/client";

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

export async function fetchContracts(params?: { leadId?: string }) {
  const { data } = await api.get<Paginated<Contract>>(
    "/contracts",
    params?.leadId ? { params } : undefined,
  );
  return data;
}

export async function fetchContract(id: string) {
  const { data } = await api.get<Contract>(`/contracts/${id}`);
  return data;
}

export async function fetchTemplates() {
  const { data } = await api.get<{ data: ContractTemplate[] }>("/contract-templates");
  return data.data;
}

export async function createTemplate(payload: Omit<ContractTemplate, "id">) {
  const { data } = await api.post<ContractTemplate>("/contract-templates", payload);
  return data;
}

export async function updateTemplate(id: string, payload: Partial<ContractTemplate>) {
  const { data } = await api.patch<ContractTemplate>(`/contract-templates/${id}`, payload);
  return data;
}

export async function deleteTemplate(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/contract-templates/${id}`);
  return data;
}

export async function createContract(payload: {
  leadId: string;
  templateId: string;
  value: number;
}) {
  const { data } = await api.post<Contract>("/contracts", payload);
  return data;
}

export async function generateContractPdf(id: string) {
  const { data } = await api.post<Contract & { file?: StoredFile }>(`/contracts/${id}/generate-pdf`);
  return data;
}

export async function fetchFile(id: string) {
  const { data } = await api.get<StoredFile>(`/files/${id}`);
  return data;
}

export async function signContract(
  id: string,
  payload?: { signedDataUrl?: string; fileName?: string },
) {
  const { data } = await api.post<Contract>(`/contracts/${id}/sign`, payload || {});
  return data;
}

export async function updateContract(id: string, payload: Partial<Contract>) {
  const { data } = await api.patch<Contract>(`/contracts/${id}`, payload);
  return data;
}
