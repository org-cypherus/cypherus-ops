import { http, HttpResponse } from "msw";
import { UI_TO_API_PERMISSION } from "@/lib/auth/mappers";
import { ROLE_PERMISSIONS, type RoleName } from "@/lib/auth/permissions";
import { uiPriorityToApi, uiStageToApiStatus } from "@/modules/leads/adapters";
import {
  buildKanban,
  buildSessionUser,
  createLead,
  currentUser,
  deleteLead,
  getCompanyById,
  getSubscriptionByCompanyId,
  mockCompanies,
  mockCommissionRules,
  mockCommissions,
  mockContracts,
  mockFeatureCatalog,
  mockFeatureOverrides,
  mockLeads,
  mockPayments,
  mockPlans,
  mockTemplates,
  mockUsers,
  patchLead,
  resolveMockCompanyFeatures,
  toCompanyResponse,
  updateLeadStatus,
  type Contract as MockContract,
  type ContractTemplate as MockTemplate,
} from "./data";
import type { Lead } from "@/modules/leads/types";

const API = "/api/bff";

const CONTRACT_UI_TO_STATUS: Record<string, string> = {
  Rascunho: "DRAFT",
  Enviado: "GENERATED",
  Assinado: "SIGNED",
  Arquivado: "ARCHIVED",
};

function crmError(status: number, code: string, message: string) {
  return HttpResponse.json({ error: { code, message }, request_id: "mock" }, { status });
}

function toCrmUser(user: (typeof mockUsers)[number]) {
  return {
    id: user.id,
    company_id: user.companyId,
    name: user.name,
    email: user.email,
    status: user.status === "Ativo" ? "ACTIVE" : "INACTIVE",
    is_owner: user.role === "Administrador",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    mfa_enabled: false,
    last_login_at: null,
    created_at: user.createdAt || "2026-01-15T12:00:00.000Z",
    updated_at: user.createdAt || "2026-01-15T12:00:00.000Z",
  };
}

function toCrmLead(lead: Lead) {
  return {
    id: lead.id,
    company_id: currentUser.companyId,
    owner_user_id: lead.ownerId,
    name: lead.name,
    cpf: lead.cpf,
    rg: lead.rg ?? null,
    birth_date: lead.birthDate ?? null,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    zip_code: lead.address.cep,
    street: lead.address.street,
    number: lead.address.number,
    neighborhood: lead.address.neighborhood,
    city: lead.address.city,
    state: lead.address.state,
    source: lead.origin,
    campaign: lead.campaign,
    channel: lead.channel,
    status: uiStageToApiStatus(lead.status) ?? "NEW",
    priority: uiPriorityToApi(lead.priority) ?? "MEDIUM",
    tags: lead.tags,
    process: {
      ...lead.process,
      potential_value: lead.process.totalValue,
      value: lead.process.totalValue,
    },
    pipeline_stage_id: null,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt || lead.createdAt,
  };
}

function toCrmContract(contract: MockContract) {
  const version = contract.pdfId ? 1 : 0;
  return {
    id: contract.id,
    company_id: currentUser.companyId,
    lead_id: contract.leadId,
    template_id: contract.templateId,
    title: contract.templateName,
    status: CONTRACT_UI_TO_STATUS[contract.status] ?? "DRAFT",
    data: { valor: String(contract.value), value: String(contract.value) },
    current_version: version,
    signed_attachment_id: contract.signedPdfId ?? null,
    created_at: contract.createdAt,
    updated_at: contract.createdAt,
    signed_at: contract.signedAt ?? null,
    archived_at: null,
    versions: contract.pdfId
      ? [{ version: 1, attachment_id: contract.pdfId, created_at: contract.createdAt }]
      : [],
  };
}

