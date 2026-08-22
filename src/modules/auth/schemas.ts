import { z } from "zod";
import { isValidCnpj, onlyDigits } from "@/lib/utils/document";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const passwordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .max(72, "Senha muito longa")
  .refine((value) => /[A-Z]/.test(value), "Inclua ao menos uma letra maiúscula")
  .refine((value) => /[a-z]/.test(value), "Inclua ao menos uma letra minúscula")
  .refine((value) => /\d/.test(value), "Inclua ao menos um número");

export const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(1, "Informe o token de convite"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

const personNameSchema = z
  .string()
  .trim()
  .min(3, "Informe um nome válido")
  .max(120, "Nome muito longo")
  .refine((value) => /^[\p{L}\s'.-]+$/u.test(value), "Use apenas letras e espaços")
  .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome");

const companyNameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome comercial")
  .max(120, "Nome muito longo")
  .refine((value) => /[\p{L}\d]/u.test(value), "Informe um nome válido");

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail")
  .email("E-mail inválido")
  .max(160, "E-mail muito longo");

export const signupCompanySchema = z.object({
  companyName: companyNameSchema,
  legalName: z
    .string()
    .trim()
    .min(2, "Informe a razão social")
    .max(160, "Razão social muito longa")
    .refine((value) => /[\p{L}\d]/u.test(value), "Informe uma razão social válida"),
  document: z
    .string()
    .min(1, "Informe o CNPJ")
    .refine((value) => onlyDigits(value).length === 14, "CNPJ deve ter 14 dígitos")
    .refine((value) => isValidCnpj(value), "CNPJ inválido"),
});

export const signupAdminFieldsSchema = z.object({
  adminName: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme a senha"),
});

export const signupAdminSchema = signupAdminFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  },
);

export const signupPlanSchema = z.object({
  planCode: z.enum(["ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"], {
    required_error: "Selecione um plano",
  }),
  billingInterval: z.enum(["MONTHLY", "YEARLY"], {
    required_error: "Selecione a periodicidade",
  }),
});

export const signupSchema = signupCompanySchema
  .merge(signupAdminFieldsSchema)
  .merge(signupPlanSchema)
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
export type SignupCompanyValues = z.infer<typeof signupCompanySchema>;
export type SignupAdminValues = z.infer<typeof signupAdminSchema>;
export type SignupPlanValues = z.infer<typeof signupPlanSchema>;
export type PlanCode = SignupFormValues["planCode"];

export const planCodeFromQuery: Record<string, PlanCode> = {
  essencial: "ESSENTIAL",
  profissional: "PROFESSIONAL",
  enterprise: "ENTERPRISE",
  ESSENTIAL: "ESSENTIAL",
  PROFESSIONAL: "PROFESSIONAL",
  ENTERPRISE: "ENTERPRISE",
};

export function resolvePlanCode(input?: string | null): PlanCode {
  if (!input) return "PROFESSIONAL";
  return planCodeFromQuery[input] ?? "PROFESSIONAL";
}

export const signupSteps = [
  { id: "company", label: "Empresa" },
  { id: "admin", label: "Administrador" },
  { id: "plan", label: "Plano" },
  { id: "review", label: "Revisão" },
] as const;
