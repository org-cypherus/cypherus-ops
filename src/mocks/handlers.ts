import { http, HttpResponse } from "msw";
import { calculateCommission } from "@/lib/utils/commission";
import { Role, type Permission, type RoleName } from "@/lib/auth/permissions";
import type { Attachment, Lead, PipelineStage } from "@/modules/leads/types";
import {
  addAttachment,
  addTimelineEntry,
  buildKanban,
  buildLegalKanban,
  canAccessLead,
  canDeactivateUser,
  createLead,
  currentUser,
  defaultPasswordFromName,
  deleteLead,
  deleteUser,
  distributeLeadsInStore,
  distributionSettings,
  filterLeads,
  generateContractPdf,
  generatedPdfs,
  mockCommissionRules,
  mockCommissions,
  mockContracts,
  mockLeads,
  mockNotifications,
  mockPayments,
  mockRolePermissions,
  mockTemplates,
  mockUsers,
  patchLead,
  removeAttachment,
  resolveOwnerScope,
  updateLeadStatus,
  updateLegalStatus,
  type ContractTemplate,
  type CommissionRule,
  type AppUser,
} from "./data";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function paginate<T>(items: T[], page = 1, pageSize = 50) {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

function funnel() {
  return buildKanban().columns.map((c) => ({ stage: c.status, value: c.count }));
}

export const handlers = [
  http.post(`${API}/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return HttpResponse.json({ statusCode: 400, message: "E-mail e senha são obrigatórios" }, { status: 400 });
    }
    const user = mockUsers.find((u) => u.email.toLowerCase() === body.email!.toLowerCase());
    if (!user || user.password !== body.password) {
      return HttpResponse.json({ statusCode: 401, message: "Credenciais inválidas" }, { status: 401 });
    }
    if (user.status !== "Ativo") {
      return HttpResponse.json({ statusCode: 403, message: "Usuário inativo" }, { status: 403 });
    }
    Object.assign(currentUser, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      team: user.team,
      permissions: [...mockRolePermissions[user.role]],
      mustChangePassword: user.mustChangePassword,
    });
    return HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      user: { ...currentUser },
    });
  }),

  http.post(`${API}/refresh`, () => HttpResponse.json({ access_token: "mock-access-token-refreshed" })),
  http.post(`${API}/logout`, () => HttpResponse.json({ ok: true })),
  http.get(`${API}/me`, () => {
    const user = mockUsers.find((u) => u.id === currentUser.id);
    currentUser.permissions = [...mockRolePermissions[currentUser.role]];
    return HttpResponse.json({
      ...currentUser,
      mustChangePassword: user?.mustChangePassword ?? false,
    });
  }),

  http.post(`${API}/me/change-password`, async ({ request }) => {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    const user = mockUsers.find((u) => u.id === currentUser.id);
    if (!user) return HttpResponse.json({ statusCode: 404, message: "Usuário não encontrado" }, { status: 404 });
    if (!body.newPassword || body.newPassword.length < 6) {
      return HttpResponse.json({ statusCode: 400, message: "Nova senha deve ter ao menos 6 caracteres" }, { status: 400 });
    }
    if (user.mustChangePassword === false && body.currentPassword !== user.password) {
      return HttpResponse.json({ statusCode: 400, message: "Senha atual incorreta" }, { status: 400 });
    }
    if (user.mustChangePassword && body.currentPassword && body.currentPassword !== user.password) {
      return HttpResponse.json({ statusCode: 400, message: "Senha atual incorreta" }, { status: 400 });
    }
    user.password = body.newPassword;
    user.mustChangePassword = false;
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/leads`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 50);
    const items = filterLeads(mockLeads, {
      q: url.searchParams.get("q") || undefined,
      ownerId: resolveOwnerScope(url.searchParams.get("ownerId")),
      origin: url.searchParams.get("origin") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      tag: url.searchParams.get("tag") || undefined,
      status: url.searchParams.get("status") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    });
    return HttpResponse.json(paginate(items, page, pageSize));
  }),

  http.get(`${API}/leads/:id`, ({ params }) => {
    const lead = mockLeads.find((l) => l.id === params.id);
    if (!lead) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(lead)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    return HttpResponse.json(lead);
  }),

  http.post(`${API}/leads`, async ({ request }) => {
    const body = (await request.json()) as Partial<Lead> & { name: string; email: string };
    // Comercial não escolhe responsável — cai na regra padrão do admin
    if (currentUser.role === Role.Comercial) {
      delete body.ownerId;
    }
    const lead = createLead(body);
    return HttpResponse.json(lead, { status: 201 });
  }),

  http.post(`${API}/leads/import`, async ({ request }) => {
    const body = (await request.json()) as { rows: Array<Partial<Lead> & { name: string; email: string }> };
    const created = (body.rows || []).map((row) => {
      if (currentUser.role === Role.Comercial) delete row.ownerId;
      return createLead(row);
    });
    return HttpResponse.json({ created: created.length, data: created }, { status: 201 });
  }),

  http.patch(`${API}/leads/:id`, async ({ params, request }) => {
    const existing = mockLeads.find((l) => l.id === params.id);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    const body = (await request.json()) as Partial<Lead>;
    if (currentUser.role === Role.Comercial) {
      delete body.ownerId;
    }
    const lead = patchLead(String(params.id), body);
    if (!lead) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    return HttpResponse.json(lead);
  }),

  http.delete(`${API}/leads/:id`, ({ params }) => {
    const existing = mockLeads.find((l) => l.id === params.id);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    const ok = deleteLead(String(params.id));
    if (!ok) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API}/leads/:id/timeline`, async ({ params, request }) => {
    const existing = mockLeads.find((l) => l.id === params.id);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    const body = (await request.json()) as { type?: string; description?: string };
    if (!body.type) {
      return HttpResponse.json({ statusCode: 400, message: "Tipo de contato é obrigatório" }, { status: 400 });
    }
    const lead = addTimelineEntry(String(params.id), body.type, body.description || "");
    if (!lead) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    return HttpResponse.json(lead, { status: 201 });
  }),

  http.post(`${API}/leads/:id/attachments`, async ({ params, request }) => {
    const existing = mockLeads.find((l) => l.id === params.id);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    const body = (await request.json()) as Attachment;
    const lead = addAttachment(String(params.id), {
      ...body,
      id: body.id || `a-${Date.now()}`,
      createdAt: body.createdAt || new Date().toISOString(),
    });
    if (!lead) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    return HttpResponse.json(lead, { status: 201 });
  }),

  http.delete(`${API}/leads/:id/attachments/:attachmentId`, ({ params }) => {
    const existing = mockLeads.find((l) => l.id === params.id);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    const lead = removeAttachment(String(params.id), String(params.attachmentId));
    if (!lead) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    return HttpResponse.json(lead);
  }),

  http.get(`${API}/kanban`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      buildKanban({
        ownerId: resolveOwnerScope(url.searchParams.get("ownerId")),
        origin: url.searchParams.get("origin") || undefined,
        priority: url.searchParams.get("priority") || undefined,
        tag: url.searchParams.get("tag") || undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
      }),
    );
  }),

  http.patch(`${API}/kanban/move`, async ({ request }) => {
    const body = (await request.json()) as { leadId: string; status: PipelineStage };
    const existing = mockLeads.find((l) => l.id === body.leadId);
    if (!existing) return HttpResponse.json({ statusCode: 404, message: "Lead não encontrado" }, { status: 404 });
    if (!canAccessLead(existing)) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão para este lead" }, { status: 403 });
    }
    updateLeadStatus(body.leadId, body.status);
    return HttpResponse.json(buildKanban({ ownerId: resolveOwnerScope(null) }));
  }),

  http.get(`${API}/legal/kanban`, () => HttpResponse.json(buildLegalKanban())),

  http.patch(`${API}/legal/move`, async ({ request }) => {
    const body = (await request.json()) as { leadId: string; status: "Backlog" | "Em andamento" | "Finalizado" };
    updateLegalStatus(body.leadId, body.status);
    return HttpResponse.json(buildLegalKanban());
  }),

  http.post(`${API}/leads/distribute`, async ({ request }) => {
    const body = (await request.json()) as {
      strategy: string;
      leadIds?: string[];
      ownerId?: string;
      tags?: string[];
    };
    const affected = distributeLeadsInStore(body);
    return HttpResponse.json({ ok: true, strategy: body.strategy, affected });
  }),

  http.get(`${API}/distribution-settings`, () => HttpResponse.json({ ...distributionSettings })),

  http.patch(`${API}/distribution-settings`, async ({ request }) => {
    if (currentUser.role !== Role.Administrador && currentUser.role !== Role.Gestor) {
      return HttpResponse.json({ statusCode: 403, message: "Sem permissão" }, { status: 403 });
    }
    const body = (await request.json()) as { defaultStrategy?: typeof distributionSettings.defaultStrategy };
    if (body.defaultStrategy) {
      distributionSettings.defaultStrategy = body.defaultStrategy;
    }
    return HttpResponse.json({ ...distributionSettings });
  }),

  http.get(`${API}/contracts`, ({ request }) => {
    const url = new URL(request.url);
    const leadId = url.searchParams.get("leadId");
    const data = leadId ? mockContracts.filter((c) => c.leadId === leadId) : [...mockContracts];
    return HttpResponse.json({ data, total: data.length, page: 1, pageSize: 50 });
  }),

  http.get(`${API}/contracts/:id`, ({ params }) => {
    const id = String(params.id);
    if (id === "templates" || id === "new") {
      return HttpResponse.json({ statusCode: 404, message: "Contrato não encontrado" }, { status: 404 });
    }
    const contract = mockContracts.find((c) => c.id === id);
    if (!contract) {
      return HttpResponse.json({ statusCode: 404, message: "Contrato não encontrado" }, { status: 404 });
    }
    return HttpResponse.json(contract);
  }),

  http.post(`${API}/contracts`, async ({ request }) => {
    const body = (await request.json()) as { leadId: string; templateId: string; value: number };
    const lead = mockLeads.find((l) => l.id === body.leadId);
    const template = mockTemplates.find((t) => t.id === body.templateId);
    if (!lead || !template) {
      return HttpResponse.json({ statusCode: 400, message: "Lead ou modelo inválido" }, { status: 400 });
    }
    const contract = {
      id: `c-${Date.now()}`,
      leadId: body.leadId,
      leadName: lead.name,
      templateId: body.templateId,
      templateName: template.name,
      status: "Rascunho" as const,
      value: body.value,
      createdAt: new Date().toISOString(),
    };
    const pdfId = generateContractPdf(contract, lead, template);
    const withPdf = { ...contract, pdfId };
    mockContracts.unshift(withPdf);
    return HttpResponse.json(withPdf, { status: 201 });
  }),

  http.patch(`${API}/contracts/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<(typeof mockContracts)[number]>;
    const index = mockContracts.findIndex((c) => c.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Contrato não encontrado" }, { status: 404 });
    mockContracts[index] = { ...mockContracts[index], ...body };
    return HttpResponse.json(mockContracts[index]);
  }),

  http.post(`${API}/contracts/:id/generate-pdf`, ({ params }) => {
    const index = mockContracts.findIndex((c) => c.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Contrato não encontrado" }, { status: 404 });
    const contract = mockContracts[index];
    const lead = mockLeads.find((l) => l.id === contract.leadId);
    const template = mockTemplates.find((t) => t.id === contract.templateId);
    if (!lead || !template) {
      return HttpResponse.json({ statusCode: 400, message: "Dados incompletos" }, { status: 400 });
    }
    const pdfId = generateContractPdf(contract, lead, template);
    mockContracts[index] = { ...contract, pdfId };
    return HttpResponse.json({ ...mockContracts[index], file: generatedPdfs.get(pdfId) });
  }),

  http.post(`${API}/contracts/:id/sign`, async ({ params, request }) => {
    const index = mockContracts.findIndex((c) => c.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Contrato não encontrado" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { signedDataUrl?: string; fileName?: string };
    let signedPdfId = mockContracts[index].signedPdfId;
    if (body.signedDataUrl) {
      signedPdfId = `signed-${params.id}`;
      generatedPdfs.set(signedPdfId, {
        id: signedPdfId,
        name: body.fileName || "contrato-assinado.pdf",
        mime: "application/pdf",
        dataUrl: body.signedDataUrl,
      });
    }
    mockContracts[index] = {
      ...mockContracts[index],
      status: "Assinado",
      signedAt: new Date().toISOString(),
      signedPdfId,
    };
    mockNotifications.unshift({
      id: `n-${Date.now()}`,
      title: "Contrato assinado",
      body: `${mockContracts[index].leadName} assinou o contrato.`,
      createdAt: new Date().toISOString(),
      read: false,
      href: `/contracts/${mockContracts[index].id}`,
    });
    return HttpResponse.json(mockContracts[index]);
  }),

  http.get(`${API}/files/:id`, ({ params }) => {
    const file = generatedPdfs.get(String(params.id));
    if (!file) return HttpResponse.json({ statusCode: 404, message: "Arquivo não encontrado" }, { status: 404 });
    return HttpResponse.json(file);
  }),

  http.get(`${API}/contract-templates`, () => HttpResponse.json({ data: mockTemplates })),

  http.post(`${API}/contract-templates`, async ({ request }) => {
    const body = (await request.json()) as Omit<ContractTemplate, "id">;
    const tpl: ContractTemplate = { ...body, id: `tpl-${Date.now()}` };
    mockTemplates.push(tpl);
    return HttpResponse.json(tpl, { status: 201 });
  }),

  http.patch(`${API}/contract-templates/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<ContractTemplate>;
    const index = mockTemplates.findIndex((t) => t.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Modelo não encontrado" }, { status: 404 });
    mockTemplates[index] = { ...mockTemplates[index], ...body };
    return HttpResponse.json(mockTemplates[index]);
  }),

  http.delete(`${API}/contract-templates/:id`, ({ params }) => {
    const index = mockTemplates.findIndex((t) => t.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Modelo não encontrado" }, { status: 404 });
    mockTemplates.splice(index, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/payments`, () =>
    HttpResponse.json({ data: mockPayments, total: mockPayments.length, page: 1, pageSize: 50 }),
  ),

  http.get(`${API}/payments/:id`, ({ params }) => {
    const payment = mockPayments.find((p) => p.id === params.id);
    if (!payment) return HttpResponse.json({ statusCode: 404, message: "Pagamento não encontrado" }, { status: 404 });
    return HttpResponse.json(payment);
  }),

  http.patch(`${API}/payments/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<(typeof mockPayments)[number]>;
    const index = mockPayments.findIndex((p) => p.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Pagamento não encontrado" }, { status: 404 });
    mockPayments[index] = { ...mockPayments[index], ...body };
    if (body.status === "Recebido") {
      mockPayments[index].paidAt = body.paidAt || new Date().toISOString();
      const rule =
        mockCommissionRules.find((r) => r.active) ||
        mockCommissionRules.find((r) => r.type === "percentual_meta") ||
        mockCommissionRules[0];
      const contract = mockContracts.find((c) => c.id === mockPayments[index].contractId);
      const lead = mockLeads.find((l) => l.id === (mockPayments[index].leadId || contract?.leadId));
      const owner = mockUsers.find((u) => u.id === lead?.ownerId) || mockUsers[1];
      const period = new Date().toISOString().slice(0, 7);

      // Acumula vendas recebidas do consultor no período (meta acumulada)
      const ownerPeriodTotal = mockPayments
        .filter((p) => {
          if (p.status !== "Recebido") return false;
          const paidPeriod = (p.paidAt || p.dueDate || "").slice(0, 7);
          if (paidPeriod !== period) return false;
          const c = mockContracts.find((ct) => ct.id === p.contractId);
          const l = mockLeads.find((ld) => ld.id === (p.leadId || c?.leadId));
          return l?.ownerId === owner.id;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const amount =
        rule.type === "percentual_meta"
          ? calculateCommission(ownerPeriodTotal, rule)
          : calculateCommission(mockPayments[index].amount, rule);

      if (rule.type === "percentual_meta") {
        const existing = mockCommissions.findIndex(
          (c) => c.userId === owner.id && c.period === period && c.status === "A pagar",
        );
        if (amount > 0) {
          const entry = {
            id: existing >= 0 ? mockCommissions[existing].id : `cm-${Date.now()}`,
            userId: owner.id,
            userName: owner.name,
            amount,
            period,
            status: "A pagar" as const,
            paymentId: mockPayments[index].id,
          };
          if (existing >= 0) mockCommissions[existing] = entry;
          else mockCommissions.unshift(entry);
        } else if (existing >= 0) {
          mockCommissions.splice(existing, 1);
        }
      } else if (amount > 0) {
        mockCommissions.unshift({
          id: `cm-${Date.now()}`,
          userId: owner.id,
          userName: owner.name,
          amount,
          period,
          status: "A pagar",
          paymentId: mockPayments[index].id,
        });
      }

      mockNotifications.unshift({
        id: `n-${Date.now()}`,
        title: "Pagamento confirmado",
        body:
          rule.type === "percentual_meta"
            ? amount > 0
              ? `Recebimento confirmado. Acumulado do período: R$ ${ownerPeriodTotal}. Comissão: R$ ${amount}.`
              : `Recebimento confirmado. Acumulado do período: R$ ${ownerPeriodTotal} (ainda abaixo da meta).`
            : amount > 0
              ? `Recebimento de R$ ${mockPayments[index].amount} confirmado. Comissão: R$ ${amount}.`
              : `Recebimento de R$ ${mockPayments[index].amount} confirmado.`,
        createdAt: new Date().toISOString(),
        read: false,
        href: `/financial?paymentId=${mockPayments[index].id}`,
      });
    }
    return HttpResponse.json(mockPayments[index]);
  }),

  http.get(`${API}/commissions`, () => HttpResponse.json({ data: mockCommissions })),

  http.get(`${API}/commission-rules`, () => HttpResponse.json({ data: mockCommissionRules })),

  http.post(`${API}/commission-rules`, async ({ request }) => {
    const body = (await request.json()) as Omit<CommissionRule, "id">;
    const rule = { ...body, id: `r-${Date.now()}` };
    if (rule.active) {
      mockCommissionRules.forEach((r) => {
        r.active = false;
      });
    }
    mockCommissionRules.push(rule);
    return HttpResponse.json(rule, { status: 201 });
  }),

  http.patch(`${API}/commission-rules/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<CommissionRule>;
    const index = mockCommissionRules.findIndex((r) => r.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Regra não encontrada" }, { status: 404 });
    if (body.active) {
      mockCommissionRules.forEach((r) => {
        r.active = false;
      });
    }
    mockCommissionRules[index] = { ...mockCommissionRules[index], ...body };
    return HttpResponse.json(mockCommissionRules[index]);
  }),

  http.delete(`${API}/commission-rules/:id`, ({ params }) => {
    const index = mockCommissionRules.findIndex((r) => r.id === params.id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Regra não encontrada" }, { status: 404 });
    mockCommissionRules.splice(index, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/dashboard/me`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    let leads = mockLeads;
    if (from) leads = leads.filter((l) => l.createdAt >= from);
    return HttpResponse.json({
      activeLeads: leads.filter((l) => l.status !== "Concluído").length,
      closedLeads: leads.filter((l) => l.status === "Concluído").length,
      conversion: 18.4,
      soldValue: leads.reduce((s, l) => s + l.process.totalValue, 0),
      goal: 150000,
      commission: mockCommissions.reduce((s, c) => s + c.amount, 0),
      avgCloseDays: 14,
      funnel: funnel(),
      goalSeries: [
        { month: "Fev", goal: 120000, actual: 98000 },
        { month: "Mar", goal: 130000, actual: 110000 },
        { month: "Abr", goal: 140000, actual: 125000 },
        { month: "Mai", goal: 140000, actual: 132000 },
        { month: "Jun", goal: 150000, actual: 141000 },
        { month: "Jul", goal: 150000, actual: leads.reduce((s, l) => s + l.process.totalValue, 0) },
      ],
    });
  }),

  http.get(`${API}/dashboard/admin`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    let leads = mockLeads;
    if (from) leads = leads.filter((l) => l.createdAt >= from);
    return HttpResponse.json({
      leadsReceived: leads.length * 40 + 100,
      conversion: 18.4,
      revenue: leads.reduce((s, l) => s + l.process.totalValue, 0) * 12,
      avgTicket: 8450,
      avgCloseDays: 14,
      signedContracts: mockContracts.filter((c) => c.status === "Assinado").length,
      pendingContracts: mockContracts.filter((c) => c.status !== "Assinado" && c.status !== "Arquivado").length,
      leadsByOrigin: [
        { origin: "Google Ads", value: leads.filter((l) => l.origin === "Google Ads").length || 1 },
        { origin: "Indicação", value: leads.filter((l) => l.origin === "Indicação").length || 1 },
        { origin: "Orgânico", value: 18 },
        { origin: "Parceiros", value: 12 },
      ],
      monthlyRevenue: [
        { month: "Fev", value: 280000 },
        { month: "Mar", value: 310000 },
        { month: "Abr", value: 295000 },
        { month: "Mai", value: 340000 },
        { month: "Jun", value: 360000 },
        { month: "Jul", value: leads.reduce((s, l) => s + l.process.totalValue, 0) * 5 },
      ],
      topPerformers: [
        { name: "Carla Mendes", conversion: 24, revenue: 420000 },
        { name: "Bruno Lima", conversion: 19, revenue: 310000 },
      ],
    });
  }),

  http.get(`${API}/reports/export`, ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "csv";
    const rows = mockLeads.map((l) => ({
      date: l.createdAt,
      lead: l.name,
      value: l.process.totalValue,
      status: l.status,
      owner: l.ownerName,
      origin: l.origin,
    }));
    const csv = [
      "date,lead,value,status,owner,origin",
      ...rows.map((r) => `${r.date},${r.lead},${r.value},${r.status},${r.owner},${r.origin}`),
    ].join("\n");
    const dataUrl =
      format === "pdf"
        ? `data:text/html;charset=utf-8,${encodeURIComponent(`<h1>Relatório</h1><pre>${csv}</pre>`)}`
        : `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    return HttpResponse.json({
      status: "ready",
      format,
      downloadUrl: dataUrl,
      fileName: `relatorio-cypher-ops.${format === "excel" ? "csv" : format === "pdf" ? "html" : "csv"}`,
      rows,
    });
  }),

  http.get(`${API}/users`, () =>
    HttpResponse.json({
      data: mockUsers.map((u) => {
        const { password, ...rest } = u;
        void password;
        return rest;
      }),
    }),
  ),

  http.post(`${API}/users`, async ({ request }) => {
    const body = (await request.json()) as Omit<AppUser, "id" | "password" | "mustChangePassword"> & {
      password?: string;
    };
    const password = body.password || defaultPasswordFromName(body.name);
    const user: AppUser = {
      ...body,
      id: `u-${Date.now()}`,
      password,
      mustChangePassword: true,
    };
    mockUsers.push(user);
    const { password: removed, ...safe } = user;
    void removed;
    return HttpResponse.json({ ...safe, temporaryPassword: password }, { status: 201 });
  }),

  http.patch(`${API}/users/:id`, async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as Partial<AppUser>;
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index < 0) return HttpResponse.json({ statusCode: 404, message: "Usuário não encontrado" }, { status: 404 });

    if (body.status === "Inativo") {
      const check = canDeactivateUser(id, currentUser.id);
      if (!check.ok) {
        return HttpResponse.json({ statusCode: 400, message: check.message }, { status: 400 });
      }
    }

    const next = { ...body };
    delete next.password;
    mockUsers[index] = { ...mockUsers[index], ...next };
    const { password: removed, ...safe } = mockUsers[index];
    void removed;
    return HttpResponse.json(safe);
  }),

  http.delete(`${API}/users/:id`, ({ params }) => {
    const result = deleteUser(String(params.id), currentUser.id);
    if (!result.ok) {
      return HttpResponse.json({ statusCode: 400, message: result.message }, { status: 400 });
    }
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/roles`, () =>
    HttpResponse.json({
      data: Object.entries(mockRolePermissions).map(([name, permissions]) => ({ name, permissions })),
    }),
  ),

  http.patch(`${API}/roles/:name/permissions`, async ({ params, request }) => {
    const name = decodeURIComponent(String(params.name)) as RoleName;
    const body = (await request.json()) as { permissions: Permission[] };
    if (!mockRolePermissions[name]) {
      return HttpResponse.json({ statusCode: 404, message: "Perfil não encontrado" }, { status: 404 });
    }
    mockRolePermissions[name] = body.permissions;
    if (currentUser.role === name) {
      currentUser.permissions = [...body.permissions];
    }
    return HttpResponse.json({ name, permissions: mockRolePermissions[name] });
  }),

  http.get(`${API}/notifications`, () => HttpResponse.json({ data: mockNotifications })),

  http.patch(`${API}/notifications/:id/read`, ({ params }) => {
    const item = mockNotifications.find((n) => n.id === params.id);
    if (!item) return HttpResponse.json({ statusCode: 404, message: "Notificação não encontrada" }, { status: 404 });
    item.read = true;
    return HttpResponse.json(item);
  }),

  http.post(`${API}/notifications/read-all`, () => {
    mockNotifications.forEach((n) => {
      n.read = true;
    });
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const scopedLeads =
      currentUser.role === Role.Comercial
        ? mockLeads.filter((l) => l.ownerId === currentUser.id)
        : mockLeads;
    return HttpResponse.json({
      leads: scopedLeads
        .filter((l) => l.name.toLowerCase().includes(q) || l.cpf.includes(q) || l.email.toLowerCase().includes(q))
        .slice(0, 5),
      contracts: mockContracts
        .filter((c) => c.leadName.toLowerCase().includes(q) || c.id.includes(q))
        .slice(0, 5),
    });
  }),
];