function toCrmTemplate(template: MockTemplate) {
  return {
    id: template.id,
    company_id: currentUser.companyId,
    name: template.name,
    body: template.body,
    placeholders: template.placeholders.map((key) => key.replace(/^\{\{\s*|\s*\}\}$/g, "")),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mePayload(user = currentUser) {
  return {
    user: {
      id: user.id,
      company_id: user.companyId,
      name: user.name,
      email: user.email,
      status: "ACTIVE",
      is_owner: user.role === "Administrador",
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      mfa_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    company_id: user.companyId,
    permissions: (ROLE_PERMISSIONS[user.role] ?? user.permissions)
      .map((permission) => UI_TO_API_PERMISSION[permission])
      .filter(Boolean)
      .map((permission) => ({ permission, granted: true, scope: "COMPANY", source: "ROLE" })),
  };
}

const ROLES = [
  { id: "role-admin", code: "ADMIN", name: "Administrador" },
  { id: "role-manager", code: "MANAGER", name: "Gestor" },
  { id: "role-sales", code: "SALES", name: "Comercial" },
  { id: "role-finance", code: "FINANCE", name: "Financeiro" },
];

export const handlers = [
  http.post(`${API}/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = mockUsers.find((item) => item.email.toLowerCase() === body.email?.toLowerCase());
    if (!user || user.password !== body.password || user.status !== "Ativo") {
      return crmError(401, "AUTHENTICATION_FAILED", "Credenciais inválidas.");
    }
    Object.assign(currentUser, buildSessionUser(user));
    return HttpResponse.json({
      access_token: "mock-access",
      refresh_token: "mock-refresh",
      token_type: "bearer",
      expires_in: 3600,
      user: toCrmUser(user),
    });
  }),

  http.post(`${API}/v1/auth/refresh`, () =>
    HttpResponse.json({
      access_token: "mock-access",
      refresh_token: "mock-refresh",
      token_type: "bearer",
      expires_in: 3600,
      user: mePayload().user,
    }),
  ),

  http.post(`${API}/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/v1/me`, () => HttpResponse.json(mePayload())),

  http.get(`${API}/v1/plans`, () => HttpResponse.json(mockPlans)),

  http.get(`${API}/v1/plans/:planId`, ({ params }) => {
    const plan = mockPlans.find((item) => item.id === params.planId);
    if (!plan) return crmError(404, "PLAN_NOT_FOUND", "Plano não encontrado.");
    return HttpResponse.json(plan);
  }),

  http.patch(`${API}/v1/plans/:planId`, async ({ params, request }) => {
    const plan = mockPlans.find((item) => item.id === params.planId);
    if (!plan) return crmError(404, "PLAN_NOT_FOUND", "Plano não encontrado.");
    const body = (await request.json()) as { name?: string; price?: number | string; is_active?: boolean };
    if (body.name) plan.name = body.name;
    if (body.price !== undefined) plan.price = String(body.price);
    if (body.is_active !== undefined) plan.is_active = body.is_active;
    return HttpResponse.json(plan);
  }),

  http.get(`${API}/v1/features`, () => HttpResponse.json(mockFeatureCatalog)),

  http.get(`${API}/v1/companies`, () =>
    HttpResponse.json(mockCompanies.map((company) => toCompanyResponse(company))),
  ),

  http.get(`${API}/v1/companies/:companyId`, ({ params }) => {
    const company = getCompanyById(String(params.companyId));
    if (!company) return crmError(404, "COMPANY_NOT_FOUND", "Empresa não encontrada.");
    return HttpResponse.json(toCompanyResponse(company));
  }),

  http.patch(`${API}/v1/companies/:companyId/status`, async ({ params, request }) => {
    const company = getCompanyById(String(params.companyId));
    if (!company) return crmError(404, "COMPANY_NOT_FOUND", "Empresa não encontrada.");
    const body = (await request.json()) as { status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
    if (body.status) company.status = body.status;
    return HttpResponse.json(toCompanyResponse(company));
  }),

  http.get(`${API}/v1/companies/:companyId/features`, ({ params }) =>
    HttpResponse.json(resolveMockCompanyFeatures(String(params.companyId))),
  ),

  http.put(`${API}/v1/companies/:companyId/overrides`, async ({ params, request }) => {
    const companyId = String(params.companyId);
    const body = (await request.json()) as {
      feature_id: string;
      enabled: boolean;
      limit_value?: number | null;
      is_unlimited?: boolean;
    };
    const existing = mockFeatureOverrides.find(
      (item) => item.companyId === companyId && item.featureId === body.feature_id,
    );
    if (existing) {
      existing.enabled = body.enabled;
      existing.limit_value = body.limit_value ?? null;
      existing.is_unlimited = Boolean(body.is_unlimited);
    } else {
      mockFeatureOverrides.push({
        companyId,
        featureId: body.feature_id,
        enabled: body.enabled,
        limit_value: body.limit_value ?? null,
        is_unlimited: Boolean(body.is_unlimited),
      });
    }
    return HttpResponse.json({
      company_id: companyId,
      feature_id: body.feature_id,
      enabled: body.enabled,
    });
  }),

  http.get(`${API}/v1/companies/:companyId/subscriptions/current`, ({ params }) => {
    const subscription = getSubscriptionByCompanyId(String(params.companyId));
    if (!subscription) return crmError(404, "SUBSCRIPTION_NOT_FOUND", "Assinatura vigente não encontrada.");
    const plan = mockPlans.find((item) => item.code === subscription.planCode);
    return HttpResponse.json({
      id: subscription.id,
      company_id: subscription.companyId,
      plan_id: plan?.id,
      status: subscription.status,
      is_current: true,
    });
  }),

  http.patch(`${API}/v1/companies/:companyId/subscriptions/current`, async ({ params, request }) => {
    const subscription = getSubscriptionByCompanyId(String(params.companyId));
    if (!subscription) return crmError(404, "SUBSCRIPTION_NOT_FOUND", "Assinatura vigente não encontrada.");
    const body = (await request.json()) as { status?: string };
    if (body.status === "CANCELLED" || body.status === "EXPIRED") {
      return crmError(422, "VALIDATION_ERROR", "O status da assinatura vigente deve ser TRIAL, ACTIVE ou PAST_DUE.");
    }
    if (body.status === "TRIAL" || body.status === "ACTIVE" || body.status === "PAST_DUE") {
      subscription.status = body.status;
    }
    const plan = mockPlans.find((item) => item.code === subscription.planCode);
    return HttpResponse.json({
      id: subscription.id,
      company_id: subscription.companyId,
      plan_id: plan?.id,
      status: subscription.status,
      is_current: true,
    });
  }),

  http.post(`${API}/v1/companies/:companyId/subscriptions/current/change-plan`, async ({ params, request }) => {
    const subscription = getSubscriptionByCompanyId(String(params.companyId));
    if (!subscription) return crmError(404, "SUBSCRIPTION_NOT_FOUND", "Assinatura vigente não encontrada.");
    const body = (await request.json()) as { plan_id?: string };
    const plan = mockPlans.find((item) => item.id === body.plan_id);
    if (!plan) return crmError(404, "PLAN_NOT_FOUND", "Plano não encontrado.");
    if (plan.code === subscription.planCode) {
      return crmError(422, "VALIDATION_ERROR", "A empresa já está neste plano.");
    }
    subscription.planCode = plan.code;
    subscription.status = "ACTIVE";
    return HttpResponse.json({
      id: subscription.id,
      company_id: subscription.companyId,
      plan_id: plan.id,
      status: subscription.status,
      is_current: true,
    });
  }),

  http.get(`${API}/v1/companies/:companyId/users`, () => HttpResponse.json(mockUsers.map(toCrmUser))),

  http.get(`${API}/v1/companies/:companyId/users/:userId`, ({ params }) => {
    const user = mockUsers.find((item) => item.id === params.userId);
    if (!user) return crmError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
    return HttpResponse.json({ ...toCrmUser(user), phone: user.phone, job_title: user.team });
  }),

  http.get(`${API}/v1/companies/:companyId/users/:userId/roles`, ({ params }) => {
    const user = mockUsers.find((item) => item.id === params.userId);
    const role = ROLES.find((item) => item.name === user?.role) ?? ROLES[2];
    return HttpResponse.json([role]);
  }),

  http.get(`${API}/v1/companies/:companyId/users/:userId/permissions`, ({ params }) => {
    const user = mockUsers.find((item) => item.id === params.userId);
    const permissions = ROLE_PERMISSIONS[(user?.role as RoleName) ?? "Comercial"] ?? [];
    return HttpResponse.json(
      permissions
        .map((permission) => UI_TO_API_PERMISSION[permission])
        .filter(Boolean)
        .map((permission) => ({
          permission,
          granted: true,
          scope: "COMPANY",
          source: "ROLE",
        })),
    );
  }),

  http.get(`${API}/v1/companies/:companyId/users/:userId/overrides`, () => HttpResponse.json([])),

  http.put(`${API}/v1/companies/:companyId/users/:userId/overrides`, async ({ params, request }) => {
    const body = (await request.json()) as {
      permission_key?: string;
      effect?: "ALLOW" | "DENY";
      scope?: string | null;
      reason?: string | null;
    };
    return HttpResponse.json({
      user_id: params.userId,
      permission_key: body.permission_key ?? "leads.view",
      effect: body.effect ?? "ALLOW",
      scope: body.scope ?? "COMPANY",
      reason: body.reason ?? null,
      expires_at: null,
      created_at: new Date().toISOString(),
    });
  }),

  http.get(`${API}/v1/companies/:companyId/roles`, () => HttpResponse.json(ROLES)),

  http.get(`${API}/v1/companies/:companyId/roles/:roleId/permissions`, ({ params }) => {
    const role = ROLES.find((item) => item.id === params.roleId);
    const keys = (ROLE_PERMISSIONS[(role?.name as RoleName) ?? "Comercial"] ?? [])
      .map((permission) => UI_TO_API_PERMISSION[permission])
      .filter(Boolean);
    return HttpResponse.json(keys.map((permission_key) => ({ permission_key, scope: "COMPANY" })));
  }),

  http.get(`${API}/v1/companies/:companyId/leads`, () =>
    HttpResponse.json({ items: mockLeads.map(toCrmLead), next_cursor: null }),
  ),

  http.get(`${API}/v1/companies/:companyId/leads/:leadId`, ({ params }) => {
    const lead = mockLeads.find((item) => item.id === params.leadId);
    if (!lead) return crmError(404, "LEAD_NOT_FOUND", "Lead não encontrado.");
    return HttpResponse.json(toCrmLead(lead));
  }),

  http.get(`${API}/v1/companies/:companyId/leads/:leadId/events`, () => HttpResponse.json([])),
  http.get(`${API}/v1/companies/:companyId/leads/:leadId/attachments`, () => HttpResponse.json([])),
  http.get(`${API}/v1/companies/:companyId/leads/:leadId/contracts`, ({ params }) =>
    HttpResponse.json(
      mockContracts.filter((item) => item.leadId === params.leadId).map(toCrmContract),
    ),
  ),

  http.post(`${API}/v1/companies/:companyId/leads`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; cpf: string; owner_user_id: string };
    const lead = createLead({
      name: body.name,
      email: body.email,
      cpf: body.cpf,
      ownerId: body.owner_user_id,
      phone: "",
      whatsapp: "",
      origin: "",
      campaign: "",
      channel: "",
      ownerName: "",
      createdAt: new Date().toISOString(),
      status: "Novo Lead",
      priority: "media",
      tags: [],
      process: { totalValue: 0 },
      daysInStage: 0,
      timeline: [],
      attachments: [],
      address: { cep: "", street: "", number: "", neighborhood: "", city: "", state: "" },
    });
    return HttpResponse.json(toCrmLead(lead), { status: 201 });
  }),

  http.patch(`${API}/v1/companies/:companyId/leads/:leadId`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const lead = patchLead(String(params.leadId), {
      name: body.name as string | undefined,
      email: body.email as string | undefined,
      phone: body.phone as string | undefined,
      observations: (body.process as { observations?: string } | undefined)?.observations,
    });
    if (!lead) return crmError(404, "LEAD_NOT_FOUND", "Lead não encontrado.");
    return HttpResponse.json(toCrmLead(lead));
  }),

  http.patch(`${API}/v1/companies/:companyId/leads/:leadId/stage`, async ({ params, request }) => {
    const body = (await request.json()) as { stage_id?: string };
    const board = buildKanban();
    const column = board.columns.find((col) => col.status === body.stage_id) ?? board.columns[0];
    updateLeadStatus(String(params.leadId), column.status);
    const lead = mockLeads.find((item) => item.id === params.leadId);
    if (!lead) return crmError(404, "LEAD_NOT_FOUND", "Lead não encontrado.");
    return HttpResponse.json(toCrmLead(lead));
  }),

  http.delete(`${API}/v1/companies/:companyId/leads/:leadId`, ({ params }) => {
    deleteLead(String(params.leadId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/v1/companies/:companyId/pipelines`, () =>
    HttpResponse.json([
      {
        id: "pipeline-default",
        name: "Comercial",
        is_default: true,
        stages: buildKanban().columns.map((column, index) => ({
          id: column.status,
          name: column.status,
          sort_order: index,
          status: uiStageToApiStatus(column.status),
        })),
      },
    ]),
  ),

  http.get(`${API}/v1/companies/:companyId/pipelines/:pipelineId/board`, () => {
    const board = buildKanban();
    return HttpResponse.json({
      id: "pipeline-default",
      name: "Comercial",
      columns: board.columns.map((column, index) => ({
        id: column.status,
        name: column.status,
        sort_order: index,
        status: uiStageToApiStatus(column.status),
        lead_count: column.count,
        potential_value: column.potentialValue,
        has_more: false,
        leads: column.leads.map(toCrmLead),
      })),
    });
  }),

  http.get(`${API}/v1/companies/:companyId/dashboard/me`, () =>
    HttpResponse.json({
      leads_in_period: mockLeads.length,
      converted_count: 1,
      conversion_rate: 10,
      funnel: buildKanban().columns.map((column) => ({
        name: column.status,
        lead_count: column.count,
        potential_value: column.potentialValue,
      })),
      performance: [
        {
          owner_user_id: mockUsers[0]?.id ?? "u1",
          lead_count: 5,
          converted_count: 2,
          conversion_rate: 40,
          potential_value: 12000,
        },
        {
          owner_user_id: mockUsers[1]?.id ?? "u2",
          lead_count: 3,
          converted_count: 1,
          conversion_rate: 33.33,
          potential_value: 4500,
        },
      ],
    }),
  ),

  http.get(`${API}/v1/companies/:companyId/dashboard/admin`, () =>
    HttpResponse.json({
      from: "2026-07-22",
      to: "2026-08-21",
      leads_received: mockLeads.length,
      leads_by_origin: [{ source: "Google", lead_count: mockLeads.length }],
      contracts_signed: 1,
      contracts_pending: 0,
      overdue_count: 0,
      overdue_amount: 0,
      revenue: 2000,
      revenue_by_month: [
        { month: "2026-07", amount: 500, count: 1 },
        { month: "2026-08", amount: 1500, count: 2 },
      ],
      ticket_average: 1000,
      active_users: 1,
      performance: [
        {
          owner_user_id: mockUsers[0]?.id ?? "u1",
          lead_count: 5,
          converted_count: 2,
          conversion_rate: 40,
          potential_value: 12000,
        },
        {
          owner_user_id: mockUsers[1]?.id ?? "u2",
          lead_count: 3,
          converted_count: 1,
          conversion_rate: 33.33,
          potential_value: 4500,
        },
      ],
    }),
  ),

  http.get(`${API}/v1/companies/:companyId/payments`, () =>
    HttpResponse.json(
      mockPayments.map((payment) => ({
        id: payment.id,
        company_id: currentUser.companyId,
        contract_id: payment.contractId,
        lead_id: payment.leadId,
        amount: payment.amount,
        due_date: payment.dueDate.slice(0, 10),
        status:
          payment.status === "Recebido"
            ? "CONFIRMED"
            : payment.status === "Atrasado"
              ? "OVERDUE"
              : "PENDING",
        paid_at: payment.paidAt ?? null,
        created_at: payment.dueDate,
        commission_id: payment.id === "p1" ? "cm1" : null,
      })),
    ),
  ),
  http.get(`${API}/v1/companies/:companyId/commissions`, () =>
    HttpResponse.json(
      mockCommissions.map((commission) => ({
        id: commission.id,
        company_id: currentUser.companyId,
        payment_id: commission.paymentId || "p1",
        contract_id: "c1",
        beneficiary_user_id: commission.userId,
        kind: commission.status === "Fixa" ? "FIXED" : "PERCENT",
        base_amount: commission.amount * 10,
        rate: commission.status === "Fixa" ? null : 10,
        amount: commission.amount,
        created_at: `${commission.period || "2026-07"}-15T12:00:00.000Z`,
      })),
    ),
  ),
  http.get(`${API}/v1/companies/:companyId/commission-rules`, () =>
    HttpResponse.json(
      mockCommissionRules.map((rule) => ({
        id: rule.id,
        company_id: currentUser.companyId,
        name: rule.plan,
        kind: rule.type === "taxa" ? "FIXED" : "PERCENT",
        rate: rule.type === "taxa" ? null : rule.value,
        amount: rule.type === "taxa" ? rule.value : null,
        is_active: Boolean(rule.active),
      })),
    ),
  ),
  http.get(`${API}/v1/companies/:companyId/contracts`, () =>
    HttpResponse.json(mockContracts.map(toCrmContract)),
  ),
  http.get(`${API}/v1/companies/:companyId/contracts/:contractId`, ({ params }) => {
    const contract = mockContracts.find((item) => item.id === params.contractId);
    if (!contract) return crmError(404, "CONTRACT_NOT_FOUND", "Contrato não encontrado.");
    return HttpResponse.json(toCrmContract(contract));
  }),
  http.get(`${API}/v1/companies/:companyId/contract-templates`, () =>
    HttpResponse.json(mockTemplates.map(toCrmTemplate)),
  ),
  http.get(`${API}/v1/companies/:companyId/distribution/rules`, () => HttpResponse.json([])),

  http.post(`${API}/v1/companies`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      {
        id: "company-new",
        name: body.name,
        status: "ACTIVE",
        invitation_token: "mock-invite",
      },
      { status: 201 },
    );
  }),

  http.post(`${API}/v1/auth/invitations/accept`, async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string };
    if (!body.token?.trim()) {
      return crmError(401, "AUTHENTICATION_FAILED", "Token de convite inválido ou expirado.");
    }
    if (!body.password || body.password.length < 8) {
      return crmError(422, "VALIDATION_ERROR", "A senha deve ter no mínimo 8 caracteres.");
    }
    return HttpResponse.json(
      {
        access_token: "mock-access",
        refresh_token: "mock-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: mePayload().user,
      },
      { status: 201 },
    );
  }),

  http.get(`${API}/v1/health/live`, () => HttpResponse.json({ status: "ok", service: "saas-crm" })),
];
